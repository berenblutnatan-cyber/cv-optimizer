import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import { letterDocument } from "./letter";

describe("letterDocument", () => {
  it("writes every paragraph and keeps the sign-off lines", async () => {
    const body = "Dear Globex team,\n\nCheckout is where Globex wins.\n\nAt Acme I lifted conversion 18%.\n\nBest regards,\nDana Levi";
    const buf = await Packer.toBuffer(letterDocument(body));
    // A real .docx (zip) with the text inside document.xml.
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    const JSZip = (await import("jszip")).default;
    const doc = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    for (const t of ["Dear Globex team,", "Checkout is where Globex wins.", "At Acme I lifted conversion 18%.", "Best regards,", "Dana Levi"]) expect(doc).toContain(t);
    expect((doc.match(/<w:p>|<w:p /g) ?? []).length).toBe(4);
  });
});
