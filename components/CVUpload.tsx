"use client";

import { useCallback, useState } from "react";

interface CVUploadProps {
  onFileSelect: (file: File | null) => void;
  onTextChange: (text: string) => void;
  selectedFile: File | null;
  cvText: string;
}

export function CVUpload({ onFileSelect, onTextChange, selectedFile, cvText }: CVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      onFileSelect(file);
      onTextChange("");
    }
  }, [onFileSelect, onTextChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      onTextChange("");
    }
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
  };

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-6 backdrop-blur">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
          <svg className="w-5 h-5 text-white/85" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Your CV</h3>
      </div>

      {/* Toggle between upload and paste */}
      <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl border border-white/10">
        <button
          onClick={() => setInputMode("upload")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            inputMode === "upload"
              ? "bg-indigo-500 text-white shadow-sm"
              : "text-white/70 hover:bg-white/5"
          }`}
        >
          Upload PDF
        </button>
        <button
          onClick={() => setInputMode("paste")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            inputMode === "paste"
              ? "bg-indigo-500 text-white shadow-sm"
              : "text-white/70 hover:bg-white/5"
          }`}
        >
          Paste Text
        </button>
      </div>

      {inputMode === "upload" ? (
        <>
          {selectedFile ? (
            <div className="border border-emerald-400/30 bg-emerald-500/10 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500/15 rounded-lg flex items-center justify-center border border-emerald-400/20">
                    <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">{selectedFile.name}</p>
                    <p className="text-sm text-white/60">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 text-white/60 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                isDragging
                  ? "border-indigo-300/70 bg-white/5"
                  : "border-white/20 hover:border-indigo-300/70 hover:bg-white/5"
              }`}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="cv-upload"
              />
              <label htmlFor="cv-upload" className="cursor-pointer">
                <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/10">
                  <svg className="w-7 h-7 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-white font-medium mb-1">
                  Drag & drop PDF or <span className="text-indigo-200">browse</span>
                </p>
                <p className="text-white/60 text-sm">PDF only • Max 10MB</p>
              </label>
            </div>
          )}
        </>
      ) : (
        <textarea
          value={cvText}
          onChange={(e) => {
            onTextChange(e.target.value);
            onFileSelect(null);
          }}
          placeholder="Paste your CV text here..."
          className="w-full h-52 px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none resize-none placeholder-white/40"
        />
      )}
    </div>
  );
}
