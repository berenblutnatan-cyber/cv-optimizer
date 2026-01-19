"use client";

import React, { useState, useEffect } from "react";
import { 
  BuilderProvider, 
  FloatingAIAssistant,
  TemplateSwitcher,
  EditableResumePreview,
  ResumePreviewData,
  useBuilder,
} from "@/components/builder";
import { Eye, Edit3, Download, Undo, Redo, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useResumeStore } from "@/store/useResumeStore";
import { convertToPreviewData } from "@/lib/resumeDataConverter";

/**
 * Builder Demo Page
 * 
 * Demonstrates the Live Interactive Editor (WYSIWYG) for resume building.
 * Users can click on any text in the preview to edit it directly.
 * 
 * Now syncs with the main Builder form data!
 */

// Fallback sample data - used only if no data exists in store
const FALLBACK_DATA: ResumePreviewData = {
  name: "Your Full Name",
  title: "Professional Title",
  contact: {
    email: "email@example.com",
    phone: "+1 (555) 123-4567",
    location: "City, State",
    linkedin: "linkedin.com/in/yourname",
  },
  skills: [
    "Add your skills...",
  ],
  languages: [
    "English - Native",
  ],
  summary: "Write a compelling professional summary that highlights your key strengths, experience, and career objectives. This is your elevator pitch to potential employers.",
  sections: [
    {
      id: "experience",
      title: "Experience",
      type: "experience",
      items: [
        {
          id: "exp-1",
          title: "Job Title",
          subtitle: "Company Name",
          date: "Start - Present",
          bullets: [
            "Key achievement or responsibility...",
            "Another accomplishment with measurable results...",
          ],
        },
      ],
    },
    {
      id: "education",
      title: "Education",
      type: "education",
      items: [
        {
          id: "edu-1",
          title: "Degree Name",
          subtitle: "University Name",
          date: "Start - End",
          description: "Relevant coursework or achievements",
        },
      ],
    },
  ],
};

// Inner component that uses the builder context
function BuilderContent() {
  const { selectedTemplateId, themeColor, isEditMode, setEditMode } = useBuilder();
  const storeData = useResumeStore((state) => state.resumeData);
  
  // Convert store data to preview format, or use fallback if empty
  const initialData = React.useMemo(() => {
    const converted = convertToPreviewData(storeData);
    // Check if we have any meaningful data
    const hasRealData = storeData.personalInfo.name || 
                        storeData.personalInfo.email ||
                        storeData.experience.length > 0 ||
                        storeData.education.length > 0;
    return hasRealData ? converted : FALLBACK_DATA;
  }, [storeData]);
  
  const [resumeData, setResumeData] = useState<ResumePreviewData>(initialData);
  
  // Sync with store data when it changes
  useEffect(() => {
    const converted = convertToPreviewData(storeData);
    const hasRealData = storeData.personalInfo.name || 
                        storeData.personalInfo.email ||
                        storeData.experience.length > 0 ||
                        storeData.education.length > 0;
    if (hasRealData) {
      setResumeData(converted);
    }
  }, [storeData]);

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <Link
              href="/builder"
              className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="w-px h-6 bg-slate-200" />
            <h1 className="text-lg font-bold text-slate-900">Resume Builder</h1>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
              Pro
            </span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button className="p-2 hover:bg-slate-50 text-slate-500 disabled:opacity-30" disabled>
                <Undo className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-slate-50 text-slate-500 disabled:opacity-30 border-l border-slate-200" disabled>
                <Redo className="w-4 h-4" />
              </button>
            </div>

            {/* Edit/Preview Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setEditMode(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isEditMode ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => setEditMode(false)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  !isEditMode ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            </div>

            {/* Download Button */}
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-6 flex gap-6 max-w-7xl mx-auto px-4">
        {/* Left Sidebar - Template Switcher */}
        <aside className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm sticky top-20">
            <TemplateSwitcher variant="sidebar" showColors={true} />
          </div>
        </aside>

        {/* Resume Preview */}
        <div className="flex-1 min-w-0">
          {/* Instructions Banner */}
          {isEditMode && (
            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900">Live Editor Mode</h3>
                <p className="text-sm text-indigo-700">
                  Click any text to edit. Switch templates on the left without losing your work.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-center bg-slate-100 rounded-xl p-6 min-h-[800px]">
            <EditableResumePreview
              data={resumeData}
              onChange={setResumeData}
              templateId={selectedTemplateId}
              themeColor={themeColor}
              readOnly={!isEditMode}
            />
          </div>
        </div>
      </main>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant />
    </>
  );
}

export default function BuilderDemoPage() {
  return (
    <BuilderProvider initialEditMode={true} initialTemplate="modern-sidebar" initialThemeColor="indigo">
      <div className="min-h-screen bg-slate-100">
        <BuilderContent />
      </div>
    </BuilderProvider>
  );
}
