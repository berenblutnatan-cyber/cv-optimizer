import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  ResumeData,
  PersonalInfo,
  Experience,
  Education,
  Project,
  Certification,
  CustomSection,
  CustomSectionItem,
  initialResumeState,
  generateId,
  TOTAL_STEPS,
} from "@/types/resume";

interface ResumeStore {
  // State
  resumeData: ResumeData;
  currentStep: number;

  // Step Navigation Actions
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;

  // Personal Info Actions
  updatePersonalInfo: (info: Partial<PersonalInfo>) => void;

  // Summary Actions
  updateSummary: (summary: string) => void;

  // Experience Actions
  addExperience: (experience?: Partial<Experience>) => void;
  updateExperience: (id: string, data: Partial<Experience>) => void;
  removeExperience: (id: string) => void;
  reorderExperience: (fromIndex: number, toIndex: number) => void;

  // Education Actions
  addEducation: (education?: Partial<Education>) => void;
  updateEducation: (id: string, data: Partial<Education>) => void;
  removeEducation: (id: string) => void;

  // Skills Actions
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  setSkills: (skills: string[]) => void;

  // Projects Actions
  addProject: (project?: Partial<Project>) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  removeProject: (id: string) => void;

  // Certifications Actions
  addCertification: (cert?: Partial<Certification>) => void;
  updateCertification: (id: string, data: Partial<Certification>) => void;
  removeCertification: (id: string) => void;

  // Languages Actions
  addLanguage: (language: string) => void;
  removeLanguage: (language: string) => void;
  setLanguages: (languages: string[]) => void;

  // Custom Sections Actions
  addCustomSection: (title?: string) => void;
  updateCustomSection: (id: string, data: Partial<CustomSection>) => void;
  removeCustomSection: (id: string) => void;
  addCustomSectionItem: (sectionId: string, text?: string) => void;
  updateCustomSectionItem: (sectionId: string, itemId: string, text: string) => void;
  removeCustomSectionItem: (sectionId: string, itemId: string) => void;

  // Bulk Actions
  setResumeData: (data: ResumeData) => void;
  resetResume: () => void;
}

