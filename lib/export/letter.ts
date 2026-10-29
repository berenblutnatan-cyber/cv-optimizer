import { Document, Packer, Paragraph, TextRun } from "docx";

// A cover letter as a Word file: one paragraph per blank-line block, line
// breaks kept (the sign-off and name). Plain, so it pastes into any portal.

export function letterDocument(body: string): Document {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        children: blocks.map(
          (block) =>
            new Paragraph({
              spacing: { after: 200, line: 300 },
              children: block.split("\n").map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : 0 })),
            }),
        ),
      },
    ],
  });
}

export function letterBlob(body: string): Promise<Blob> {
  return Packer.toBlob(letterDocument(body));
}
