"use client";

import React from "react";
import { useCVDensity, isBulletLine, isJobTitleLine, splitSections } from "@/hooks/useCVDensity";

interface CreativeTemplateProps {
  data: string;
}

/**
 * Creative Template
 * Two-column layout with dark sidebar for skills/contact
 * Uses density-based styling for consistent layout across all CV lengths
 */
export function CreativeTemplate({ data }: CreativeTemplateProps) {
  const { parsed, density } = useCVDensity(data);
  const { name, contact, sections } = parsed;
  const { sidebar: sidebarSections, main: mainSections } = splitSections(sections);

  return (
    <div
      className="w-[210mm] h-[297mm] bg-white text-gray-800 flex overflow-hidden"
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Left Sidebar */}
      <aside className="w-[68mm] bg-slate-900 text-white p-5 flex flex-col overflow-hidden">
        {/* Name & Avatar */}
        <div className="mb-5 flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-3 shadow-lg">
            <span className="text-xl font-bold">
              {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <h1 className="text-lg font-bold tracking-tight leading-tight">
            {name}
          </h1>
        </div>

        {/* Contact */}
        <section className="mb-5 flex-shrink-0">
          <h2 className={`${density.sidebarHeaderSize} font-bold uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-1.5`}>
            <span className="w-1 h-3 bg-purple-500 rounded-full" />
            Contact
          </h2>
          <div className={`flex flex-col ${density.lineGap}`}>
            {contact.map((c, idx) => (
              <p 
                key={idx} 
                className={`${density.sidebarBodySize} ${density.lineHeight} text-slate-300 break-words`}
              >
                {c}
              </p>
            ))}
          </div>
        </section>

        {/* Sidebar Sections (Skills, Languages, etc.) */}
        <div className={`flex-1 flex flex-col ${density.sectionGap} overflow-hidden`}>
          {sidebarSections.map((section, idx) => (
            <section key={idx} className="flex-shrink-0">
              <h2 className={`${density.sidebarHeaderSize} font-bold uppercase tracking-widest text-purple-400 ${density.headerMargin} flex items-center gap-1.5`}>
                <span className="w-1 h-3 bg-purple-500 rounded-full" />
                {section.title}
              </h2>
              <div className={`flex flex-col ${density.lineGap}`}>
                {section.content.map((line, lineIdx) => (
                  <p 
                    key={lineIdx} 
                    className={`${density.sidebarBodySize} ${density.lineHeight} text-slate-300`}
                  >
                    {line.replace(/^[•\-*]\s*/, "• ")}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col overflow-hidden">
        <div className={`flex-1 flex flex-col ${density.sectionGap} overflow-hidden`}>
          {mainSections.map((section, idx) => (
            <section key={idx} className="flex-shrink-0">
              <h2 className={`${density.headerSize} font-bold text-slate-900 uppercase tracking-wider ${density.headerMargin} flex items-center gap-2`}>
                <span className="w-4 h-0.5 bg-purple-500" />
                {section.title}
              </h2>
              <div className={`flex flex-col ${density.lineGap} border-l-2 border-purple-100 pl-3`}>
                {section.content.map((line, lineIdx) => {
                  const isBullet = isBulletLine(line);
                  const isJobTitle = isJobTitleLine(line, lineIdx);
                  
                  if (isBullet) {
                    return (
                      <p 
                        key={lineIdx} 
                        className={`${density.bodySize} ${density.lineHeight} text-gray-600 flex items-start gap-1.5`}
                      >
                        <span className="text-purple-500 mt-1 text-[6px]">▸</span>
                        <span>{line.replace(/^[•\-*]\s*/, "")}</span>
                      </p>
                    );
                  }
                  
                  if (isJobTitle) {
                    return (
                      <p 
                        key={lineIdx} 
                        className={`${density.bodySize} ${density.lineHeight} font-semibold text-gray-900 ${lineIdx > 0 ? "mt-2" : ""}`}
                      >
                        {line}
                      </p>
                    );
                  }
                  
                  return (
                    <p 
                      key={lineIdx} 
                      className={`${density.bodySize} ${density.lineHeight} text-gray-700`}
                    >
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
