import "server-only";
import { existsSync } from "node:fs";
import type { Browser } from "puppeteer-core";

// Prints the editor's print document (lib/export/printDocument) to a real PDF
// file in headless Chromium: vector text a screening system can read, every
// font the preview used, no print dialog. The HTML comes from the browser, so
// the page is sealed: scripts off, and the only network it may touch is this
// app's own static files (stylesheets and fonts). Anything else (another host,
// an internal address, a non-static path) is refused before it leaves.

export const MAX_PRINT_HTML = 6 * 1024 * 1024;
const RENDER_TIMEOUT_MS = 25_000;

const LOCAL_CHROME = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"];

/**
 * Every address this app is served from. The browser's stylesheet URLs use
 * the address the visitor typed (hiredcv.app, www., a Vercel URL, 127.0.0.1),
 * which need not be the one the server sees for itself.
 */
export function appOrigins(requestUrl: string, env: Record<string, string | undefined> = process.env): Set<string> {
  const out = new Set<string>();
  const add = (u: string | undefined) => {
    if (!u) return;
    try {
      const o = new URL(/^https?:\/\//.test(u) ? u : `https://${u}`);
      out.add(o.origin);
      const alt = o.hostname.startsWith("www.") ? o.hostname.slice(4) : `www.${o.hostname}`;
      if (!LOOPBACK.includes(o.hostname)) out.add(`${o.protocol}//${alt}${o.port ? `:${o.port}` : ""}`);
    } catch {}
  };
  const req = new URL(requestUrl);
  add(req.origin);
  add(env.NEXT_PUBLIC_APP_URL);
  add(env.VERCEL_URL);
  add(env.VERCEL_BRANCH_URL);
  add(env.VERCEL_PROJECT_PRODUCTION_URL);
  // A dev server answers on every loopback name.
  if (env.NODE_ENV !== "production" && LOOPBACK.includes(req.hostname)) for (const h of LOOPBACK) out.add(`${req.protocol}//${h}${req.port ? `:${req.port}` : ""}`);
  return out;
}

/** Whether a page request may load: inline data, or this app's own static files. */
export function allowedAsset(url: string, origins: Set<string>): boolean {
  if (url.startsWith("data:")) return true;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return origins.has(u.origin) && u.pathname.startsWith("/_next/static/") && !u.pathname.includes("..");
}

/** A stylesheet or font that didn't load: the PDF would print in the wrong font. */
export class MissingAssets extends Error {
  constructor(public urls: string[]) {
    super(`Print assets failed to load: ${urls.join(", ")}`);
  }
}

let browser: Promise<Browser> | null = null;

async function launch(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  // Vercel and other Linux hosts run the packaged Chromium; a dev machine uses its own Chrome.
  if (process.platform === "linux" && !process.env.CHROME_PATH) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }
  const executablePath = LOCAL_CHROME.find((p) => p && existsSync(p));
  if (!executablePath) throw new Error("No Chrome found. Set CHROME_PATH.");
  // CI runners restrict the user namespaces Chrome's sandbox needs; the page is sealed anyway.
  const args = ["--no-first-run", "--disable-extensions", ...(process.env.CI ? ["--no-sandbox"] : [])];
  return puppeteer.launch({ executablePath, headless: true, args });
}

/** One browser per warm instance; a crashed one is replaced on the next call. */
function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = launch().then((b) => {
      b.once("disconnected", () => (browser = null));
      return b;
    });
    browser.catch(() => (browser = null));
  }
  return browser;
}

/** Where the print page lives: never fetched, answered from memory. */
const PRINT_PATH = "/__hired_print__";

/**
 * The page must sit on the app's own origin: fonts are fetched with CORS, so
 * from a blank page every font fails and the CV prints in a fallback serif.
 * The origin is the print document's <base>, if it's one of ours.
 */
export function printOrigin(html: string, origins: Set<string>): string {
  const base = /<base href="([^"]+)"/.exec(html)?.[1];
  try {
    const o = base ? new URL(base).origin : "";
    if (origins.has(o)) return o;
  } catch {}
  return [...origins][0];
}

export async function renderPdf(html: string, origins: Set<string>): Promise<Uint8Array> {
  const docUrl = printOrigin(html, origins) + PRINT_PATH;
  const b = await getBrowser();
  const context = await b.createBrowserContext();
  try {
    const page = await context.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    // A blocked or failed stylesheet or font fails the export: better an
    // error with "Print instead" than a CV quietly set in the wrong font.
    const missing: string[] = [];
    const essential = (type: string) => type === "stylesheet" || type === "font";
    page.on("requestfailed", (req) => {
      if (essential(req.resourceType())) missing.push(req.url());
    });
    page.on("response", (res) => {
      if (essential(res.request().resourceType()) && !res.ok()) missing.push(res.url());
    });
    page.on("request", (req) => {
      if (req.url() === docUrl && req.isNavigationRequest()) return void req.respond({ status: 200, contentType: "text/html; charset=utf-8", body: html });
      if (!allowedAsset(req.url(), origins)) return void req.abort("blockedbyclient");
      // Preview deployments sit behind Vercel's login: let our own CSS through it.
      if (bypass && !req.url().startsWith("data:")) return void req.continue({ headers: { ...req.headers(), "x-vercel-protection-bypass": bypass } });
      return void req.continue();
    });
    await page.emulateMediaType("print");
    await page.goto(docUrl, { waitUntil: "load", timeout: RENDER_TIMEOUT_MS });
    // Fonts are fetched once layout asks for them, which can be after "load".
    await page.waitForNetworkIdle({ idleTime: 250, timeout: RENDER_TIMEOUT_MS });
    if (missing.length) throw new MissingAssets(missing);
    return await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, timeout: RENDER_TIMEOUT_MS });
  } finally {
    await context.close().catch(() => {});
  }
}

/** Tests and shutdown: close the shared browser. */
export async function closeBrowser() {
  const b = browser;
  browser = null;
  await (await b?.catch(() => null))?.close().catch(() => {});
}
