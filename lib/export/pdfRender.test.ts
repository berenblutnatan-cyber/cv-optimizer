import { createServer, type Server } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extractText } from "unpdf";
import { allowedAsset, appOrigins, closeBrowser, MissingAssets, renderPdf } from "./pdfRender";

// Export used to open the browser's print dialog: the user had to pick "Save
// as PDF" and switch off headers. It is now a real file printed on the server
// from HTML the browser sends, so the renderer must stay sealed.

describe("what the PDF page may load", () => {
  const origin = new Set(["https://hiredcv.app"]);
  it.each([
    "https://hiredcv.app/_next/static/css/app.css",
    "https://hiredcv.app/_next/static/media/rubik.woff2",
    "data:image/png;base64,iVBORw0KGgo=",
  ])("allows %s", (u) => expect(allowedAsset(u, origin)).toBe(true));
  it.each([
    "https://evil.example/_next/static/x.css",
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1:5432/",
    "https://hiredcv.app/api/cv",
    "https://hiredcv.app/_next/static/../../api/cv",
    "file:///etc/passwd",
    "not a url",
  ])("refuses %s", (u) => expect(allowedAsset(u, origin)).toBe(false));
});

describe("the app's own addresses", () => {
  // The first server PDF came out in a fallback serif: the page was on
  // 127.0.0.1, the server called itself localhost, and every stylesheet was refused.
  it("treats every loopback name as the dev server", () => {
    const o = appOrigins("http://localhost:3000/api/cv/x/pdf", { NODE_ENV: "development" });
    expect(allowedAsset("http://127.0.0.1:3000/_next/static/chunks/a.css", o)).toBe(true);
    expect(allowedAsset("http://127.0.0.1:5432/_next/static/a.css", o)).toBe(false);
  });

  it("knows the public domain, its www twin and the Vercel URLs", () => {
    const o = appOrigins("https://cv-optimizer-abc.vercel.app/api/cv/x/pdf", {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://hiredcv.app",
      VERCEL_PROJECT_PRODUCTION_URL: "cv-optimizer.vercel.app",
    });
    for (const u of ["https://hiredcv.app", "https://www.hiredcv.app", "https://cv-optimizer.vercel.app", "https://cv-optimizer-abc.vercel.app"]) {
      expect(allowedAsset(`${u}/_next/static/css/a.css`, o)).toBe(true);
    }
  });

  it("does not open loopback in production", () => {
    const o = appOrigins("https://hiredcv.app/api/cv/x/pdf", { NODE_ENV: "production" });
    expect(allowedAsset("http://127.0.0.1:3000/_next/static/a.css", o)).toBe(false);
  });
});

// A real render needs a Chrome: CI's runner has one, a dev Mac has one.
if (process.platform === "linux" && !process.env.CHROME_PATH && existsSync("/usr/bin/google-chrome")) process.env.CHROME_PATH = "/usr/bin/google-chrome";
const chrome = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].some((p) => p && existsSync(p));

describe.skipIf(!chrome)("printing a CV", () => {
  let server: Server;
  let hits: string[] = [];
  let other: string;
  beforeAll(async () => {
    server = createServer((req, res) => {
      hits.push(req.url ?? "");
      // Like the real app: static CSS and fonts, with no CORS headers.
      if (req.url === "/_next/static/app.css") {
        res.setHeader("content-type", "text/css");
        return void res.end(`@font-face{font-family:caveat;src:url("/_next/static/media/caveat.woff2") format("woff2")}.hand{font-family:caveat}`);
      }
      if (req.url === "/_next/static/media/caveat.woff2") {
        res.setHeader("content-type", "font/woff2");
        return void res.end(readFileSync("lib/fonts/caveat-latin-700-normal.woff2"));
      }
      res.end("x");
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    other = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await closeBrowser();
    server.close();
  });

  const page = (body: string) =>
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}body{font-family:sans-serif}</style></head><body>${body}</body></html>`;

  it("makes a PDF with text a screening system can read, Hebrew included", async () => {
    const pdf = await renderPdf(page(`<h1>Dana Levi</h1><p>Grew pipeline 48%</p><p dir="rtl">מנהלת שיווק</p>`), new Set(["https://hiredcv.app"]));
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
    const { text } = await extractText(new Uint8Array(pdf), { mergePages: true });
    expect(text).toContain("Dana Levi");
    expect(text).toContain("Grew pipeline 48%");
    expect(text).toMatch(/[֐-׿]{3,}/);
  }, 60_000);

  it("lays a long CV across several A4 pages", async () => {
    const pdf = await renderPdf(page(Array.from({ length: 160 }, (_, i) => `<p>Line ${i}</p>`).join("")), new Set(["https://hiredcv.app"]));
    const { totalPages } = await extractText(new Uint8Array(pdf));
    expect(totalPages).toBeGreaterThan(1);
  }, 60_000);

  it("never reaches another host, and runs no script", async () => {
    hits = [];
    const html = page(`<img src="${other}/img"><iframe src="${other}/frame"></iframe><script>fetch("${other}/js")</script><p>ok</p>`);
    await renderPdf(html, new Set(["https://hiredcv.app"]));
    expect(hits).toEqual([]);
  }, 60_000);

  it("prints in the app's own fonts, which load only from the app's origin", async () => {
    hits = [];
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${other}/"><link rel="stylesheet" href="${other}/_next/static/app.css"></head><body><p class="hand">Dana Levi</p></body></html>`;
    const pdf = await renderPdf(html, new Set([other]));
    expect(hits).toContain("/_next/static/media/caveat.woff2");
    expect(Buffer.from(pdf).toString("latin1")).toMatch(/\/FontName \/[A-Z]{6}\+Caveat/);
  }, 60_000);

  it("refuses to print when a stylesheet can't load, and never fetches it", async () => {
    hits = [];
    await expect(renderPdf(page(`<link rel="stylesheet" href="${other}/css"><p>ok</p>`), new Set(["https://hiredcv.app"]))).rejects.toBeInstanceOf(MissingAssets);
    expect(hits).toEqual([]);
  }, 60_000);
});
