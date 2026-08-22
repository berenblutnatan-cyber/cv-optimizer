// Fixtures for the review apply-path eval.
//
// REVIEW_RESPONSE below is a REAL, unedited emit_review response captured from
// claude-opus-4-8 against OVERLONG_CV on 2026-08-12 (POST /api/review, anon,
// overflowLines: 6). Recording real output rather than hand-writing a tidy one
// is deliberate: the bugs this suite exists to catch — output split across six
// tool_use blocks, indices that shift as earlier cuts apply — only show up in
// what the model actually emits.
//
// Regenerate by POSTing OVERLONG_CV to /api/review and pasting the response.

import type { ResumeData } from "@/types/resume";
import type { ReviewResult } from "@/lib/review/types";

export const OVERLONG_CV: ResumeData = {
  "personalInfo": {
    "name": "Dana Levi",
    "email": "dana.levi@example.com",
    "phone": "+972 50 123 4567",
    "linkedin": "linkedin.com/in/danalevi",
    "website": "",
    "location": "Tel Aviv",
    "title": "Product Analyst"
  },
  "summary": "Hardworking professional seeking new opportunities in a challenging environment where I can grow and utilize my skills.",
  "experience": [
    {
      "id": "exp-1",
      "company": "Northwind Retail",
      "role": "Senior Product Analyst",
      "location": "Tel Aviv",
      "startDate": "2021",
      "endDate": "Present",
      "current": true,
      "description": [
        "Responsible for various reporting duties across the product organization",
        "Rebuilt the onboarding funnel analysis which contributed to a 22% increase in activation",
        "Worked closely with stakeholders on a range of different projects and initiatives",
        "Helped with dashboards and reporting as needed by the business",
        "Built the weekly experimentation review that now gates every product launch",
        "Participated in various meetings and cross-functional discussions"
      ]
    },
    {
      "id": "exp-2",
      "company": "Kettle Labs",
      "role": "Product Analyst",
      "location": "Haifa",
      "startDate": "2019",
      "endDate": "2021",
      "current": false,
      "description": [
        "Was tasked with maintaining data quality across several internal systems",
        "Created reports for the management team on a regular basis",
        "Designed and shipped the retention cohort model still used by the growth team",
        "Assisted with ad-hoc analysis requests from various departments"
      ]
    },
    {
      "id": "exp-3",
      "company": "Bluewave Consulting",
      "role": "Junior Analyst",
      "location": "Tel Aviv",
      "startDate": "2017",
      "endDate": "2019",
      "current": false,
      "description": [
        "Duties included data entry and spreadsheet maintenance",
        "Supported senior analysts with various tasks",
        "Attended client meetings and took notes"
      ]
    },
    {
      "id": "exp-4",
      "company": "IDF",
      "role": "Intelligence NCO",
      "location": "Israel",
      "startDate": "2014",
      "endDate": "2017",
      "current": false,
      "description": [
        "Served in an intelligence unit performing various duties",
        "Was responsible for shift coordination and reporting"
      ]
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "institution": "Technion",
      "degree": "BSc",
      "field": "Industrial Engineering & Management",
      "location": "Haifa",
      "startDate": "2017",
      "endDate": "2021",
      "gpa": "88",
      "achievements": [
        "Dean's List 2019",
        "Teaching Assistant, Introduction to Statistics",
        "Relevant coursework: Data Mining, Operations Research, Stochastic Models"
      ]
    }
  ],
  "skills": [
    "SQL",
    "Python",
    "Excel",
    "Tableau",
    "Amplitude",
    "A/B testing"
  ],
  "projects": [],
  "certifications": [],
  "languages": [
    "Hebrew",
    "English"
  ],
  "customSections": []
};

export const REVIEW_JOB_TITLE = "Senior Product Analyst";
export const REVIEW_OVERFLOW_LINES = 6;

