"use client";

import React from "react";

/**
 * A4PageWrapper - The Core Foundation
 * 
 * This component acts as the digital paper for all CV templates.
 * It enforces strict A4 dimensions and handles both screen preview
 * and print output with pixel-perfect accuracy.
 * 
 * SPECIFICATIONS:
 * - A4 Standard: 210mm × 297mm (8.27" × 11.69")
 * - At 96 DPI: 794px × 1123px
 * - Screen View: Centered, shadowed, white background
 * - Print View: Clean output with no margins, shadows, or artifacts
 * - Overflow: STRICTLY HIDDEN to enforce A4 page limits
 * 
 * USAGE:
 * ```tsx
 * <A4PageWrapper>
 *   <YourTemplateContent />
 * </A4PageWrapper>
 * ```
 */

// A4 dimensions in pixels at 96 DPI
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

interface A4PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Optional ID for targeting specific pages in multi-page documents */
  pageId?: string;
  /** Enable debug outline to visualize margins (development only) */
  debug?: boolean;
  /** Show overflow indicator when content exceeds page */
  showOverflowIndicator?: boolean;
}

export function A4PageWrapper({ 
  children, 
  className = "", 
  pageId,
  debug = false,
  showOverflowIndicator = false,
}: A4PageWrapperProps) {
  return (
    <div
      id={pageId}
      className={`a4-wrapper ${className}`}
      style={{
        // ==========================================
        // STRICT A4 DIMENSIONS (ENFORCED)
        // ==========================================
        width: `${A4_WIDTH_MM}mm`,
        height: `${A4_HEIGHT_MM}mm`,
        minHeight: `${A4_HEIGHT_MM}mm`,
        maxHeight: `${A4_HEIGHT_MM}mm`,
        
        // ==========================================
        // SCREEN PRESENTATION
        // ==========================================
        backgroundColor: "#ffffff",
        margin: "0 auto 2rem auto",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        
        // ==========================================
        // STRICT OVERFLOW CONTROL
        // Forces content to be clipped at A4 boundary
        // ==========================================
        overflow: "hidden",
        position: "relative",
        boxSizing: "border-box",
        
        // ==========================================
        // DEBUG MODE (development only)
        // ==========================================
        ...(debug && {
          outline: "2px dashed rgba(239, 68, 68, 0.5)",
          outlineOffset: "-2px",
        }),
      }}
    >
      {children}
      
      {/* Overflow indicator - shows a red line at the bottom if content might overflow */}
      {showOverflowIndicator && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-red-500/50 to-transparent pointer-events-none print:hidden"
          title="Content may overflow A4 page boundary"
        />
      )}
    </div>
  );
}

/**
 * A4SafeArea - Inner content container with safe margins
 * 
 * Use this inside A4PageWrapper to ensure content stays within
 * printable boundaries (accounting for printer margins).
 * 
 * Standard safe margins: 15-20mm on all sides
 */
interface A4SafeAreaProps {
  children: React.ReactNode;
  className?: string;
  /** Padding in millimeters (default: 16mm) */
  padding?: number;
}

export function A4SafeArea({ 
  children, 
  className = "",
  padding = 16 
}: A4SafeAreaProps) {
  return (
    <div
      className={`a4-safe-area ${className}`}
      style={{
        padding: `${padding}mm`,
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

/**
 * A4Grid - CSS Grid layout helper for templates
 * 
 * Provides a stable grid-based layout that works reliably
 * in both screen and print contexts.
 */
interface A4GridProps {
  children: React.ReactNode;
  /** Grid template columns (CSS value) */
  columns?: string;
  /** Grid template rows (CSS value) */
  rows?: string;
  /** Gap between grid items */
  gap?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function A4Grid({ 
  children, 
  columns = "1fr", 
  rows = "auto",
  gap = "0",
  className = "",
  style = {}
}: A4GridProps) {
  return (
    <div
      className={`a4-grid ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        gridTemplateRows: rows,
        gap,
        height: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default A4PageWrapper;
