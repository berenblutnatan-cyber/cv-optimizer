// @vitest-environment happy-dom
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { hasEnglish } from "@/test/guards/jsx-literals";
import type { JobDetail, JobSummary } from "@/lib/jobs/types";
import type { PublicInterview } from "@/lib/interview/store";
import { JobsBoard } from "@/components/v2/jobs/JobsBoard";
import { AccountView, type AccountData } from "@/components/v2/billing/AccountView";
import { InterviewSetup } from "@/components/v2/interview/InterviewSetup";
import { InterviewRoom } from "@/components/v2/interview/InterviewRoom";
import { Debrief } from "@/components/v2/interview/Debrief";

// The signed-in screens rendered in Hebrew with Hebrew data: any Latin text
// left on screen (text, aria-label, title, placeholder) is UI that skipped t().
// Complements the source guard, which can't see strings built at runtime.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));
vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: null }), useAuth: () => ({ isSignedIn: true }) }));
vi.mock("@/lib/voice/support", () => ({ readVoiceSupport: () => "ok" }));

const he = (ui: React.ReactNode, lang: "he" | "en" = "he") =>
  render(
    <LanguageProvider initialLang={lang} applyToDocument={false}>
      <TooltipProvider>{ui}</TooltipProvider>
    </LanguageProvider>,
  );

/** Every piece of Latin text a person could read or hear, outside the CV document itself. */
function englishOnScreen(): string[] {
  const out = new Set<string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    const s = n.textContent?.trim() ?? "";
    if (!s || !el || el.closest("script,style,.cv-doc")) continue;
    if (hasEnglish(s)) out.add(s);
  }
  for (const el of document.querySelectorAll("[aria-label],[title],[placeholder],[alt]"))
    for (const a of ["aria-label", "title", "placeholder", "alt"]) {
      const v = el.getAttribute(a);
      if (v && hasEnglish(v.replace(/https?:\/\/\S*/g, ""))) out.add(`${a}: ${v}`);
    }
  return [...out];
}

/** The screen rendered real content, and none of it is English. */
function expectHebrewOnly() {
  const visible = [...document.body.querySelectorAll("*")].filter((e) => !e.closest("script,style")).map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("")).join("");
  expect((visible.match(/[\u0590-\u05FF]/g) ?? []).length).toBeGreaterThan(20);
  expect(englishOnScreen()).toEqual([]);
}

