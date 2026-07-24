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
import type { GoalWeighting } from "@/lib/optimizer/localChecks";

interface ResumeStore {
  // State
  resumeData: ResumeData;
  currentStep: number;
  // What the user optimizes for (from the onboarding funnel). Shifts the live
  // Resume Score weighting (ATS-heavy vs recruiter-heavy). Kept OFF ResumeData
  // so the CV payload sent to the AI / persisted in chats stays clean.
  scoringGoal: GoalWeighting;
  // Undo/redo snapshot stacks. EVERY mutation that replaces `resumeData` —
  // manual field edits, AI tool calls (they all flow through `setResumeData`),
  // resets, session loads — pushes the previous snapshot onto `past`, so the
  // toolbar Undo/Redo buttons are real, not decoys. Not persisted.
  past: ResumeData[];
  future: ResumeData[];

  // History Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

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
  setScoringGoal: (goal: GoalWeighting) => void;
  resetResume: () => void;
}

// Undo history tuning: cap the stack so localStorage/memory can't balloon, and
// coalesce rapid same-action updates (per-keystroke typing in the inline
// editor) into one undo step so Undo steps back a burst of typing, not one
// character at a time.
const HISTORY_LIMIT = 50;
const HISTORY_COALESCE_MS = 1000;
let lastSnapshotAt = 0;
let lastSnapshotAction = "";

/**
 * History-aware patch: when a mutation replaces `resumeData`, push the previous
 * snapshot onto the undo stack (deduping identical snapshots, capping at
 * HISTORY_LIMIT) and clear the redo stack. Applied to EVERY `set` in the store,
 * so the whole class of "irreversible edit" is impossible — any path that
 * mutates the CV (manual edits, AI tool calls, resets) is undoable.
 */
function withHistory(
  state: ResumeStore,
  patch: Partial<ResumeStore>,
  action: string
): Partial<ResumeStore> {
  const next = patch.resumeData;
  if (!next || next === state.resumeData) return patch;
  // Dedupe: a "mutation" that produced an identical document is not an undo step.
  if (JSON.stringify(next) === JSON.stringify(state.resumeData)) return patch;
  const now = Date.now();
  const coalesce =
    action === lastSnapshotAction &&
    now - lastSnapshotAt < HISTORY_COALESCE_MS &&
    state.past.length > 0;
  lastSnapshotAt = now;
  lastSnapshotAction = action;
  if (coalesce) return { ...patch, future: [] };
  return {
    ...patch,
    past: [...state.past, state.resumeData].slice(-HISTORY_LIMIT),
    future: [],
  };
}

export const useResumeStore = create<ResumeStore>()(
  devtools(
    persist(
      (rawSet, get) => {
        // Shadow `set` so every existing action below transparently records
        // undo history when it touches `resumeData` (see withHistory).
        const set: typeof rawSet = ((
          partial: unknown,
          replace?: unknown,
          action?: unknown
        ) =>
          (rawSet as (p: unknown, r?: unknown, a?: unknown) => void)(
            (state: ResumeStore) =>
              withHistory(
                state,
                (typeof partial === "function"
                  ? (partial as (s: ResumeStore) => Partial<ResumeStore>)(state)
                  : partial) as Partial<ResumeStore>,
                String(action ?? "")
              ),
            replace,
            action
          )) as typeof rawSet;

        return {
        // Initial State
        resumeData: initialResumeState,
        currentStep: 0,
        scoringGoal: "both",
        past: [],
        future: [],

        // History
        undo: () => {
          // Break typing-coalescing so the next edit after an undo starts a
          // fresh undo step.
          lastSnapshotAction = "";
          rawSet(
            (state) => {
              const prev = state.past[state.past.length - 1];
              if (!prev) return {};
              return {
                resumeData: prev,
                past: state.past.slice(0, -1),
                future: [state.resumeData, ...state.future].slice(0, HISTORY_LIMIT),
              };
            },
            false,
            "undo"
          );
        },

        redo: () => {
          lastSnapshotAction = "";
          rawSet(
            (state) => {
              const [next, ...rest] = state.future;
              if (!next) return {};
              return {
                resumeData: next,
                past: [...state.past, state.resumeData].slice(-HISTORY_LIMIT),
                future: rest,
              };
            },
            false,
            "redo"
          );
        },

        canUndo: () => get().past.length > 0,
        canRedo: () => get().future.length > 0,

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

        setScoringGoal: (goal) =>
          set({ scoringGoal: goal }, false, "setScoringGoal"),

        resetResume: () =>
          set({ resumeData: initialResumeState, currentStep: 0 }, false, "resetResume"),
        };
      },
      {
        name: "resume-storage", // localStorage key
        // Undo/redo stacks are session-local — don't bloat localStorage with
        // up to 50 CV snapshots on every keystroke.
        partialize: (state) => ({
          resumeData: state.resumeData,
          currentStep: state.currentStep,
          scoringGoal: state.scoringGoal,
        }),
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
