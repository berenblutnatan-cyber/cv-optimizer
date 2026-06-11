import Anthropic from "@anthropic-ai/sdk";
import { lookup } from "dns/promises";
import { isIP } from "net";

export type JobFetchResult =
  | { ok: true; description: string; source: "json-ld" | "llm" }
  | { ok: false; error: string; hint?: string; status: number };

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_TEXT_FOR_LLM = 15000;
const MIN_TEXT_FOR_LLM = 500;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function fetchJobDescription(
  rawUrl: string,
  anthropic: Anthropic
): Promise<JobFetchResult> {
  const urlCheck = validateUrl(rawUrl);
  if (!urlCheck.ok) return urlCheck;

  if (isLinkedIn(urlCheck.url)) {
    return {
      ok: false,
      status: 400,
      error:
        "LinkedIn blocks automated access. Please copy the job description from the LinkedIn page and paste it in the 'Paste Description' tab instead.",
      hint: "Open the job on LinkedIn → Select all the job description text → Copy → Paste here",
    };
  }

  const safe = await assertPublicHost(urlCheck.url);
  if (!safe.ok) return safe;

  let html: string;
  try {
    const response = await fetch(urlCheck.url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return {
        ok: false,
        status: 400,
        error: `Failed to fetch job description from URL (HTTP ${response.status}). Please paste the job description manually.`,
      };
    }
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength && contentLength > MAX_HTML_BYTES) {
      return {
        ok: false,
        status: 400,
        error: "Job posting page is too large to process. Please paste the description manually.",
      };
    }
    html = await response.text();
    if (html.length > MAX_HTML_BYTES) {
      return {
        ok: false,
        status: 400,
        error: "Job posting page is too large to process. Please paste the description manually.",
      };
    }
  } catch (err) {
    return {
      ok: false,
      status: 400,
      error: "Failed to fetch job description from URL. Please paste the job description manually.",
    };
  }

  const fromJsonLd = extractJsonLdJobPosting(html);
  if (fromJsonLd && fromJsonLd.length >= MIN_TEXT_FOR_LLM / 2) {
    return { ok: true, description: fromJsonLd, source: "json-ld" };
  }

  const textContent = stripHtml(html).slice(0, MAX_TEXT_FOR_LLM);
  if (textContent.length < MIN_TEXT_FOR_LLM) {
    return {
      ok: false,
      status: 400,
      error: "Could not find job description on that page. Please paste it manually.",
    };
  }

  const extracted = await extractWithLlm(textContent, anthropic);
  if (!extracted) {
    return {
      ok: false,
      status: 400,
      error: "Could not find job description on that page. Please paste it manually.",
    };
  }
  return { ok: true, description: extracted, source: "llm" };
}

function validateUrl(
  raw: string
): { ok: true; url: URL } | { ok: false; status: number; error: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, status: 400, error: "Invalid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, status: 400, error: "Only http(s) URLs are supported." };
  }
  return { ok: true, url };
}

function isLinkedIn(url: URL): boolean {
  return /(^|\.)linkedin\.com$/i.test(url.hostname);
}

async function assertPublicHost(
  url: URL
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const host = url.hostname;
  const addresses: string[] = [];
  if (isIP(host)) {
    addresses.push(host);
  } else {
    try {
      const resolved = await lookup(host, { all: true });
      for (const a of resolved) addresses.push(a.address);
    } catch {
      return { ok: false, status: 400, error: "Could not resolve host." };
    }
  }
  for (const ip of addresses) {
    if (isPrivateIp(ip)) {
      return { ok: false, status: 400, error: "URL is not allowed." };
    }
  }
  return { ok: true };
}

function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + AWS/GCE metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7));
    return false;
  }
  return true;
}

function extractJsonLdJobPosting(html: string): string | null {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of blocks) {
    const raw = match[1].trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const posting = findJobPosting(parsed);
    if (posting?.description) {
      return decodeEntities(stripHtml(String(posting.description))).trim();
    }
  }
  return null;
}

function findJobPosting(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) {
    return obj;
  }
  const graph = obj["@graph"];
  if (graph) return findJobPosting(graph);
  return null;
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

async function extractWithLlm(
  textContent: string,
  anthropic: Anthropic
): Promise<string | null> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Extract the job description from this webpage content. Include job title, company, requirements, qualifications, and responsibilities. If this appears to be a login page or doesn't contain a job description, respond with exactly "NO_JOB_FOUND". Return only the extracted job description, no other commentary.\n\nWebpage content:\n${textContent}`,
      },
    ],
  });
  const block = response.content[0];
  const text = block.type === "text" ? block.text : "";
  if (text === "NO_JOB_FOUND" || text.length < 100) return null;
  return text;
}
