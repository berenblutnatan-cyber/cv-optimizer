import { describe, expect, it } from "vitest";
import { readSse } from "./readSse";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      chunks.forEach((x) => c.enqueue(enc.encode(x)));
      c.close();
    },
  });
}

describe("readSse", () => {
  it("joins frames split across chunks, skips junk, and keeps a final frame without a trailing blank line", async () => {
    const got: unknown[] = [];
    await readSse(streamOf(['data: {"a":', '1}\n\ndata: not json\n\n: comment\n\ndata: {"b":"é', '"}\n\ndata: {"c":3}']), (e) => got.push(e));
    expect(got).toEqual([{ a: 1 }, { b: "é" }, { c: 3 }]);
  });
});
