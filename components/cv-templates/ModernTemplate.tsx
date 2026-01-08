"use client";

import React from "react";
import { useCVDensity, isBulletLine, isJobTitleLine } from "@/hooks/useCVDensity";

interface ModernTemplateProps {
  data: string;
}

/**
 * Modern Template
 * Clean tech look with sans-serif font, purple accents
 * Uses density-based styling for consistent layout across all CV lengths
 */
export function ModernTemplate({ data }: ModernTemplateProps) {
  const { parsed, density } = useCVDensity(data);
  const { name, contact, sections } = parsed;

  return (
    <div
      className={`w-[210mm] h-[297mm] bg-white text-gray-800 ${density.containerPadding} box-border flex flex-col overflow-hidden`}
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* Header with purple accent */}
      <header className="border-l-4 border-purple-600 pl-4 mb-5 flex-shrink-0">
        <h1 className={`${density.nameSize} font-bold text-gray-900 tracking-tight mb-2`}>
          {name}
        </h1>
        {contact.length > 0 && (
          <div className={`${density.contactSize} flex flex-wrap gap-3 text-gray-600`}>
            {contact.map((c, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                {c}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Content - flex-1 to fill available space */}
      <div className={`flex-1 flex flex-col ${density.sectionGap} overflow-hidden`}>
        {sections.map((section, idx) => (
          <section key={idx} className="flex-shrink-0">
            <h2 className={`${density.headerSize} font-bold text-purple-600 uppercase tracking-wider ${density.headerMargin} flex items-center gap-2`}>
              <span className="w-5 h-0.5 bg-purple-600" />
              {section.title}
            </h2>
            <div className={`flex flex-col ${density.lineGap} pl-2`}>
              {section.content.map((line, lineIdx) => {
                const isBullet = isBulletLine(line);
                const isJobTitle = isJobTitleLine(line, lineIdx);
                
                if (isBullet) {
                  return (
                    <p 
                      key={lineIdx} 
                      className={`${density.bodySize} ${density.lineHeight} text-gray-700 flex items-start gap-2`}
                    >
                      <span className="text-purple-500 mt-1 text-[8px]">▸</span>
                      <span>{line.replace(/^[•\-*]\s*/, "")}</span>
                    </p>
                  );
                }
                
                if (isJobTitle) {
                  return (
                    <p 
                      key={lineIdx} 
                      className={`${density.bodySize} ${density.lineHeight} font-semibold text-gray-900 ${lineIdx > 0 ? "mt-3" : ""}`}
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
    </div>
  );
}
