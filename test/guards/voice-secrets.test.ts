import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// The ElevenLabs key buys minutes: it stays on the server. Only
// lib/voice/elevenlabs.ts (marked server-only) and the setup script read it,
// nothing ever exposes it as NEXT_PUBLIC_, and no client component imports
// the module that holds it. The browser only ever sees single-use tokens.

const ROOTS = ["app", "lib", "components", "hooks", "stores", "scripts"];

function files(dir: string): string[] {
  let out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === "node_modules" || f.startsWith(".")) continue;
    if (statSync(p).isDirectory()) out = out.concat(files(p));
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

const all = ROOTS.flatMap(files).map((p) => ({ p, src: readFileSync(p, "utf8") }));

describe("voice secrets", () => {
  it("only the server module and the setup script read the API key", () => {
    const readers = all.filter((f) => /ELEVENLABS_API_KEY/.test(f.src)).map((f) => f.p).sort();
    expect(readers).toEqual([join("lib", "voice", "elevenlabs.ts"), join("scripts", "voice-agent.ts")].sort());
  });
  it("no ElevenLabs secret is ever public", () => {
    expect(all.filter((f) => /NEXT_PUBLIC_(ELEVEN|EL_)/.test(f.src)).map((f) => f.p)).toEqual([]);
  });
  it("the key-holding module is server-only and no client file imports it", () => {
    expect(readFileSync(join("lib", "voice", "elevenlabs.ts"), "utf8")).toMatch(/^import "server-only";/);
    const clients = all.filter((f) => /^["']use client["']/.test(f.src) && /lib\/voice\/(elevenlabs|sessions|http)/.test(f.src)).map((f) => f.p);
    expect(clients).toEqual([]);
  });
});
