"use client";

import React from "react";
import { useCVDensity, isBulletLine, isJobTitleLine } from "@/hooks/useCVDensity";

interface HarvardTemplateProps {
  data: string;
}

/**
 * Harvard Template
 * Classic professional look with serif font, black & white, horizontal lines
 * Uses density-based styling for consistent layout across all CV lengths
 */
export function HarvardTemplate({ data }: HarvardTemplateProps) {
  const { parsed, density } = useCVDensity(data);
  const { name, contact, sections } = parsed;

  return (
    <div
      className={`w-[210mm] h-[297mm] bg-white text-black ${density.containerPadding} box-border flex flex-col overflow-hidden`}
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      {/* Header */}
      <header className="text-center border-b-2 border-black pb-3 mb-4 flex-shrink-0">
        <h1 className={`${density.nameSize} font-bold uppercase tracking-[0.18em] mb-2`}>
          {name}
        </h1>
        {contact.length > 0 && (
          <p className={`${density.contactSize} text-gray-700 ${density.lineHeight}`}>
            {contact.join("  •  ")}
          </p>
        )}
      </header>

      {/* Content - flex-1 to fill available space, gap for even distribution */}
      <div className={`flex-1 flex flex-col ${density.sectionGap} overflow-hidden`}>
        {sections.map((section, idx) => (
          <section key={idx} className="flex-shrink-0">
            <h2 className={`${density.headerSize} font-bold uppercase tracking-[0.12em] border-b border-gray-400 pb-1 ${density.headerMargin}`}>
              {section.title}
            </h2>
            <div className={`flex flex-col ${density.lineGap}`}>
              {section.content.map((line, lineIdx) => {
                const isBullet = isBulletLine(line);
                const isJobTitle = isJobTitleLine(line, lineIdx);
                
                if (isBullet) {
                  return (
                    <p 
                      key={lineIdx} 
                      className={`${density.bodySize} ${density.lineHeight} text-gray-800 pl-4`}
                    >
                      {line}
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
                    className={`${density.bodySize} ${density.lineHeight} text-gray-800`}
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
