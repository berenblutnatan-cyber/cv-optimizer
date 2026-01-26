"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
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
  Check,
  Camera,
  Upload,
  PanelRightOpen
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
import { SmartResumePreview } from "@/components/shared/SmartResumePreview";
import { AuthModal, useAuthModal } from "@/components/shared/AuthModal";
import { TemplateDownloadCard } from "@/components/TemplateDownloadCard";
import { AllTemplateId, ALL_TEMPLATES } from "@/components/cv-templates";
import { convertToPreviewData } from "@/lib/resumeDataConverter";
import { BuilderTemplateId, ThemeColor } from "@/context/BuilderContext";
import { Logo } from "@/components/Logo";
import { UserButton } from "@clerk/nextjs";

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
  const { isSignedIn } = useUser();
  const { 
    resumeData, 
    currentStep,
    nextStep,
    prevStep,
    goToStep,
  } = useResumeStore();
  
  // Preview panel state - default CLOSED to focus on form
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BuilderTemplateId>("executive");
  const [selectedColor, setSelectedColor] = useState<ThemeColor>("indigo");
  
  // Auth modal for deferred authentication
  const { isOpen: isAuthModalOpen, trigger: authTrigger, openModal: openAuthModal, closeModal: closeAuthModal } = useAuthModal();
  
  // Convert structured data for templates
  const cvText = resumeToText(resumeData);
  const previewData = convertToPreviewData(resumeData);

  // Calculate progress percentage
  const progressPercent = ((currentStep + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="h-screen bg-[#FAFAF8] text-[#1a1a1a] flex flex-col overflow-hidden">
      {/* Premium Header */}
      <header className="flex-shrink-0 w-full border-b border-stone-200/60 bg-white/80 backdrop-blur-sm z-20">
        <div className="px-8 lg:px-16 py-5">
          <div className="max-w-[1800px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Logo variant="dark" size="md" />
              <span className="px-4 py-1.5 rounded-sm bg-[#0A2647]/5 text-[#0A2647] text-xs font-medium tracking-wide">
                Resume Builder
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link 
                href="/"
                className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-sm tracking-wide"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                Back to Home
              </Link>
              <UserButton appearance={{ elements: { avatarBox: "w-9 h-9 ring-2 ring-stone-200" } }} />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-8 lg:px-16 pb-5">
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
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Step Editor */}
        <div 
          className={`bg-white flex flex-col overflow-hidden border-r border-stone-100 transition-all duration-300 ease-in-out ${
            isPreviewOpen ? "w-full lg:w-1/2" : "w-full"
          }`}
        >
          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <StepContent step={currentStep} />
          </div>

          {/* Navigation Buttons */}
          <div className="flex-shrink-0 px-8 py-5 border-t border-stone-100 bg-[#FAFAF8]">
            <div className="flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed border border-stone-300 text-stone-700 rounded-sm transition-colors tracking-wide"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                Back
              </button>
              
              <span className="text-stone-400 text-sm font-light tracking-wide">
                Step {currentStep + 1} of {TOTAL_STEPS}
              </span>

              {currentStep < TOTAL_STEPS - 1 ? (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-3 bg-[#0A2647] hover:bg-[#0d3259] text-white font-medium rounded-sm transition-colors tracking-wide"
                >
                  Next
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              ) : (
                <div className="w-24" />
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Live Preview (Collapsible) */}
        <div 
          className={`bg-stone-100 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
            isPreviewOpen ? "w-full lg:w-1/2 absolute lg:relative inset-0 lg:inset-auto z-30" : "w-0"
          }`}
        >
          {isPreviewOpen && (
            <>
              {/* Preview Header */}
              <div className="flex-shrink-0 px-5 py-4 border-b border-stone-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#0A2647]/5 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-[#0A2647]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="font-serif text-lg text-[#1a1a1a]">Live Preview</h2>
                      <p className="text-xs text-stone-400 font-light">Auto-scales to fit</p>
                    </div>
                  </div>
                  <Link 
                    href="/builder/demo"
                    className="flex items-center gap-2 px-4 py-2 bg-[#0A2647] hover:bg-[#0d3259] text-white text-xs font-medium rounded-sm transition-all tracking-wide"
                  >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Pro Editor
                  </Link>
                </div>
              </div>

              {/* Preview Content */}
              <SmartResumePreview
                data={previewData}
                templateId={selectedTemplate}
                themeColor={selectedColor}
                showToolbar={true}
                onTemplateChange={setSelectedTemplate}
                onColorChange={setSelectedColor}
                onClose={() => setIsPreviewOpen(false)}
                className="flex-1 overflow-hidden"
              />
            </>
          )}
        </div>

        {/* Toggle Preview Button */}
        {!isPreviewOpen && (
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-3 pl-5 pr-4 py-5 bg-[#0A2647] hover:bg-[#0d3259] text-white rounded-l-sm shadow-xl hover:shadow-2xl transition-all duration-300 group"
            title="Show Preview"
          >
            <Eye className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-sm font-medium tracking-wide writing-vertical">Preview</span>
            <PanelRightOpen className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
          </button>
        )}
      </main>

      {/* Auth Modal for Deferred Authentication */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        trigger={authTrigger}
      />
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
    <div className="space-y-4">
      {/* Progress percentage */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-400 font-light tracking-wide">Progress</span>
        <span className="text-[#0A2647] font-medium tracking-wide">{Math.round(progressPercent)}% Complete</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#0A2647] rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => (
          <button
            key={step.id}
            onClick={() => onStepClick(index)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all ${
              index === currentStep
                ? "bg-[#0A2647]/5 text-[#0A2647]"
                : index < currentStep
                ? "text-[#0A2647] hover:bg-stone-100"
                : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              index < currentStep 
                ? "bg-[#0A2647]/10 text-[#0A2647]" 
                : index === currentStep 
                ? "bg-[#0A2647] text-white" 
                : "bg-stone-200 text-stone-500"
            }`}>
              {index < currentStep ? (
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
              ) : (
                STEP_ICONS[index]
              )}
            </span>
            <span className="text-xs font-medium hidden lg:block tracking-wide">{step.title}</span>
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePersonalInfo({ photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    updatePersonalInfo({ photo: undefined });
  };

  return (
    <div className="space-y-6">
      <StepHeader 
        title="Personal Information" 
        description="Let's start with your contact details. This information will appear at the top of your CV."
      />

      {/* Photo Upload Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-4">
          {/* Photo Preview */}
          <div className="relative flex-shrink-0">
            {resumeData.personalInfo.photo ? (
              <div className="relative">
                <img
                  src={resumeData.personalInfo.photo}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
                />
                <button
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center border-2 border-dashed border-slate-300">
                <Camera className="w-8 h-8 text-slate-400" />
              </div>
            )}
          </div>
          
          {/* Upload Instructions */}
          <div className="flex-1">
            <h4 className="font-medium text-amber-800 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Profile Photo
              <span className="text-xs font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                Optional
              </span>
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              Some templates (like "Executive") include a photo placeholder. Upload your professional headshot to personalize it.
            </p>
            <label className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 text-sm font-medium rounded-lg cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              {resumeData.personalInfo.photo ? 'Change Photo' : 'Upload Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

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
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-xl transition-colors"
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
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-xl transition-colors"
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
  const [isSuggesting, setIsSuggesting] = useState(false);

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

  const handleSuggestSkills = async () => {
    setIsSuggesting(true);
    try {
      // Mock suggestion - in production would call AI API
      const suggestedSkills = ["Problem Solving", "Team Leadership", "Agile Methodology", "Communication"];
      suggestedSkills.forEach(skill => {
        if (!resumeData.skills.includes(skill)) {
          addSkill(skill);
        }
      });
    } finally {
      setIsSuggesting(false);
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
            <Wrench className="w-5 h-5 text-indigo-600" />
            Skills
          </h3>
          <button
            onClick={handleSuggestSkills}
            disabled={isSuggesting}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg transition-all"
          >
            {isSuggesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            ✨ Suggest Skills
          </button>
        </div>
        <div className="flex gap-2">
          <FormInput
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add a skill (e.g., JavaScript, Project Management)"
            onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
          />
          <button
            onClick={handleAddSkill}
            className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-xl transition-colors whitespace-nowrap"
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
          <p className="text-slate-400 text-sm">No skills added yet</p>
        )}
      </div>

      {/* Languages */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
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
            className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-xl transition-colors whitespace-nowrap"
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
          <p className="text-slate-400 text-sm">No languages added yet</p>
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
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-xl transition-colors whitespace-nowrap"
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
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">CV Completion</h3>
          <span className={`text-lg font-bold ${completionPercent === 100 ? 'text-indigo-600' : 'text-amber-500'}`}>
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
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-slate-900">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI Analysis
          </h3>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-medium rounded-xl transition-colors"
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
                analysis.score >= 80 ? 'text-indigo-600' : 
                analysis.score >= 60 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {analysis.score}
              </div>
              <div>
                <div className="font-medium text-slate-900">Resume Score</div>
                <div className="text-slate-500 text-sm">out of 100</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-600">Suggestions:</h4>
              {analysis.suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Templates - All 8 Options */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-slate-900">
          <Download className="w-5 h-5 text-indigo-600" />
          Download Your CV
        </h3>
        <p className="text-sm text-slate-500">
          Choose from 8 professional templates. Click to preview, then download as PDF.
        </p>
        <div className="grid grid-cols-4 gap-3">
          {(Object.keys(ALL_TEMPLATES) as AllTemplateId[]).map((templateId) => (
            <TemplateDownloadCard
              key={templateId}
              templateId={templateId}
              data={convertToPreviewData(resumeData)}
              fileName="My-CV"
              themeColor="indigo"
            />
          ))}
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
    <div className="space-y-2 mb-2">
      <h2 className="font-serif text-2xl text-[#1a1a1a]">{title}</h2>
      <p className="text-stone-500 font-light">{description}</p>
    </div>
  );
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-[#1a1a1a] mb-2 tracking-wide">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
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
      className={`w-full px-4 py-3 bg-white border-b border-stone-200 text-[#1a1a1a] placeholder:text-stone-300 focus:outline-none focus:border-[#0A2647] transition-all font-light ${className}`}
    />
  );
}

function EmptyState({ text, subtext }: { text: string; subtext?: string }) {
  return (
    <div className="text-center py-12 bg-stone-50 border border-dashed border-stone-200 rounded-sm">
      <p className="text-stone-500 font-light">{text}</p>
      {subtext && <p className="text-stone-400 text-sm mt-2 font-light">{subtext}</p>}
    </div>
  );
}

function SkillTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="group flex items-center gap-2 px-4 py-2 bg-[#0A2647]/5 border border-[#0A2647]/20 text-[#0A2647] rounded-sm text-sm hover:border-[#0A2647]/40 transition-colors">
      {label}
      <button
        onClick={onRemove}
        className="text-[#0A2647]/50 hover:text-red-500 transition-colors"
      >
        <X className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
    </span>
  );
}

function CompletionItem({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${completed ? 'text-[#0A2647]' : 'text-stone-400'}`}>
      {completed ? <Check className="w-4 h-4" strokeWidth={1.5} /> : <X className="w-4 h-4" strokeWidth={1.5} />}
      <span className="font-light">{label}</span>
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
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
        />
        <div className={`absolute bottom-3 right-3 text-xs font-medium ${
          isOverLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-slate-400'
        }`}>
          {charCount}/{limit}
        </div>
      </div>
      {isOverLimit && (
        <p className="text-amber-600 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Consider shortening for better readability
        </p>
      )}
      <button
        onClick={handleOptimize}
        disabled={isOptimizing || !value.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg transition-all"
      >
        {isOptimizing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            ✨ Generate Summary
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
        <span className="px-4 py-2.5 bg-indigo-100 border border-indigo-200 rounded-xl text-indigo-700 flex-1 text-center">
          Present
        </span>
        <button
          onClick={() => onPresentChange?.(false)}
          className="px-3 py-2.5 text-slate-500 hover:text-slate-700 text-sm transition-colors"
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
        className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
      >
        <option value="" className="bg-white">Month</option>
        {MONTHS.map((m) => (
          <option key={m} value={m} className="bg-white">{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => handleChange(month, e.target.value)}
        className="w-24 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
      >
        <option value="" className="bg-white">Year</option>
        {YEARS.map((y) => (
          <option key={y} value={y} className="bg-white">{y}</option>
        ))}
      </select>
      {showPresent && (
        <button
          onClick={() => onPresentChange?.(true)}
          className="px-3 py-2.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors whitespace-nowrap"
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
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">Position {index + 1}</span>
        <button
          onClick={() => removeExperience(experience.id)}
          className="flex items-center gap-1 text-red-500/70 hover:text-red-600 text-sm transition-colors"
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
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
          />
          <button
            onClick={handleOptimizeBullets}
            disabled={isOptimizing || !experience.description.some(Boolean)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 text-indigo-700 text-xs font-medium rounded-lg transition-all"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                ✨ Generate Bullets
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
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">Education {index + 1}</span>
        <button
          onClick={() => removeEducation(education.id)}
          className="flex items-center gap-1 text-red-500/70 hover:text-red-600 text-sm transition-colors"
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
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <FormInput
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Section Title"
          className="text-lg font-semibold"
        />
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-red-500/70 hover:text-red-600 text-sm transition-colors whitespace-nowrap"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>

      <div className="space-y-2">
        {section.items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="text-slate-400 text-sm w-6">{idx + 1}.</span>
            <input
              value={item.text}
              onChange={(e) => onUpdateItem(item.id, e.target.value)}
              placeholder="Add an item..."
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <button
              onClick={() => onRemoveItem(item.id)}
              className="text-slate-400 hover:text-red-500 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={onAddItem}
          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>
    </div>
  );
}
