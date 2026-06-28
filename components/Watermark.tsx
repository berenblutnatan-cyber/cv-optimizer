"use client";

import React from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

interface WatermarkProps {
  className?: string;
}

export function Watermark({ className = "" }: WatermarkProps) {
  const { t } = useT();
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-50 ${className}`}
      style={{
        background: "repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(0,0,0,0.03) 100px, rgba(0,0,0,0.03) 200px)",
      }}
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          transform: "translate(-50%, -50%) rotate(-45deg)",
          fontSize: "48px",
          fontWeight: "bold",
          color: "rgba(0, 0, 0, 0.08)",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        Hired - {t("Preview")}
      </div>
    </div>
  );
}
