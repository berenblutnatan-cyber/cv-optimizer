// Writes every icon Next serves from app/ out of lib/brand/mark.ts.
import { rmSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { markSvg } from "../lib/brand/mark";

const png = (size: number, rounded = true) => sharp(Buffer.from(markSvg({ rounded, size }))).png().toBuffer();

/** An .ico is a small directory of images, and PNG entries are valid in it. */
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

async function main() {
  writeFileSync("app/icon.svg", markSvg());
  writeFileSync("app/apple-icon.png", await png(180, false));
  const sizes = [16, 32, 48];
  writeFileSync("app/favicon.ico", ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(size) })))));
  // Next ignores an SVG apple-icon, so this file only ever returned a 404.
  rmSync("app/apple-icon.svg", { force: true });
}

main();
