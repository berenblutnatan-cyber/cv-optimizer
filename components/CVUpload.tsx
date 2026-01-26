"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, Check, X } from "lucide-react";

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
    <div className="bg-white rounded-sm shadow-[0_4px_40px_-12px_rgba(0,0,0,0.08)] p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-11 h-11 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
          <FileText className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
        </div>
        <h3 className="font-serif text-xl text-[#1a1a1a]">Your Resume</h3>
      </div>

      {/* Toggle between upload and paste */}
      <div className="flex border-b border-stone-200 mb-6">
        <button
          onClick={() => setInputMode("upload")}
          className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
            inputMode === "upload"
              ? "border-[#0A2647] text-[#0A2647]"
              : "border-transparent text-stone-400 hover:text-stone-600"
          }`}
        >
          Upload PDF
        </button>
        <button
          onClick={() => setInputMode("paste")}
          className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
            inputMode === "paste"
              ? "border-[#0A2647] text-[#0A2647]"
              : "border-transparent text-stone-400 hover:text-stone-600"
          }`}
        >
          Paste Text
        </button>
      </div>

      {inputMode === "upload" ? (
        <>
          {selectedFile ? (
            <div className="border border-[#0A2647]/20 bg-[#0A2647]/5 rounded-sm p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#0A2647]/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-medium text-[#1a1a1a]">{selectedFile.name}</p>
                    <p className="text-sm text-stone-400 font-light">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border rounded-sm p-10 text-center transition-all ${
                isDragging
                  ? "border-[#0A2647] bg-[#0A2647]/5"
                  : "border-stone-200 hover:border-stone-300 bg-stone-50/50"
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
                <Upload className="w-8 h-8 text-stone-300 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-stone-500 mb-2 font-light">
                  Drag and drop your PDF or{" "}
                  <span className="text-[#0A2647] font-medium">browse</span>
                </p>
                <p className="text-stone-400 text-sm font-light">PDF only • Max 10MB</p>
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
          placeholder="Please paste your resume contents here..."
          className="w-full h-48 p-0 border-b border-stone-200 text-[#1a1a1a] text-sm resize-none focus:outline-none focus:border-[#0A2647] transition-colors placeholder:text-stone-300 bg-transparent font-light leading-relaxed"
        />
      )}
    </div>
  );
}
