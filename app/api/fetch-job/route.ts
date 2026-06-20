import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { chatRateLimit } from "@/lib/chat/rateLimit";

// POST /api/fetch-job  { url }  ->  { ok, title, text, url } | { ok:false, error }
//
// Server-side reader for a pasted job-posting URL: fetches the page and returns
// its visible text so the chat agent can tailor against the real posting. This
// is the "paste the link, I'll read it" path. It is best-effort — many big job
// boards (LinkedIn, Indeed, Workday) block bots or render via JS; those fail
// gracefully and the UI then asks the user to paste the description instead.
//
// SECURITY: this is a public endpoint that fetches an arbitrary URL, so it is an
// SSRF vector. Guards: http(s) only; the host must resolve to PUBLIC IPs (DNS
// checked, private/loopback/link-local/metadata ranges blocked); redirects are
// followed manually and each hop is re-validated; response is byte- and
// time-capped. Rate-limited per IP (anon) / per user.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MAX_BYTES = 1_500_000;
const MAX_TEXT_CHARS = 8_000;
const FETCH_TIMEOUT_MS = 9_000;
const MAX_REDIRECTS = 3;

function ipIsPrivate(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
    const [a, b] = p;
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true; // 192.0.0.0/16 (special-use)
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    const mapped = lower.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (mapped) return ipIsPrivate(mapped[1]);
    return false;
  }
  return true; // unknown family → treat as unsafe
}

async function hostIsPublic(hostname: string): Promise<boolean> {
  if (isIP(hostname)) return !ipIsPrivate(hostname);
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) {
    return false;
  }
  try {
    const addrs = await lookup(hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !ipIsPrivate(a.address));
  } catch {
    return false;
  }
}

function parseHttpUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  return u.protocol === "http:" || u.protocol === "https:" ? u : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return " ";
      }
    });
}

function extractText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim() : "";
  const text = decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template|head)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
      .replace(/<br[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title: title.slice(0, 200), text: text.slice(0, MAX_TEXT_CHARS) };
}

async function fetchOnce(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url.toString(), {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HiredCVBot/1.0; +https://hiredcv.app)",
        Accept: "text/html,application/xhtml+xml,text/plain",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  const rl = await chatRateLimit(request, userId, "fetch");
  if (!rl.ok) return NextResponse.json({ ok: false, error: rl.error }, { status: 429 });

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = parseHttpUrl((body.url ?? "").trim());
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "That doesn't look like a valid web link." }, { status: 400 });
  }
  let current: URL = parsed;

  // Follow redirects manually, re-validating each hop (SSRF guard).
  let res: Response;
  for (let redirects = 0; ; redirects++) {
    if (!(await hostIsPublic(current.hostname))) {
      return NextResponse.json({ ok: false, error: "That link can't be fetched." }, { status: 400 });
    }
    try {
      res = await fetchOnce(current);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't reach that link — paste the description instead." },
        { status: 502 }
      );
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      const next = loc ? parseHttpUrl(new URL(loc, current).toString()) : null;
      if (!next || redirects >= MAX_REDIRECTS) {
        return NextResponse.json({ ok: false, error: "That link can't be fetched." }, { status: 502 });
      }
      current = next;
      continue;
    }
    break;
  }

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `That link returned an error (${res.status}). Paste the description instead.` },
      { status: 502 }
    );
  }
  const ctype = res.headers.get("content-type") ?? "";
  if (!/text\/html|application\/xhtml|text\/plain/i.test(ctype)) {
    return NextResponse.json(
      { ok: false, error: "That link isn't a readable web page. Paste the description instead." },
      { status: 415 }
    );
  }

  const reader = res.body?.getReader();
  if (!reader) return NextResponse.json({ ok: false, error: "Empty response." }, { status: 502 });
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.length;
      chunks.push(value);
      if (total > MAX_BYTES) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        break;
      }
    }
  }

  const html = new TextDecoder("utf-8", { fatal: false }).decode(concat(chunks));
  const { title, text } = extractText(html);
  if (text.length < 80) {
    return NextResponse.json(
      {
        ok: false,
        error: "Couldn't read enough from that link — it may need a login or JavaScript. Paste the description instead.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true, title, text, url: current.toString() });
}
