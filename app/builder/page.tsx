"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ArrowRight,
  Sparkles, 
  Eye, 
  User,
  FileText,
  Briefcase, 
  GraduationCap, 
  Wrench,
  Layers,
  CheckCircle,
  Plus,
  Trash2,
  X,
  Loader2,
  Wand2,
  Download,
  AlertCircle,
  Check
} from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { 
  resumeToText, 
  Experience, 
  Education, 
  CustomSection,
  WIZARD_STEPS,
  TOTAL_STEPS
} from "@/types/resume";
import { ModernTemplate } from "@/components/cv-templates";
import { TemplatePreviewCard } from "@/components/TemplatePreviewCard";

// Month options for date picker
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Generate year options (current year to 50 years ago)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 51 }, (_, i) => currentYear - i);

// Step icons
const STEP_ICONS = [
  <User key="0" className="w-4 h-4" />,
  <FileText key="1" className="w-4 h-4" />,
  <Briefcase key="2" className="w-4 h-4" />,
  <GraduationCap key="3" className="w-4 h-4" />,
  <Wrench key="4" className="w-4 h-4" />,
  <Layers key="5" className="w-4 h-4" />,
  <CheckCircle key="6" className="w-4 h-4" />,
];

export default function BuilderPage() {
  const { 
    resumeData, 
    currentStep,
    nextStep,
    prevStep,
    goToStep,
  } = useResumeStore();
  
  // Convert structured data to text for the template
  const cvText = resumeToText(resumeData);

  // Calculate progress percentage
  const progressPercent = ((currentStep + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header with Progress Bar */}
      <header className="flex-shrink-0 w-full border-b border-white/10 bg-black/80 backdrop-blur-sm z-20">
        <div className="px-6 py-4">
          <div className="max-w-[1800px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">CV Studio</span>
              </Link>
              <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-medium">
                Builder
              </span>
            </div>
            <Link 
              href="/"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pb-4">
          <div className="max-w-[1800px] mx-auto">
            <ProgressBar 
              currentStep={currentStep} 
              totalSteps={TOTAL_STEPS} 
              progressPercent={progressPercent}
              onStepClick={goToStep}
            />
          </div>
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Step Editor */}
        <div className="w-1/2 border-r border-white/10 flex flex-col overflow-hidden">
          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <StepContent step={currentStep} />
          </div>

          {/* Navigation Buttons */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 bg-black/50">
            <div className="flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-white rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              
              <span className="text-white/40 text-sm">
                Step {currentStep + 1} of {TOTAL_STEPS}
              </span>

              {currentStep < TOTAL_STEPS - 1 ? (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-24" /> // Spacer for final step
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="w-1/2 bg-gray-900/50 overflow-hidden flex flex-col">
          {/* Preview Header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-white/10 bg-black/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <Eye className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h2 className="font-semibold">Live Preview</h2>
                <p className="text-xs text-white/50">Updates as you type</p>
              </div>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-6 flex justify-center">
            <div 
              className="origin-top shadow-2xl"
              style={{ 
                transform: "scale(0.5)",
                transformOrigin: "top center",
              }}
            >
              <ModernTemplate data={cvText} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================
// Progress Bar Component
// ============================================

function ProgressBar({ 
  currentStep, 
  totalSteps, 
  progressPercent,
  onStepClick 
}: { 
  currentStep: number; 
  totalSteps: number;
  progressPercent: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Progress percentage */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">Progress</span>
        <span className="text-purple-400 font-medium">{Math.round(progressPercent)}% Complete</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => (
          <button
            key={step.id}
            onClick={() => onStepClick(index)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              index === currentStep
                ? "bg-purple-500/20 text-purple-300"
                : index < currentStep
                ? "text-green-400 hover:bg-white/5"
                : "text-white/30 hover:bg-white/5 hover:text-white/50"
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              index < currentStep 
                ? "bg-green-500/20" 
                : index === currentStep 
                ? "bg-purple-500/30" 
                : "bg-white/10"
            }`}>
              {index < currentStep ? (
                <Check className="w-3 h-3" />
              ) : (
                STEP_ICONS[index]
              )}
            </span>
            <span className="text-xs font-medium hidden lg:block">{step.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Step Content Router
// ============================================

function StepContent({ step }: { step: number }) {
  switch (step) {
    case 0:
      return <PersonalInfoStep />;
    case 1:
      return <SummaryStep />;
    case 2:
      return <ExperienceStep />;
    case 3:
      return <EducationStep />;
    case 4:
      return <SkillsStep />;
    case 5:
      return <CustomSectionsStep />;
    case 6:
      return <ReviewStep />;
    default:
      return <div>Unknown step</div>;
  }
}

// ============================================
// Step 0: Personal Info
// ============================================

function PersonalInfoStep() {
  const { resumeData, updatePersonalInfo } = useResumeStore();

  return (
    <div className="space-y-6">
      <StepHeader 
        title="Personal Information" 
        description="Let's start with your contact details. This information will appear at the top of your CV."
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <FormLabel required>Full Name</FormLabel>
          <FormInput
            value={resumeData.personalInfo.name}
            onChange={(e) => updatePersonalInfo({ name: e.target.value })}
            placeholder="John Doe"
          />
        </div>
        <div className="col-span-2">
          <FormLabel>Professional Title</FormLabel>
          <FormInput
            value={resumeData.personalInfo.title}
            onChange={(e) => updatePersonalInfo({ title: e.target.value })}
            placeholder="Senior Software Engineer"
          />
        </div>
        <div>
          <FormLabel required>Email</FormLabel>
          <FormInput
            type="email"
            value={resumeData.personalInfo.email}
            onChange={(e) => updatePersonalInfo({ email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>
        <div>
          <FormLabel>Phone</FormLabel>
          <FormInput
            type="tel"
            value={resumeData.personalInfo.phone}
            onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div>
          <FormLabel>Location</FormLabel>
          <FormInput
            value={resumeData.personalInfo.location}
            onChange={(e) => updatePersonalInfo({ location: e.target.value })}
            placeholder="New York, NY"
          />
        </div>
        <div>
          <FormLabel>LinkedIn</FormLabel>
          <FormInput
            value={resumeData.personalInfo.linkedin}
            onChange={(e) => updatePersonalInfo({ linkedin: e.target.value })}
            placeholder="linkedin.com/in/johndoe"
          />
        </div>
        <div className="col-span-2">
          <FormLabel>Website / Portfolio</FormLabel>
          <FormInput
            value={resumeData.personalInfo.website}
            onChange={(e) => updatePersonalInfo({ website: e.target.value })}
            placeholder="johndoe.com"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Step 1: Summary
// ============================================

function SummaryStep() {
  const { resumeData, updateSummary } = useResumeStore();

  return (
    <div className="space-y-6">
      <StepHeader 
        title="Professional Summary" 
        description="Write a compelling 2-3 sentence summary that highlights your experience and career goals."
      />

      <TextAreaWithLimit
        value={resumeData.summary}
        onChange={(value) => updateSummary(value)}
        placeholder="Results-driven software engineer with 5+ years of experience building scalable web applications. Passionate about creating elegant solutions to complex problems and mentoring junior developers..."
        limit={400}
        rows={6}
        context="professional summary for a resume"
      />
    </div>
  );
}

// ============================================
// Step 2: Experience
// ============================================

function ExperienceStep() {
  const { resumeData, addExperience } = useResumeStore();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <StepHeader 
          title="Work Experience" 
          description="Add your relevant work history, starting with your most recent position."
        />
        <button
          onClick={() => addExperience()}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Position
        </button>
      </div>

      {resumeData.experience.length === 0 ? (
        <EmptyState 
          text="No work experience added yet" 
          subtext="Click 'Add Position' to add your first job"
        />
      ) : (
        <div className="space-y-4">
          {resumeData.experience.map((exp, index) => (
            <ExperienceCard key={exp.id} experience={exp} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Step 3: Education
// ============================================

function EducationStep() {
  const { resumeData, addEducation } = useResumeStore();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <StepHeader 
          title="Education" 
          description="Add your educational background, including degrees, certifications, and relevant coursework."
        />
        <button
          onClick={() => addEducation()}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Education
        </button>
      </div>

      {resumeData.education.length === 0 ? (
        <EmptyState 
          text="No education added yet" 
          subtext="Click 'Add Education' to add your academic background"
        />
      ) : (
        <div className="space-y-4">
          {resumeData.education.map((edu, index) => (
            <EducationCard key={edu.id} education={edu} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Step 4: Skills
// ============================================

function SkillsStep() {
  const { resumeData, addSkill, removeSkill, addLanguage, removeLanguage } = useResumeStore();
  const [newSkill, setNewSkill] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      addSkill(newSkill.trim());
      setNewSkill("");
    }
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim()) {
      addLanguage(newLanguage.trim());
      setNewLanguage("");
    }
  };

  return (
    <div className="space-y-8">
      <StepHeader 
        title="Skills & Languages" 
        description="Add your technical skills, soft skills, and languages you speak."
      />

      {/* Skills */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wrench className="w-5 h-5 text-purple-400" />
          Skills
        </h3>
        <div className="flex gap-2">
          <FormInput
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add a skill (e.g., JavaScript, Project Management)"
            onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
          />
          <button
            onClick={handleAddSkill}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium rounded-xl transition-colors whitespace-nowrap"
          >
            Add
          </button>
        </div>
        {resumeData.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {resumeData.skills.map((skill) => (
              <SkillTag key={skill} label={skill} onRemove={() => removeSkill(skill)} />
            ))}
          </div>
        ) : (
          <p className="text-white/40 text-sm">No skills added yet</p>
        )}
      </div>

      {/* Languages */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-lg">🌐</span>
          Languages
        </h3>
        <div className="flex gap-2">
          <FormInput
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
            placeholder="Add a language (e.g., English - Native, Spanish - Fluent)"
            onKeyDown={(e) => e.key === "Enter" && handleAddLanguage()}
          />
          <button
            onClick={handleAddLanguage}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium rounded-xl transition-colors whitespace-nowrap"
          >
            Add
          </button>
        </div>
        {resumeData.languages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {resumeData.languages.map((lang) => (
              <SkillTag key={lang} label={lang} onRemove={() => removeLanguage(lang)} />
            ))}
          </div>
        ) : (
          <p className="text-white/40 text-sm">No languages added yet</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Step 5: Custom Sections
// ============================================

function CustomSectionsStep() {
  const { 
    resumeData, 
    addCustomSection, 
    removeCustomSection, 
    updateCustomSection,
    addCustomSectionItem,
    updateCustomSectionItem,
    removeCustomSectionItem
  } = useResumeStore();
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const handleAddSection = () => {
    if (newSectionTitle.trim()) {
      addCustomSection(newSectionTitle.trim());
      setNewSectionTitle("");
    }
  };

  return (
    <div className="space-y-6">
      <StepHeader 
        title="Custom Sections" 
        description="Add additional sections like Volunteering, Publications, Awards, or anything else you'd like to highlight."
      />

      {/* Add new section */}
      <div className="flex gap-2">
        <FormInput
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
          placeholder="Section title (e.g., Volunteering, Publications, Awards)"
          onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
        />
        <button
          onClick={handleAddSection}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium rounded-xl transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Section
        </button>
      </div>

      {/* Existing sections */}
      {(!resumeData.customSections || resumeData.customSections.length === 0) ? (
        <EmptyState 
          text="No custom sections added yet" 
          subtext="Add sections for volunteering, publications, awards, or other achievements"
        />
      ) : (
        <div className="space-y-4">
          {resumeData.customSections.map((section) => (
            <CustomSectionCard 
              key={section.id} 
              section={section}
              onUpdate={(data) => updateCustomSection(section.id, data)}
              onRemove={() => removeCustomSection(section.id)}
              onAddItem={() => addCustomSectionItem(section.id)}
              onUpdateItem={(itemId, text) => updateCustomSectionItem(section.id, itemId, text)}
              onRemoveItem={(itemId) => removeCustomSectionItem(section.id, itemId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Step 6: Review & Export
// ============================================

function ReviewStep() {
  const { resumeData } = useResumeStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ score: number; suggestions: string[] } | null>(null);
  const cvText = resumeToText(resumeData);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else {
        // Mock response for now
        setAnalysis({
          score: 78,
          suggestions: [
            "Consider adding more quantifiable achievements",
            "Your summary could be more impactful with specific metrics",
            "Add more technical skills relevant to your target role",
          ]
        });
      }
    } catch (error) {
      // Mock response on error
      setAnalysis({
        score: 78,
        suggestions: [
          "Consider adding more quantifiable achievements",
          "Your summary could be more impactful with specific metrics",
          "Add more technical skills relevant to your target role",
        ]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate completion stats
  const stats = {
    hasName: !!resumeData.personalInfo.name,
    hasEmail: !!resumeData.personalInfo.email,
    hasSummary: resumeData.summary.length > 50,
    hasExperience: resumeData.experience.length > 0,
    hasEducation: resumeData.education.length > 0,
    hasSkills: resumeData.skills.length > 0,
  };
  const completedCount = Object.values(stats).filter(Boolean).length;
  const completionPercent = Math.round((completedCount / Object.keys(stats).length) * 100);

  return (
    <div className="space-y-6">
      <StepHeader 
        title="Review & Export" 
        description="Review your CV, get AI feedback, and download your finished resume."
      />

      {/* Completion Status */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">CV Completion</h3>
          <span className={`text-lg font-bold ${completionPercent === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
            {completionPercent}%
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <CompletionItem label="Name" completed={stats.hasName} />
          <CompletionItem label="Email" completed={stats.hasEmail} />
          <CompletionItem label="Summary" completed={stats.hasSummary} />
          <CompletionItem label="Experience" completed={stats.hasExperience} />
          <CompletionItem label="Education" completed={stats.hasEducation} />
          <CompletionItem label="Skills" completed={stats.hasSkills} />
        </div>
      </div>

      {/* AI Analysis */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            AI Analysis
          </h3>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-medium rounded-xl transition-colors"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze with AI
              </>
            )}
          </button>
        </div>

        {analysis && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${
                analysis.score >= 80 ? 'text-green-400' : 
                analysis.score >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {analysis.score}
              </div>
              <div>
                <div className="font-medium">Resume Score</div>
                <div className="text-white/50 text-sm">out of 100</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white/70">Suggestions:</h4>
              {analysis.suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white/70">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Templates */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Download className="w-5 h-5 text-purple-400" />
          Download Your CV
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <TemplatePreviewCard templateId="harvard" cvData={cvText} fileName="My-CV" />
          <TemplatePreviewCard templateId="modern" cvData={cvText} fileName="My-CV" />
          <TemplatePreviewCard templateId="creative" cvData={cvText} fileName="My-CV" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Reusable Components
// ============================================

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-white/50">{description}</p>
    </div>
  );
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm text-white/60 mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

function FormInput({ 
  className = "", 
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all ${className}`}
    />
  );
}

function EmptyState({ text, subtext }: { text: string; subtext?: string }) {
  return (
    <div className="text-center py-10 bg-white/5 border border-dashed border-white/10 rounded-2xl">
      <p className="text-white/50">{text}</p>
      {subtext && <p className="text-white/30 text-sm mt-1">{subtext}</p>}
    </div>
  );
}

function SkillTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="group flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm hover:border-white/20 transition-colors">
      {label}
      <button
        onClick={onRemove}
        className="text-white/30 hover:text-red-400 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

function CompletionItem({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${completed ? 'text-green-400' : 'text-white/40'}`}>
      {completed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      <span>{label}</span>
    </div>
  );
}

// TextAreaWithLimit Component
function TextAreaWithLimit({
  value,
  onChange,
  placeholder,
  limit,
  rows = 4,
  context
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  limit: number;
  rows?: number;
  context: string;
}) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const charCount = value.length;
  const isOverLimit = charCount > limit;
  const isNearLimit = charCount > limit * 0.8;

  const handleOptimize = async () => {
    if (!value.trim() || isOptimizing) return;
    
    setIsOptimizing(true);
    try {
      const response = await fetch("/api/optimize-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, context }),
      });
      
      if (!response.ok) throw new Error("Failed to optimize");
      
      const { improvedText } = await response.json();
      onChange(improvedText);
    } catch (error) {
      console.error("Optimize error:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
        />
        <div className={`absolute bottom-3 right-3 text-xs font-medium ${
          isOverLimit ? 'text-red-400' : isNearLimit ? 'text-orange-400' : 'text-white/30'
        }`}>
          {charCount}/{limit}
        </div>
      </div>
      {isOverLimit && (
        <p className="text-orange-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Consider shortening for better readability
        </p>
      )}
      <button
        onClick={handleOptimize}
        disabled={isOptimizing || !value.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/30 text-purple-300 text-sm font-medium rounded-lg transition-all"
      >
        {isOptimizing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Optimizing...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Optimize with AI
          </>
        )}
      </button>
    </div>
  );
}

// Date Picker Component
function DatePicker({ 
  value, 
  onChange,
  showPresent = false,
  isPresent = false,
  onPresentChange
}: { 
  value: string; 
  onChange: (value: string) => void;
  showPresent?: boolean;
  isPresent?: boolean;
  onPresentChange?: (isPresent: boolean) => void;
}) {
  const parts = value.split(" ");
  const month = MONTHS.includes(parts[0]) ? parts[0] : "";
  const year = parts[1] && !isNaN(parseInt(parts[1])) ? parts[1] : "";

  const handleChange = (newMonth: string, newYear: string) => {
    if (newMonth && newYear) {
      onChange(`${newMonth} ${newYear}`);
    } else if (newYear) {
      onChange(newYear);
    } else {
      onChange("");
    }
  };

  if (showPresent && isPresent) {
    return (
      <div className="flex items-center gap-2">
        <span className="px-4 py-2.5 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 flex-1 text-center">
          Present
        </span>
        <button
          onClick={() => onPresentChange?.(false)}
          className="px-3 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        value={month}
        onChange={(e) => handleChange(e.target.value, year)}
        className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
      >
        <option value="" className="bg-gray-900">Month</option>
        {MONTHS.map((m) => (
          <option key={m} value={m} className="bg-gray-900">{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => handleChange(month, e.target.value)}
        className="w-24 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
      >
        <option value="" className="bg-gray-900">Year</option>
        {YEARS.map((y) => (
          <option key={y} value={y} className="bg-gray-900">{y}</option>
        ))}
      </select>
      {showPresent && (
        <button
          onClick={() => onPresentChange?.(true)}
          className="px-3 py-2.5 text-purple-400/70 hover:text-purple-300 text-sm font-medium transition-colors whitespace-nowrap"
        >
          Present
        </button>
      )}
    </div>
  );
}

// ============================================
// Card Components
// ============================================

function ExperienceCard({ experience, index }: { experience: Experience; index: number }) {
  const { updateExperience, removeExperience } = useResumeStore();
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimizeBullets = async () => {
    const text = experience.description.filter(Boolean).join("\n");
    if (!text.trim() || isOptimizing) return;
    
    setIsOptimizing(true);
    try {
      const response = await fetch("/api/optimize-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          context: `job responsibilities and achievements for ${experience.role || "a role"} at ${experience.company || "a company"}` 
        }),
      });
      
      if (!response.ok) throw new Error("Failed to optimize");
      
      const { improvedText } = await response.json();
      updateExperience(experience.id, { description: improvedText.split("\n").filter(Boolean) });
    } catch (error) {
      console.error("Optimize error:", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">Position {index + 1}</span>
        <button
          onClick={() => removeExperience(experience.id)}
          className="flex items-center gap-1 text-red-400/70 hover:text-red-400 text-sm transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel required>Job Title</FormLabel>
          <FormInput
            value={experience.role}
            onChange={(e) => updateExperience(experience.id, { role: e.target.value })}
            placeholder="Software Engineer"
          />
        </div>
        <div>
          <FormLabel required>Company</FormLabel>
          <FormInput
            value={experience.company}
            onChange={(e) => updateExperience(experience.id, { company: e.target.value })}
            placeholder="Google"
          />
        </div>
        <div>
          <FormLabel>Location</FormLabel>
          <FormInput
            value={experience.location}
            onChange={(e) => updateExperience(experience.id, { location: e.target.value })}
            placeholder="Mountain View, CA"
          />
        </div>
        <div></div>
        <div>
          <FormLabel>Start Date</FormLabel>
          <DatePicker
            value={experience.startDate}
            onChange={(value) => updateExperience(experience.id, { startDate: value })}
          />
        </div>
        <div>
          <FormLabel>End Date</FormLabel>
          <DatePicker
            value={experience.current ? "Present" : experience.endDate}
            onChange={(value) => updateExperience(experience.id, { endDate: value, current: false })}
            showPresent
            isPresent={experience.current}
            onPresentChange={(isPresent) => updateExperience(experience.id, { current: isPresent, endDate: "" })}
          />
        </div>
        <div className="col-span-2 space-y-2">
          <FormLabel>Key Achievements</FormLabel>
          <textarea
            value={experience.description.join("\n")}
            onChange={(e) => updateExperience(experience.id, { description: e.target.value.split("\n") })}
            placeholder="• Led development of new features serving 1M+ users&#10;• Improved performance by 40% through optimization&#10;• Mentored 3 junior developers"
            rows={4}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
          />
          <button
            onClick={handleOptimizeBullets}
            disabled={isOptimizing || !experience.description.some(Boolean)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/30 hover:to-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/30 text-purple-300 text-xs font-medium rounded-lg transition-all"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                Optimize with AI
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EducationCard({ education, index }: { education: Education; index: number }) {
  const { updateEducation, removeEducation } = useResumeStore();

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">Education {index + 1}</span>
        <button
          onClick={() => removeEducation(education.id)}
          className="flex items-center gap-1 text-red-400/70 hover:text-red-400 text-sm transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <FormLabel required>Institution</FormLabel>
          <FormInput
            value={education.institution}
            onChange={(e) => updateEducation(education.id, { institution: e.target.value })}
            placeholder="Massachusetts Institute of Technology"
          />
        </div>
        <div>
          <FormLabel required>Degree</FormLabel>
          <FormInput
            value={education.degree}
            onChange={(e) => updateEducation(education.id, { degree: e.target.value })}
            placeholder="Bachelor of Science"
          />
        </div>
        <div>
          <FormLabel required>Field of Study</FormLabel>
          <FormInput
            value={education.field}
            onChange={(e) => updateEducation(education.id, { field: e.target.value })}
            placeholder="Computer Science"
          />
        </div>
        <div>
          <FormLabel>Location</FormLabel>
          <FormInput
            value={education.location}
            onChange={(e) => updateEducation(education.id, { location: e.target.value })}
            placeholder="Cambridge, MA"
          />
        </div>
        <div>
          <FormLabel>GPA (Optional)</FormLabel>
          <FormInput
            value={education.gpa || ""}
            onChange={(e) => updateEducation(education.id, { gpa: e.target.value })}
            placeholder="3.8/4.0"
          />
        </div>
        <div>
          <FormLabel>Start Date</FormLabel>
          <DatePicker
            value={education.startDate}
            onChange={(value) => updateEducation(education.id, { startDate: value })}
          />
        </div>
        <div>
          <FormLabel>End Date</FormLabel>
          <DatePicker
            value={education.endDate}
            onChange={(value) => updateEducation(education.id, { endDate: value })}
          />
        </div>
      </div>
    </div>
  );
}

function CustomSectionCard({ 
  section, 
  onUpdate, 
  onRemove,
  onAddItem,
  onUpdateItem,
  onRemoveItem
}: { 
  section: CustomSection;
  onUpdate: (data: Partial<CustomSection>) => void;
  onRemove: () => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, text: string) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <FormInput
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Section Title"
          className="text-lg font-semibold"
        />
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-red-400/70 hover:text-red-400 text-sm transition-colors whitespace-nowrap"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>

      <div className="space-y-2">
        {section.items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="text-white/30 text-sm w-6">{idx + 1}.</span>
            <input
              value={item.text}
              onChange={(e) => onUpdateItem(item.id, e.target.value)}
              placeholder="Add an item..."
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 transition-all"
            />
            <button
              onClick={() => onRemoveItem(item.id)}
              className="text-white/30 hover:text-red-400 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={onAddItem}
          className="flex items-center gap-1.5 text-purple-400/70 hover:text-purple-300 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>
    </div>
  );
}