const now = new Date().toISOString();
const job: JobSummary = {
  id: "job_1",
  company: "גלובקס",
  title: "מנהלת מוצר",
  stage: "APPLIED",
  url: "https://example.com/job",
  location: "תל אביב",
  resumeId: "cv_1",
  resumeTitle: "",
  score: 72,
  nextStep: "שיחה עם המגייסת",
  nextStepAt: now,
  updatedAt: now,
};
const detail: JobDetail = {
  ...job,
  jdText: "מנהלת מוצר בכירה לתשלומים. ניסיון של חמש שנים לפחות בניהול מוצר, בדיקות ושיתוף פעולה עם צוותי פיתוח ועיצוב.",
  salary: null,
  notes: null,
  appliedAt: now,
  tailorings: [{ id: "tl_1", resumeId: "cv_1", scoreOriginal: 64, scoreOptimized: 82, createdAt: now }],
  interviews: [{ id: "iv_1", status: "done", mode: "voice", overall: 71, createdAt: now }],
  letter: null,
};
const QUESTIONS = [
  { text: "ספרו על הדרך שלכם לתשלומים.", kind: "opener" as const, focus: "סיפור" },
  { text: "ספרו על שיפור המרה.", kind: "behavioral" as const, focus: "ניסויים" },
];
const REPORT = {
  overall: 71,
  summary: "מספרים ברורים. ציינו את התפקיד שלכם.",
  answers: [{ index: 0, score: 8, worked: ["תוצאה מדויקת"], missing: ["התפקיד שלכם"], stronger: "הובלתי…", addToCv: { experienceIndex: 0, company: "אקמה", role: "מנהלת מוצר", bullet: "הורדתי נטישה ב-18%", quote: "הורדנו נטישה ב-18 אחוז" } }],
};
const iv = (over: Partial<PublicInterview> = {}): PublicInterview => ({
  id: "iv_1",
  resumeId: "cv_1",
  tailoringId: null,
  jobTitle: "מנהלת מוצר",
  company: "גלובקס",
  mode: "voice",
  status: "ready",
  questions: QUESTIONS,
  answers: [],
  report: null,
  appliedAdds: [],
  refunded: false,
  error: null,
  createdAt: now,
  ...over,
});

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k), clear: () => store.clear() });
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("min-width"), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
      if (url.startsWith("/api/jobs/job_1")) return json({ job: detail });
      return json({});
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("signed-in screens in Hebrew", () => {
  it("the check catches English (same screens in English)", async () => {
    he(<JobsBoard initialJobs={[job]} cvs={[{ id: "cv_1", title: "" }]} openId="job_1" />, "en");
    await act(async () => {});
    await screen.findAllByText("גלובקס");
    const found = englishOnScreen();
    expect(found.length).toBeGreaterThan(10);
    // The drawer is open with its tabs, not just the board behind it.
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Details");
  });

  it("jobs: table, board, add dialog and the drawer", async () => {
    he(<JobsBoard initialJobs={[job]} cvs={[{ id: "cv_1", title: "" }]} openId="job_1" />);
    await act(async () => {});
    await screen.findAllByText("גלובקס");
    expectHebrewOnly();
    for (const tab of ["מכתב", "אימון"]) {
      const el = screen.getAllByRole("tab").find((b) => b.textContent?.includes(tab))!;
      await act(async () => void fireEvent.mouseDown(el));
      await act(async () => void fireEvent.click(el));
      expect(el.getAttribute("aria-selected")).toBe("true");
      expectHebrewOnly();
    }
  });

  it("jobs: empty", async () => {
    he(<JobsBoard initialJobs={[]} cvs={[]} openId={null} />);
    await act(async () => {});
    expectHebrewOnly();
  });

  it("account: credits, activity and the redeem form", async () => {
    const data: AccountData = {
      balance: { credits: 3, unlimited: false, plan: null, periodEnd: null, status: null },
      ledger: [
        { id: "l1", delta: 3, balanceAfter: 3, reason: "signup", refType: null, refId: null, createdAt: now },
        { id: "l2", delta: -1, balanceAfter: 2, reason: "interview", refType: null, refId: null, createdAt: now },
        { id: "l3", delta: 1, balanceAfter: 3, reason: "refund", refType: null, refId: null, createdAt: now },
      ],
      purchases: [],
    };
    he(<AccountView initial={data} portalUnavailable />);
    expect(screen.getByText("קרדיט ברוכים הבאים")).toBeTruthy();
    expectHebrewOnly();
    fireEvent.click(screen.getByRole("button", { name: /מימוש קוד/ }));
    expectHebrewOnly();
  });

  it("account: unlimited, empty activity", () => {
    he(<AccountView initial={{ balance: { credits: 2, unlimited: true, plan: null, periodEnd: now, status: "active" }, ledger: [], purchases: [] }} />);
    expectHebrewOnly();
  });

  it("interview: setup", () => {
    he(
      <InterviewSetup
        cvs={[{ id: "cv_1", title: "" }]}
        jobs={[{ id: "job_1", cvId: "cv_1", jobTitle: "מנהלת מוצר", company: "גלובקס" }]}
        initial={{ cvId: "cv_1", tailoringId: null, jd: "", jobTitle: "", company: "" }}
        voiceAvailable
        balance={0}
        unlimited={false}
        voiceOverFairUse={false}
      />,
    );
    expectHebrewOnly();
  });

  it("interview: room, ready and typed", () => {
    he(<InterviewRoom initial={iv()} />);
    expectHebrewOnly();
    cleanup();
    he(<InterviewRoom initial={iv({ mode: "text" })} />);
    expectHebrewOnly();
  });

  it("interview: scoring and failed", () => {
    he(<InterviewRoom initial={iv({ status: "scoring" })} />);
    expectHebrewOnly();
    cleanup();
    he(<InterviewRoom initial={iv({ status: "failed", refunded: true })} />);
    expectHebrewOnly();
  });

  it("interview: debrief", () => {
    he(<Debrief id="iv_1" resumeId="cv_1" questions={QUESTIONS} answers={[{ index: 0, text: "באקמה הורדנו נטישה ב-18 אחוז." }]} report={REPORT} appliedAdds={[]} againHref="/interview/new" />);
    expectHebrewOnly();
  });
});
