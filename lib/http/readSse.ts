// Read a `data: {json}\n\n` event stream. One parser for every v2 SSE route.

export async function readSse<E>(body: ReadableStream<Uint8Array>, onEvent: (e: E) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const emit = (frame: string) => {
    const line = frame.trim();
    if (!line.startsWith("data: ")) return;
    try {
      onEvent(JSON.parse(line.slice(6)) as E);
    } catch {
      // skip a malformed frame
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    frames.forEach(emit);
  }
  buf += decoder.decode();
  if (buf.trim()) emit(buf);
}