export const useResumeStore = create<ResumeStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial State
        resumeData: initialResumeState,
        currentStep: 0,

        // Step Navigation
        nextStep: () =>
          set(
            (state) => ({
              currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
            }),
            false,
            "nextStep"
          ),

        prevStep: () =>
          set(
            (state) => ({
              currentStep: Math.max(state.currentStep - 1, 0),
            }),
            false,
            "prevStep"
          ),

        goToStep: (index) =>
          set(
            () => ({
              currentStep: Math.max(0, Math.min(index, TOTAL_STEPS - 1)),
            }),
            false,
            "goToStep"
          ),

        // Personal Info
        updatePersonalInfo: (info) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                personalInfo: { ...state.resumeData.personalInfo, ...info },
              },
            }),
            false,
            "updatePersonalInfo"
          ),

        // Summary
        updateSummary: (summary) =>
          set(
            (state) => ({
              resumeData: { ...state.resumeData, summary },
            }),
            false,
            "updateSummary"
          ),

        // Experience
        addExperience: (experience) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                experience: [
                  ...state.resumeData.experience,
                  {
                    id: generateId(),
                    company: "",
                    role: "",
                    location: "",
                    startDate: "",
                    endDate: "",
                    current: false,
                    description: [""],
                    ...experience,
                  },
                ],
              },
            }),
            false,
            "addExperience"
          ),

        updateExperience: (id, data) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                experience: state.resumeData.experience.map((exp) =>
                  exp.id === id ? { ...exp, ...data } : exp
                ),
              },
            }),
            false,
            "updateExperience"
          ),

        removeExperience: (id) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                experience: state.resumeData.experience.filter((exp) => exp.id !== id),
              },
            }),
            false,
            "removeExperience"
          ),

        reorderExperience: (fromIndex, toIndex) =>
          set(
            (state) => {
              const experience = [...state.resumeData.experience];
              const [removed] = experience.splice(fromIndex, 1);
              experience.splice(toIndex, 0, removed);
              return {
                resumeData: { ...state.resumeData, experience },
              };
            },
            false,
            "reorderExperience"
          ),

        // Education
        addEducation: (education) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                education: [
                  ...state.resumeData.education,
                  {
                    id: generateId(),
                    institution: "",
                    degree: "",
                    field: "",
                    location: "",
                    startDate: "",
                    endDate: "",
                    gpa: "",
                    achievements: [],
                    ...education,
                  },
                ],
              },
            }),
            false,
            "addEducation"
          ),

        updateEducation: (id, data) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                education: state.resumeData.education.map((edu) =>
                  edu.id === id ? { ...edu, ...data } : edu
                ),
              },
            }),
            false,
            "updateEducation"
          ),

        removeEducation: (id) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                education: state.resumeData.education.filter((edu) => edu.id !== id),
              },
            }),
            false,
            "removeEducation"
          ),

        // Skills
        addSkill: (skill) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                skills: state.resumeData.skills.includes(skill)
                  ? state.resumeData.skills
                  : [...state.resumeData.skills, skill],
              },
            }),
            false,
            "addSkill"
          ),

        removeSkill: (skill) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                skills: state.resumeData.skills.filter((s) => s !== skill),
              },
            }),
            false,
            "removeSkill"
          ),

        setSkills: (skills) =>
          set(
            (state) => ({
              resumeData: { ...state.resumeData, skills },
            }),
            false,
            "setSkills"
          ),

        // Projects
        addProject: (project) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                projects: [
                  ...state.resumeData.projects,
                  {
                    id: generateId(),
                    name: "",
                    description: "",
                    technologies: [],
                    link: "",
                    bullets: [""],
                    ...project,
                  },
                ],
              },
            }),
            false,
            "addProject"
          ),

        updateProject: (id, data) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                projects: state.resumeData.projects.map((proj) =>
                  proj.id === id ? { ...proj, ...data } : proj
                ),
              },
            }),
            false,
            "updateProject"
          ),

        removeProject: (id) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                projects: state.resumeData.projects.filter((proj) => proj.id !== id),
              },
            }),
            false,
            "removeProject"
          ),

        // Certifications
        addCertification: (cert) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                certifications: [
                  ...state.resumeData.certifications,
                  {
                    id: generateId(),
                    name: "",
                    issuer: "",
                    date: "",
                    link: "",
                    ...cert,
                  },
                ],
              },
            }),
            false,
            "addCertification"
          ),

        updateCertification: (id, data) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                certifications: state.resumeData.certifications.map((cert) =>
                  cert.id === id ? { ...cert, ...data } : cert
                ),
              },
            }),
            false,
            "updateCertification"
          ),

        removeCertification: (id) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                certifications: state.resumeData.certifications.filter(
                  (cert) => cert.id !== id
                ),
              },
            }),
            false,
            "removeCertification"
          ),

        // Languages
        addLanguage: (language) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                languages: state.resumeData.languages.includes(language)
                  ? state.resumeData.languages
                  : [...state.resumeData.languages, language],
              },
            }),
            false,
            "addLanguage"
          ),

        removeLanguage: (language) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                languages: state.resumeData.languages.filter((l) => l !== language),
              },
            }),
            false,
            "removeLanguage"
          ),

        setLanguages: (languages) =>
          set(
            (state) => ({
              resumeData: { ...state.resumeData, languages },
            }),
            false,
            "setLanguages"
          ),

        // Custom Sections
        addCustomSection: (title) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                customSections: [
                  ...state.resumeData.customSections,
                  {
                    id: generateId(),
                    title: title || "New Section",
                    items: [],
                  },
                ],
              },
            }),
            false,
            "addCustomSection"
          ),

        updateCustomSection: (id, data) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                customSections: state.resumeData.customSections.map((section) =>
                  section.id === id ? { ...section, ...data } : section
                ),
              },
            }),
            false,
            "updateCustomSection"
          ),

        removeCustomSection: (id) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                customSections: state.resumeData.customSections.filter(
                  (section) => section.id !== id
                ),
              },
            }),
            false,
            "removeCustomSection"
          ),

        addCustomSectionItem: (sectionId, text) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                customSections: state.resumeData.customSections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        items: [
                          ...section.items,
                          { id: generateId(), text: text || "" },
                        ],
                      }
                    : section
                ),
              },
            }),
            false,
            "addCustomSectionItem"
          ),

        updateCustomSectionItem: (sectionId, itemId, text) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                customSections: state.resumeData.customSections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        items: section.items.map((item) =>
                          item.id === itemId ? { ...item, text } : item
                        ),
                      }
                    : section
                ),
              },
            }),
            false,
            "updateCustomSectionItem"
          ),

        removeCustomSectionItem: (sectionId, itemId) =>
          set(
            (state) => ({
              resumeData: {
                ...state.resumeData,
                customSections: state.resumeData.customSections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        items: section.items.filter((item) => item.id !== itemId),
                      }
                    : section
                ),
              },
            }),
            false,
            "removeCustomSectionItem"
          ),

        // Bulk Actions
        setResumeData: (data) =>
          set({ resumeData: data }, false, "setResumeData"),

        resetResume: () =>
          set({ resumeData: initialResumeState, currentStep: 0 }, false, "resetResume"),
      }),
      {
        name: "resume-storage", // localStorage key
        merge: (persistedState, currentState) => {
          // Deep merge to ensure new fields are added to old stored data
          const persisted = persistedState as Partial<ResumeStore> || {};
          return {
            ...currentState,
            ...persisted,
            resumeData: {
              ...currentState.resumeData,
              ...(persisted.resumeData || {}),
              // Ensure arrays exist (for backward compatibility)
              experience: persisted.resumeData?.experience || currentState.resumeData.experience,
              education: persisted.resumeData?.education || currentState.resumeData.education,
              skills: persisted.resumeData?.skills || currentState.resumeData.skills,
              projects: persisted.resumeData?.projects || currentState.resumeData.projects,
              certifications: persisted.resumeData?.certifications || currentState.resumeData.certifications,
              languages: persisted.resumeData?.languages || currentState.resumeData.languages,
              customSections: persisted.resumeData?.customSections || currentState.resumeData.customSections,
              personalInfo: {
                ...currentState.resumeData.personalInfo,
                ...(persisted.resumeData?.personalInfo || {}),
              },
            },
          };
        },
      }
    ),
    { name: "ResumeStore" }
  )
);
