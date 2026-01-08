"use client";

import React from "react";

interface HarvardTemplateProps {
  data: string;
}

// Parse CV text into structured sections
function parseCV(data: string) {
  const lines = data.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return { name: "Your Name", contact: [], sections: [] };

  const name = lines[0] || "Your Name";
  const contactLines: string[] = [];
  const contentLines: string[] = [];

  let pastHeader = false;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!pastHeader && (line.includes("@") || line.match(/^\+?[\d\s\-()]+$/) || line.length < 60)) {
      if (contactLines.length < 4) {
        contactLines.push(line);
      } else {
        pastHeader = true;
        contentLines.push(line);
      }
    } else {
      pastHeader = true;
      contentLines.push(line);
    }
  }

  const sections: { title: string; content: string[] }[] = [];
  let currentSection: { title: string; content: string[] } | null = null;

  const sectionHeaders = [
    "summary", "objective", "profile", "professional summary", "about",
    "experience", "work experience", "employment", "professional experience",
    "education", "academic background",
    "skills", "technical skills", "core competencies", "expertise",
    "certifications", "certificates", "licenses",
    "projects", "key projects",
    "awards", "achievements", "honors",
    "publications", "languages", "interests", "references"
  ];

  for (const line of contentLines) {
    const lowerLine = line.toLowerCase().replace(/[^a-z\s]/g, "").trim();
    const isHeader = sectionHeaders.some((h) => lowerLine === h || lowerLine.startsWith(h + " "));
    const isAllCaps = line === line.toUpperCase() && line.length > 2 && line.length < 50;

    if (isHeader || isAllCaps) {
      if (currentSection && currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { title: line.replace(/[:\-]/g, "").trim(), content: [] };
    } else if (currentSection) {
      currentSection.content.push(line);
    } else {
      currentSection = { title: "Professional Summary", content: [line] };
    }
  }
  if (currentSection && currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  return { name, contact: contactLines, sections };
}

export function HarvardTemplate({ data }: HarvardTemplateProps) {
  const { name, contact, sections } = parseCV(data);
  
  // Calculate content density for dynamic sizing
  const totalLines = sections.reduce((acc, s) => acc + s.content.length + 1, 0);
  const isVeryShort = totalLines < 20;
  const isCompact = totalLines > 40;
  const isVeryCompact = totalLines > 55;

  // Dynamic spacing based on content
  const sectionSpacing = isVeryCompact ? "mb-3" : isCompact ? "mb-4" : isVeryShort ? "mb-8" : "mb-5";
  const lineSpacing = isVeryCompact ? "space-y-0.5" : isCompact ? "space-y-1" : isVeryShort ? "space-y-2" : "space-y-1.5";
  const fontSize = isVeryCompact ? "text-[9px]" : isCompact ? "text-[10px]" : "text-[11px]";
  const headerSize = isVeryCompact ? "text-[10px]" : isCompact ? "text-[11px]" : "text-[12px]";

  return (
    <div
      className="w-[210mm] h-[297mm] bg-white text-black p-[18mm] box-border flex flex-col"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      {/* Header */}
      <header className="text-center border-b-2 border-black pb-3 mb-5 flex-shrink-0">
        <h1 className="text-2xl font-bold uppercase tracking-[0.2em] mb-2">
          {name}
        </h1>
        {contact.length > 0 && (
          <p className={`text-gray-700 ${fontSize}`}>
            {contact.join("  •  ")}
          </p>
        )}
      </header>

      {/* Content Sections - Flex grow to fill page */}
      <div className={`flex-1 flex flex-col ${isVeryShort ? "justify-between" : "justify-start"}`}>
        {sections.map((section, idx) => (
          <section key={idx} className={sectionSpacing}>
            <h2 className={`font-bold uppercase tracking-[0.12em] border-b border-gray-400 pb-1 mb-2 ${headerSize}`}>
              {section.title}
            </h2>
            <div className={lineSpacing}>
              {section.content.map((line, lineIdx) => {
                const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
                const isJobTitle = !isBullet && (
                  line.includes("|") || 
                  line.match(/\d{4}/) || 
                  line.match(/^[A-Z][a-zA-Z\s,]+[A-Z]/) ||
                  lineIdx === 0
                );
                
                if (isBullet) {
                  return (
                    <p key={lineIdx} className={`pl-4 ${fontSize} leading-relaxed text-gray-800`}>
                      {line}
                    </p>
                  );
                }
                
                if (isJobTitle) {
                  return (
                    <p key={lineIdx} className={`${fontSize} font-semibold text-gray-900 ${lineIdx > 0 ? "mt-3" : ""}`}>
                      {line}
                    </p>
                  );
                }
                
                return (
                  <p key={lineIdx} className={`${fontSize} leading-relaxed text-gray-800`}>
                    {line}
                  </p>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
