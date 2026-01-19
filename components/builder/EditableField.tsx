"use client";

import React, { 
  useRef, 
  useEffect, 
  useCallback, 
  useState,
  KeyboardEvent,
  FocusEvent,
  ChangeEvent,
} from "react";
import { useBuilder } from "@/context/BuilderContext";

/**
 * EditableField Component
 * 
 * A generic inline-editable field that looks like plain text when not focused,
 * but becomes editable when clicked. Designed for WYSIWYG resume editing.
 * 
 * FEATURES:
 * - Seamless inline editing (looks like text, acts like input)
 * - Auto-resize for textareas
 * - Focus state with subtle ring indicator
 * - Reports position to BuilderContext for AI assistant positioning
 * - Keyboard navigation (Enter to blur for single-line)
 */

// ==========================================
// TYPES
// ==========================================

export interface EditableFieldProps {
  /** Unique identifier for this field */
  id: string;
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Field type - single line or multiline */
  type?: "text" | "textarea";
  /** Placeholder when empty */
  placeholder?: string;
  /** Additional CSS classes (applied to both display and input) */
  className?: string;
  /** Whether this field can be multiline (alias for type="textarea") */
  multiline?: boolean;
  /** Minimum height for textarea (in px) */
  minHeight?: number;
  /** Maximum length */
  maxLength?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Custom focus ring color class */
  focusRingClass?: string;
  /** Called when field is focused */
  onFocus?: () => void;
  /** Called when field is blurred */
  onBlur?: () => void;
  /** HTML tag to render in view mode */
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div";
  /** Inline styles for the input */
  style?: React.CSSProperties;
}

// ==========================================
// COMPONENT
// ==========================================

export function EditableField({
  id,
  value,
  onChange,
  type = "text",
  placeholder = "Click to edit...",
  className = "",
  multiline = false,
  minHeight = 24,
  maxLength,
  disabled = false,
  focusRingClass = "ring-2 ring-indigo-500/50",
  onFocus,
  onBlur,
  as = "span",
  style,
}: EditableFieldProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const { setFocusedField, clearFocus, isEditMode } = useBuilder();
  
  // Determine if we should use textarea
  const isTextarea = type === "textarea" || multiline;

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (inputRef.current && isTextarea) {
      const textarea = inputRef.current as HTMLTextAreaElement;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
    }
  }, [isTextarea, minHeight]);

  // Adjust height on value change
  useEffect(() => {
    if (isFocused) {
      adjustTextareaHeight();
    }
  }, [value, isFocused, adjustTextareaHeight]);

  // Report position to context
  const reportPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setFocusedField(id, rect, value);
    }
  }, [id, value, setFocusedField]);

  // Handle focus
  const handleFocus = useCallback((e: FocusEvent) => {
    if (disabled || !isEditMode) return;
    
    setIsFocused(true);
    reportPosition();
    onFocus?.();
    
    // Select all text on focus for better UX
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, [disabled, isEditMode, reportPosition, onFocus]);

  // Handle blur
  const handleBlur = useCallback((e: FocusEvent) => {
    setIsFocused(false);
    clearFocus();
    onBlur?.();
  }, [clearFocus, onBlur]);

  // Handle change
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    // Enforce max length
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength);
    }
    
    onChange(newValue);
    
    // Update position after content change (might have resized)
    requestAnimationFrame(reportPosition);
  }, [onChange, maxLength, reportPosition]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Enter blurs single-line inputs
    if (e.key === "Enter" && !isTextarea && !e.shiftKey) {
      e.preventDefault();
      inputRef.current?.blur();
    }
    
    // Escape blurs any input
    if (e.key === "Escape") {
      e.preventDefault();
      inputRef.current?.blur();
    }
  }, [isTextarea]);

  // Click on container focuses the input
  const handleContainerClick = useCallback(() => {
    if (!disabled && isEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled, isEditMode]);

  // Base styles for the input (transparent, inherits font)
  const inputBaseStyles = `
    w-full
    min-w-0
    bg-transparent
    border-none
    outline-none
    resize-none
    overflow-visible
    ${className}
    transition-shadow duration-200
    ${isFocused ? `${focusRingClass} rounded-sm` : ""}
  `.trim().replace(/\s+/g, " ");

  // Render the appropriate input element
  const renderInput = () => {
    const commonProps = {
      ref: inputRef as any,
      value,
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      // Don't use native placeholder - we use our own overlay for better styling
      disabled: disabled || !isEditMode,
      maxLength,
      className: inputBaseStyles,
      style: {
        minHeight: isTextarea ? `${minHeight}px` : undefined,
        caretColor: "currentColor",
        ...style,
      },
      "aria-label": placeholder,
      spellCheck: true,
    };

    if (isTextarea) {
      return (
        <textarea
          {...commonProps}
          rows={1}
        />
      );
    }

    return (
      <input
        {...commonProps}
        type="text"
      />
    );
  };

  // If not in edit mode, render as static element
  if (!isEditMode) {
    const Tag = as;
    return (
      <Tag className={className}>
        {value || <span className="text-slate-400 italic">{placeholder}</span>}
      </Tag>
    );
  }

  // Extract flex-related classes to apply to container
  const hasFlexClass = className.includes("flex-1") || className.includes("flex-grow");
  const containerClasses = hasFlexClass ? "flex-1 min-w-0" : "w-full min-w-0";

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`
        relative
        ${containerClasses}
        cursor-text
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      style={{ display: "block" }}
    >
      {renderInput()}
      
      {/* Empty state indicator */}
      {!value && !isFocused && (
        <div 
          className="absolute inset-0 pointer-events-none flex items-center overflow-hidden"
          aria-hidden="true"
        >
          <span className={`${className} text-slate-400 italic truncate`}>
            {placeholder}
          </span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SPECIALIZED VARIANTS
// ==========================================

/** Pre-configured for names/headings */
export function EditableName(props: Omit<EditableFieldProps, "type" | "as">) {
  return (
    <EditableField
      {...props}
      type="text"
      as="h1"
      placeholder={props.placeholder || "Your Name"}
    />
  );
}

/** Pre-configured for job titles */
export function EditableTitle(props: Omit<EditableFieldProps, "type" | "as">) {
  return (
    <EditableField
      {...props}
      type="text"
      as="h2"
      placeholder={props.placeholder || "Job Title"}
    />
  );
}

/** Pre-configured for paragraphs/descriptions */
export function EditableParagraph(props: Omit<EditableFieldProps, "type" | "multiline">) {
  return (
    <EditableField
      {...props}
      type="textarea"
      multiline
      as="p"
      placeholder={props.placeholder || "Add description..."}
    />
  );
}

/** Pre-configured for single-line contact info */
export function EditableContact(props: Omit<EditableFieldProps, "type">) {
  return (
    <EditableField
      {...props}
      type="text"
      as="span"
      placeholder={props.placeholder || "Contact info"}
    />
  );
}

export default EditableField;
