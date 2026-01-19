"use client";

// ==========================================
// BUILDER COMPONENTS
// ==========================================

export { 
  EditableField,
  EditableName,
  EditableTitle,
  EditableParagraph,
  EditableContact,
} from "./EditableField";

export type { EditableFieldProps } from "./EditableField";

export { FloatingAIAssistant } from "./FloatingAIAssistant";

export { EditableModernSidebar } from "./EditableModernSidebar";

export type { 
  ResumeData, 
  ResumeSection, 
  ResumeSectionItem,
  EditableModernSidebarProps,
} from "./EditableModernSidebar";

export { TemplateSwitcher, TEMPLATE_OPTIONS, COLOR_OPTIONS } from "./TemplateSwitcher";
export type { TemplateOption, ColorOption } from "./TemplateSwitcher";

export { ResumePreview } from "./ResumePreview";
export { EditableResumePreview } from "./EditableResumePreview";
export type { EditableResumePreviewProps } from "./EditableResumePreview";
export type { 
  ResumePreviewData, 
  ResumePreviewProps,
  ResumeContact,
  ResumeSection as PreviewSection,
  ResumeSectionItem as PreviewSectionItem,
} from "./ResumePreview";

// Re-export context
export { 
  BuilderProvider, 
  useBuilder, 
  useIsFieldActive,
  useAIAssistant,
} from "@/context/BuilderContext";

export type { 
  BuilderContextState,
  BuilderContextActions,
  BuilderContextValue,
  FieldRect,
  ThemeColor,
  BuilderTemplateId,
} from "@/context/BuilderContext";
