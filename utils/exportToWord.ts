import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import { ResumePreviewData } from "@/components/builder/ResumePreview";

/**
 * Export resume data to a Word (.docx) document
 */
export async function exportToWord(data: ResumePreviewData, fileName: string = "Resume") {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 22, // 11pt
          },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 48, // 24pt
            bold: true,
            color: "1e293b",
          },
          paragraph: {
            spacing: { after: 120 },
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 26, // 13pt
            bold: true,
            color: "4f46e5", // Indigo
            allCaps: true,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
            border: {
              bottom: {
                color: "e2e8f0",
                space: 4,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          },
        },
        {
          id: "JobTitle",
          name: "Job Title",
          basedOn: "Normal",
          run: {
            size: 24, // 12pt
            bold: true,
            color: "1e293b",
          },
        },
        {
          id: "Subtitle",
          name: "Subtitle",
          basedOn: "Normal",
          run: {
            size: 24, // 12pt
            italics: true,
            color: "475569",
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
            },
          },
        },
        children: [
          // Header - Name
          new Paragraph({
            text: data.name || "Your Name",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),

          // Title (if exists)
          ...(data.title
            ? [
                new Paragraph({
                  text: data.title,
                  style: "Subtitle",
                }),
              ]
            : []),

          // Contact Info - Single line centered
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              ...(data.contact.email
                ? [
                    new TextRun({ text: data.contact.email, size: 20 }),
                    new TextRun({ text: "  |  ", size: 20, color: "94a3b8" }),
                  ]
                : []),
              ...(data.contact.phone
                ? [
                    new TextRun({ text: data.contact.phone, size: 20 }),
                    new TextRun({ text: "  |  ", size: 20, color: "94a3b8" }),
                  ]
                : []),
              ...(data.contact.location
                ? [new TextRun({ text: data.contact.location, size: 20 })]
                : []),
              ...(data.contact.linkedin
                ? [
                    new TextRun({ text: "  |  ", size: 20, color: "94a3b8" }),
                    new TextRun({ text: data.contact.linkedin, size: 20, color: "4f46e5" }),
                  ]
                : []),
            ],
          }),

          // Summary Section
          ...(data.summary
            ? [
                new Paragraph({
                  text: "PROFESSIONAL SUMMARY",
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                  text: data.summary,
                  spacing: { after: 200 },
                }),
              ]
            : []),

          // Experience Section
          ...generateSectionContent(data.sections, "Experience", "experience"),

          // Education Section
          ...generateSectionContent(data.sections, "Education", "education"),

          // Skills Section
          ...(data.skills && data.skills.length > 0
            ? [
                new Paragraph({
                  text: "SKILLS",
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                  text: data.skills.join("  •  "),
                  spacing: { after: 200 },
                }),
              ]
            : []),

          // Languages Section
          ...(data.languages && data.languages.length > 0
            ? [
                new Paragraph({
                  text: "LANGUAGES",
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                  text: data.languages.join("  •  "),
                  spacing: { after: 200 },
                }),
              ]
            : []),

          // Other Sections (Projects, Certifications, Custom)
          ...generateOtherSections(data.sections),
        ],
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
}

/**
 * Generate content for a specific section type
 */
function generateSectionContent(
  sections: ResumePreviewData["sections"],
  title: string,
  type: string
): Paragraph[] {
  const section = sections.find((s) => s.type === type || s.title.toLowerCase() === type.toLowerCase());
  if (!section || section.items.length === 0) return [];

  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: title.toUpperCase(),
      heading: HeadingLevel.HEADING_2,
    }),
  ];

  section.items.forEach((item) => {
    // Job/Degree Title with Date
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: item.title || "",
            bold: true,
            size: 24,
          }),
          ...(item.date
            ? [
                new TextRun({
                  text: `\t${item.date}`,
                  size: 22,
                  color: "64748b",
                }),
              ]
            : []),
        ],
        tabStops: [
          {
            type: "right" as const,
            position: convertInchesToTwip(6.5),
          },
        ],
      })
    );

    // Company/Institution
    if (item.subtitle) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item.subtitle,
              italics: true,
              size: 22,
              color: "475569",
            }),
            ...(item.location
              ? [
                  new TextRun({
                    text: `  |  ${item.location}`,
                    size: 20,
                    color: "94a3b8",
                  }),
                ]
              : []),
          ],
        })
      );
    }

    // Description
    if (item.description) {
      paragraphs.push(
        new Paragraph({
          text: item.description,
          spacing: { before: 60 },
        })
      );
    }

    // Bullets
    if (item.bullets && item.bullets.length > 0) {
      item.bullets.forEach((bullet) => {
        if (bullet.trim()) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "• ",
                  color: "4f46e5",
                }),
                new TextRun({
                  text: bullet,
                }),
              ],
              indent: { left: convertInchesToTwip(0.25) },
              spacing: { before: 40, after: 40 },
            })
          );
        }
      });
    }

    // Add spacing after each item
    paragraphs.push(new Paragraph({ spacing: { after: 120 } }));
  });

  return paragraphs;
}

/**
 * Generate other sections (Projects, Certifications, Custom)
 */
function generateOtherSections(sections: ResumePreviewData["sections"]): Paragraph[] {
  const excludedTypes = ["experience", "education"];
  const otherSections = sections.filter(
    (s) => !excludedTypes.includes(s.type || "") && !excludedTypes.includes(s.title.toLowerCase())
  );

  const paragraphs: Paragraph[] = [];

  otherSections.forEach((section) => {
    if (section.items.length === 0) return;

    paragraphs.push(
      new Paragraph({
        text: section.title.toUpperCase(),
        heading: HeadingLevel.HEADING_2,
      })
    );

    section.items.forEach((item) => {
      if (item.title) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.title,
                bold: true,
                size: 24,
              }),
              ...(item.date
                ? [
                    new TextRun({
                      text: `\t${item.date}`,
                      size: 22,
                      color: "64748b",
                    }),
                  ]
                : []),
            ],
            tabStops: [
              {
                type: "right" as const,
                position: convertInchesToTwip(6.5),
              },
            ],
          })
        );
      }

      if (item.subtitle) {
        paragraphs.push(
          new Paragraph({
            text: item.subtitle,
            run: { italics: true, color: "475569" },
          })
        );
      }

      if (item.description) {
        paragraphs.push(
          new Paragraph({
            text: item.description,
            spacing: { before: 60 },
          })
        );
      }

      if (item.bullets && item.bullets.length > 0) {
        item.bullets.forEach((bullet) => {
          if (bullet.trim()) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({ text: "• ", color: "4f46e5" }),
                  new TextRun({ text: bullet }),
                ],
                indent: { left: convertInchesToTwip(0.25) },
                spacing: { before: 40, after: 40 },
              })
            );
          }
        });
      }

      paragraphs.push(new Paragraph({ spacing: { after: 120 } }));
    });
  });

  return paragraphs;
}

export default exportToWord;