export const REVIEW_RESPONSE: ReviewResult = {
  "score": 76,
  "band": "strong",
  "message": {
    "readsAs": "You read as a genuine Senior Product Analyst with two or three real wins buried under a pile of vague duty-listing filler that makes you look junior."
  },
  "strengths": [
    {
      "title": "Direct senior title match",
      "evidence": "Senior Product Analyst @ Northwind Retail (2021 – Present) matches the target role exactly"
    },
    {
      "title": "Quantified activation win",
      "evidence": "Rebuilt onboarding funnel analysis contributing to 22% increase in activation"
    },
    {
      "title": "Owns launch-gating process",
      "evidence": "Built the weekly experimentation review that now gates every product launch"
    }
  ],
  "advice": [
    {
      "id": "ai:summary",
      "source": "ai",
      "target": {
        "kind": "summary",
        "hash": "109a024"
      },
      "verdict": "rewrite",
      "category": "clarity",
      "title": "Sharpen your summary",
      "reason": "Generic 'hardworking professional' opener says nothing and wastes prime space.",
      "before": "Hardworking professional seeking new opportunities in a challenging environment where I can grow and utilize my skills.",
      "after": "Senior Product Analyst with 5+ years turning product data into growth — rebuilt an onboarding funnel that lifted activation 22% and owns the experimentation review gating every launch. SQL, Python, Amplitude, A/B testing.",
      "scoreImpact": 8
    },
    {
      "id": "ai:experience:0.0",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-1",
        "entryIndex": 0,
        "bulletIndex": 0,
        "hash": "194vplx"
      },
      "verdict": "cut",
      "severity": "medium",
      "title": "Cut vague reporting-duties line",
      "reason": "'Various reporting duties' signals no ownership and buries your real wins.",
      "before": "Responsible for various reporting duties across the product organization",
      "scoreImpact": 4,
      "linesSaved": 1
    },
    {
      "id": "ai:experience:0.3",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-1",
        "entryIndex": 0,
        "bulletIndex": 3,
        "hash": "b82rek"
      },
      "verdict": "rewrite",
      "severity": "high",
      "title": "Sharpen dashboard line",
      "reason": "'Helped with... as needed' hides real deliverables behind passive language.",
      "before": "Helped with dashboards and reporting as needed by the business",
      "after": "Built and maintained product dashboards used by the business for ongoing performance tracking.",
      "scoreImpact": 4
    },
    {
      "id": "ai:experience:0.2",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-1",
        "entryIndex": 0,
        "bulletIndex": 2,
        "hash": "16ai232"
      },
      "verdict": "cut",
      "severity": "medium",
      "title": "Cut empty stakeholder filler",
      "reason": "'Range of different projects' names nothing and reads as padding.",
      "before": "Worked closely with stakeholders on a range of different projects and initiatives",
      "scoreImpact": 3,
      "linesSaved": 1
    },
    {
      "id": "ai:experience:0.5",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-1",
        "entryIndex": 0,
        "bulletIndex": 5,
        "hash": "4215rj"
      },
      "verdict": "cut",
      "severity": "medium",
      "title": "Cut meeting-attendance line",
      "reason": "Attending meetings is not an achievement and weakens a senior profile.",
      "before": "Participated in various meetings and cross-functional discussions",
      "scoreImpact": 3,
      "linesSaved": 1
    },
    {
      "id": "ai:experience:1.1",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-2",
        "entryIndex": 1,
        "bulletIndex": 1,
        "hash": "1hbjh7e"
      },
      "verdict": "cut",
      "severity": "medium",
      "title": "Cut routine reporting line",
      "reason": "'Reports on a regular basis' is a duty, not an outcome.",
      "before": "Created reports for the management team on a regular basis",
      "scoreImpact": 3,
      "linesSaved": 1
    },
    {
      "id": "ai:experience:1.3",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-2",
        "entryIndex": 1,
        "bulletIndex": 3,
        "hash": "1v0utg1"
      },
      "verdict": "cut",
      "severity": "medium",
      "title": "Cut ad-hoc requests filler",
      "reason": "'Various departments' adds nothing and duplicates other support lines.",
      "before": "Assisted with ad-hoc analysis requests from various departments",
      "scoreImpact": 3,
      "linesSaved": 1
    },
    {
      "id": "ai:experience:2.0",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-3",
        "entryIndex": 2,
        "bulletIndex": 0,
        "hash": "w91x4l"
      },
      "verdict": "cut",
      "severity": "medium",
      "title": "Cut data-entry duties",
      "reason": "Data entry from a 2017 role drags your seniority down.",
      "before": "Duties included data entry and spreadsheet maintenance",
      "scoreImpact": 3,
      "linesSaved": 1
    },
    {
      "id": "ai:experience:1.0",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-2",
        "entryIndex": 1,
        "bulletIndex": 0,
        "hash": "swavpo"
      },
      "verdict": "rewrite",
      "severity": "high",
      "title": "Reframe data-quality line",
      "reason": "'Was tasked with' is passive and undersells the work.",
      "before": "Was tasked with maintaining data quality across several internal systems",
      "after": "Maintained data quality across several internal systems, ensuring reliable inputs for reporting.",
      "scoreImpact": 3
    },
    {
      "id": "ai:experience:3.0",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-4",
        "entryIndex": 3,
        "bulletIndex": 0,
        "hash": "1otl8af"
      },
      "verdict": "rewrite",
      "severity": "high",
      "title": "Give IDF role real content",
      "reason": "'Various duties' wastes a credibility-building intelligence role.",
      "before": "Served in an intelligence unit performing various duties",
      "after": "Served in an IDF intelligence unit, analyzing data and producing time-sensitive reports for operational decisions.",
      "scoreImpact": 3
    },
    {
      "id": "ai:experience:2.1",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-3",
        "entryIndex": 2,
        "bulletIndex": 1,
        "hash": "vktqdx"
      },
      "verdict": "cut",
      "severity": "medium",
      "title": "Cut 'supported various tasks'",
      "reason": "Zero-signal filler on an old junior role.",
      "before": "Supported senior analysts with various tasks",
      "scoreImpact": 2,
      "linesSaved": 1
    },
    {
      "id": "ai:experience:3.1",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-4",
        "entryIndex": 3,
        "bulletIndex": 1,
        "hash": "ciscvl"
      },
      "verdict": "cut",
      "severity": "medium",
      "title": "Cut shift-coordination line",
      "reason": "Administrative detail from 2014 adds nothing to a senior analyst pitch.",
      "before": "Was responsible for shift coordination and reporting",
      "scoreImpact": 2,
      "linesSaved": 1
    },
    {
      "id": "ai:experience:2.2",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-3",
        "entryIndex": 2,
        "bulletIndex": 2,
        "hash": "ihg8ua"
      },
      "verdict": "rewrite",
      "severity": "high",
      "title": "Tighten remaining Bluewave line",
      "reason": "Note-taking alone is weak; keep one compressed line so the entry survives.",
      "before": "Attended client meetings and took notes",
      "after": "Supported senior analysts in client engagements, contributing to analysis and meeting deliverables.",
      "scoreImpact": 2
    },
    {
      "id": "ai:experience:0.1",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-1",
        "entryIndex": 0,
        "bulletIndex": 1,
        "hash": "1r33dgi"
      },
      "verdict": "keep",
      "severity": "high",
      "title": "Keep activation win",
      "reason": "Quantified outcome tied to ownership — your strongest line.",
      "before": "Rebuilt the onboarding funnel analysis which contributed to a 22% increase in activation",
      "scoreImpact": 0
    },
    {
      "id": "ai:experience:0.4",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-1",
        "entryIndex": 0,
        "bulletIndex": 4,
        "hash": "1afokat"
      },
      "verdict": "keep",
      "severity": "high",
      "title": "Keep experimentation review",
      "reason": "Shows process ownership at company scale.",
      "before": "Built the weekly experimentation review that now gates every product launch",
      "scoreImpact": 0
    },
    {
      "id": "ai:experience:1.2",
      "source": "ai",
      "target": {
        "kind": "bullet",
        "section": "experience",
        "entryId": "exp-2",
        "entryIndex": 1,
        "bulletIndex": 2,
        "hash": "vgzm48"
      },
      "verdict": "keep",
      "severity": "high",
      "title": "Keep retention cohort model",
      "reason": "Durable, named deliverable still in use — strong evidence.",
      "before": "Designed and shipped the retention cohort model still used by the growth team",
      "scoreImpact": 0
    }
  ],
  "keywords": {
    "present": [
      "SQL",
      "Python",
      "A/B testing",
      "Amplitude",
      "Tableau",
      "onboarding funnel",
      "retention cohort",
      "experimentation",
      "activation"
    ],
    "missing": [
      "product metrics / KPIs",
      "SQL data modeling",
      "stakeholder management",
      "dbt / data pipelines",
      "segmentation",
      "funnel optimization",
      "conversion rate",
      "hypothesis testing"
    ]
  },
  "linesToCut": 6
};
