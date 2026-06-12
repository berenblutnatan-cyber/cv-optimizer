import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { ResumeData } from "@/types/resume";
import { initialResumeState } from "@/types/resume";

export const dynamic = "force-dynamic";

// CVs are a few KB of JSON; 200KB means something is wrong (e.g. a base64
// photo gone wild) — reject instead of bloating rows.
const MAX_JSON_BYTES = 200 * 1024;

// Coerce arbitrary JSON into the ResumeData shape: required keys exist, all
// arrays are arrays. Anything extra rides along untouched — the client store
// performs its own merge on load.
function sanitize(raw: unknown): ResumeData {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<ResumeData>;
  const arr = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : []);
  return {
    ...initialResumeState,
    ...o,
    personalInfo: { ...initialResumeState.personalInfo, ...(o.personalInfo ?? {}) },
    summary: typeof o.summary === "string" ? o.summary : "",
    experience: arr(o.experience),
    education: arr(o.education),
    skills: arr(o.skills),
    projects: arr(o.projects),
    certifications: arr(o.certifications),
    languages: arr(o.languages),
    customSections: arr(o.customSections),
  };
}

// GET /api/resume — the signed-in user's saved CV (latest), or null.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const row = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { data: true, template: true, themeColor: true, updatedAt: true },
    });
    return NextResponse.json({
      resumeData: row ? sanitize(row.data) : null,
      template: row?.template ?? null,
      themeColor: row?.themeColor ?? null,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (err) {
    console.error("[resume] GET failed:", err);
    return NextResponse.json({ error: "Failed to load resume" }, { status: 500 });
  }
}

// PUT /api/resume — upsert the user's single saved CV.
export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { resumeData?: unknown; template?: string; themeColor?: string };
  try {
    const text = await request.text();
    if (text.length > MAX_JSON_BYTES) {
      return NextResponse.json({ error: "Resume too large" }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.resumeData || typeof body.resumeData !== "object") {
    return NextResponse.json({ error: "Missing resumeData" }, { status: 400 });
  }

  const data = sanitize(body.resumeData);
  const title = data.personalInfo.name.trim()
    ? `${data.personalInfo.name.trim()} — CV`
    : "My CV";
  const template = typeof body.template === "string" ? body.template.slice(0, 50) : "ivy-league";
  const themeColor = typeof body.themeColor === "string" ? body.themeColor.slice(0, 30) : null;

  try {
    // The Resume table predates this route and has no unique on userId, so
    // emulate upsert-latest: update the newest row or create the first one.
    const existing = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    // The user must exist for the FK; resume saves can race the first
    // sync-user call on a brand-new account.
    if (!existing) {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: "no-email", credits: 2 },
      });
    }
    const row = existing
      ? await prisma.resume.update({
          where: { id: existing.id },
          data: { data: data as object, title, template, themeColor },
        })
      : await prisma.resume.create({
          data: { userId, data: data as object, title, template, themeColor },
        });
    return NextResponse.json({ ok: true, updatedAt: row.updatedAt });
  } catch (err) {
    console.error("[resume] PUT failed:", err);
    return NextResponse.json({ error: "Failed to save resume" }, { status: 500 });
  }
}
