"use client";

import React from "react";

interface CreativeTemplateProps {
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
      if (contactLines.length < 5) {
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

export function CreativeTemplate({ data }: CreativeTemplateProps) {
  const { name, contact, sections } = parseCV(data);

  // Split sections: sidebar (skills, languages, certs) vs main (experience, education, etc.)
  const sidebarKeywords = ["skill", "language", "certification", "certificate", "interest", "expertise", "competenc"];
  const sidebarSections = sections.filter((s) =>
    sidebarKeywords.some((k) => s.title.toLowerCase().includes(k))
  );
  const mainSections = sections.filter((s) =>
    !sidebarKeywords.some((k) => s.title.toLowerCase().includes(k))
  );

  // Calculate content density for dynamic sizing
  const totalLines = sections.reduce((acc, s) => acc + s.content.length + 1, 0);
  const isVeryShort = totalLines < 20;
  const isCompact = totalLines > 40;
  const isVeryCompact = totalLines > 55;

  // Dynamic spacing based on content
  const sectionSpacing = isVeryCompact ? "mb-3" : isCompact ? "mb-4" : isVeryShort ? "mb-6" : "mb-5";
  const lineSpacing = isVeryCompact ? "space-y-0.5" : isCompact ? "space-y-1" : isVeryShort ? "space-y-2" : "space-y-1.5";
  const fontSize = isVeryCompact ? "text-[8px]" : isCompact ? "text-[9px]" : "text-[10px]";
  const headerSize = isVeryCompact ? "text-[9px]" : isCompact ? "text-[10px]" : "text-[11px]";
  const sidebarFontSize = isVeryCompact ? "text-[7px]" : isCompact ? "text-[8px]" : "text-[9px]";

  return (
    <div
      className="w-[210mm] h-[297mm] bg-white text-gray-800 flex box-border"
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Left Sidebar - Dark */}
      <aside className="w-[65mm] bg-slate-900 text-white p-5 flex flex-col h-full">
        {/* Name & Initials */}
        <div className="text-center mb-4 flex-shrink-0">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-3 shadow-lg">
            <span className="text-xl font-bold">
              {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <h1 className={`font-bold tracking-tight leading-tight ${isCompact ? "text-sm" : "text-base"}`}>
            {name}
          </h1>
        </div>

        {/* Contact Info */}
        <section className="mb-4 flex-shrink-0">
          <h2 className={`font-bold uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-1.5 ${sidebarFontSize}`}>
            <span className="w-0.5 h-2.5 bg-purple-500 rounded-full" />
            Contact
          </h2>
          <div className={`text-slate-300 ${isVeryShort ? "space-y-2" : "space-y-1"} ${sidebarFontSize}`}>
            {contact.map((c, idx) => (
              <p key={idx} className="break-words leading-relaxed">{c}</p>
            ))}
          </div>
        </section>

        {/* Sidebar Sections (Skills, Languages, Certs) - Flex grow to fill */}
        <div className={`flex-1 flex flex-col ${isVeryShort ? "justify-between" : "justify-start"}`}>
          {sidebarSections.map((section, idx) => (
            <section key={idx} className={sectionSpacing}>
              <h2 className={`font-bold uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-1.5 ${sidebarFontSize}`}>
                <span className="w-0.5 h-2.5 bg-purple-500 rounded-full" />
                {section.title}
              </h2>
              <div className={`text-slate-300 ${lineSpacing} ${sidebarFontSize}`}>
                {section.content.map((line, lineIdx) => (
                  <p key={lineIdx} className="leading-relaxed">
                    {line.replace(/^[•\-*]\s*/, "• ")}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 h-full flex flex-col">
        <div className={`flex-1 flex flex-col ${isVeryShort ? "justify-between" : "justify-start"}`}>
          {mainSections.map((section, idx) => (
            <section key={idx} className={sectionSpacing}>
              <h2 className={`font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 ${headerSize}`}>
                <span className="w-4 h-0.5 bg-purple-500" />
                {section.title}
              </h2>
              <div className={`border-l-2 border-purple-100 pl-3 ${lineSpacing}`}>
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
                      <p key={lineIdx} className={`flex items-start gap-1.5 ${fontSize} text-gray-600 leading-relaxed`}>
                        <span className="text-purple-500 mt-0.5 text-[6px]">▸</span>
                        <span>{line.replace(/^[•\-*]\s*/, "")}</span>
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
                    <p key={lineIdx} className={`${fontSize} text-gray-700 leading-relaxed`}>
                      {line}
                    </p>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
