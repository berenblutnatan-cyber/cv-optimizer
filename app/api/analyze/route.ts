import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractCvFileText } from "@/lib/cvFileText";
import { fetchJobDescription } from "@/lib/jobFetcher";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sendOptimizeNotification } from "@/lib/email";
import { getPostHogClient } from "@/lib/posthog-server";
import { prisma } from "@/lib/prisma";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";
import { hasActiveSubscription } from "@/lib/subscription";
// The 3-pass deep-analysis pipeline (lib/optimizer/pipeline.ts) is exercised
// by the eval harness (npm run eval:optimizer) — the route and the eval run
// the EXACT same code.
import { runOptimizerPipeline, resolveEffectiveJobTitle, PipelineError } from "@/lib/optimizer/pipeline";
import { seniorityFromExperience } from "@/lib/knowledge";
import type { DeepAnalysis } from "@/lib/optimizer/types";
import type { AnalyzeStreamEvent } from "@/lib/optimizer/stream";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Three sequential model calls (parse → audit → rewrite) run 60-90s total.
// The response is an SSE stream (first bytes flush immediately), so the
// gateway never sees an idle request — but the function itself needs the
// headroom or it's killed mid-pipeline. Verify the deployment plan honors
// >60s before shipping (past 504 bug territory).
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Fire a server-side optimize_failed event so failures stay visible in PostHog
// even when the client never reports them (e.g. user closes the tab on error).
function fireOptimizeFailedServer(
  userId: string,
  reason: "truncated" | "parse_error" | "no_json" | "model_error" | "persist_error",
  props: Record<string, unknown> = {}
) {
  try {
    const ph = getPostHogClient();
    if (!ph) return;
    ph.capture({
      distinctId: userId,
      event: "optimize_failed_server",
      properties: { failure_reason: reason, ...props },
    });
    void ph.shutdown();
  } catch (err) {
    console.error("[analyze] failed to fire optimize_failed_server:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing required environment variable: ANTHROPIC_API_KEY" },
        { status: 500 }
      );
    }

    // ── Pre-flight (plain JSON errors — the stream hasn't started) ──────────
    // Auth + credits are enforced HERE, not by a separate client-side
    // /api/use-credit call — otherwise skipping that call gives unlimited free
    // optimizations. The optimizer UI already requires sign-in before calling.
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || "no-email";

    // Ensure the User row exists (mirrors /api/use-credit) and check the
    // balance up front so we don't burn Claude calls for a user with 0.
    // The actual decrement happens AFTER the work succeeds, in the same
    // transaction that persists the analysis — failures are never charged.
    const dbUser = await prisma.user.upsert({
      where: { id: userId },
      update: { email: userEmail },
      create: {
        id: userId,
        email: userEmail,
        credits: FREE_CREDITS_FOR_NEW_USER,
      },
    });
    // Unlimited subscribers skip the balance check (and the charge below).
    const unlimited = hasActiveSubscription(dbUser);
    if (!unlimited && dbUser.credits <= 0) {
      return NextResponse.json(
        { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    const formData = await request.formData();

    let cvText = (formData.get("cvText") as string) || "";
    const cvFile = formData.get("cv") as File | null;
    const mode = (formData.get("mode") as string) || "specific_role";
    const jobDescription = (formData.get("jobDescription") as string) || "";
    const jobUrl = (formData.get("jobUrl") as string) || "";
    const jobTitle = (formData.get("jobTitle") as string) || "";
    const companyName = (formData.get("companyName") as string) || "";

    // Parse AI Deep Dive answers if provided
    let deepDiveAnswers: { achievements: string; hiddenSkills: string; uniqueValue: string } | null = null;
    const deepDiveRaw = formData.get("deepDiveAnswers") as string;
    if (deepDiveRaw) {
      try {
        deepDiveAnswers = JSON.parse(deepDiveRaw);
      } catch {
        // Ignore parse errors
      }
    }

    const userSummary = (formData.get("summary") as string) || "";

    // Persona hints (optional — coaching degrades gracefully without them).
    const experienceLevel = (formData.get("experienceLevel") as string) || "";
    const seniority = seniorityFromExperience(experienceLevel);
    const goalRaw = (formData.get("goal") as string) || "";
    const goal = goalRaw === "ats" || goalRaw === "recruiter" || goalRaw === "both" ? goalRaw : null;

    // Extract text from the uploaded file (PDF / DOCX / plain text).
    if (cvFile && !cvText) {
      try {
        const result = await extractCvFileText(cvFile);
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: result.status });
        }
        cvText = result.text;
      } catch (parseError) {
        console.error("CV file parsing error:", parseError);
        return NextResponse.json(
          { error: "Failed to read that file. Please try pasting your CV text instead." },
          { status: 400 }
        );
      }
    }

    if (!cvText) {
      return NextResponse.json({ error: "No CV content provided" }, { status: 400 });
    }

    let finalJobDescription = jobDescription;
    if (jobUrl && !jobDescription) {
      const result = await fetchJobDescription(jobUrl, anthropic);
      if (!result.ok) {
        return NextResponse.json(
          result.hint ? { error: result.error, hint: result.hint } : { error: result.error },
          { status: result.status }
        );
      }
      finalJobDescription = result.description;
    }

    // Validation: Quick mode skips role requirement; targeted modes still need jobTitle or jobDescription.
    const isQuickMode = mode === "quick";
    const hasJobContext = finalJobDescription?.trim() || jobTitle?.trim();

    if (!isQuickMode && !hasJobContext) {
      return NextResponse.json(
        { error: "Please provide a Job Title, Job Description, or URL to continue." },
        { status: 400 }
      );
    }

    // ── Stream the pipeline ─────────────────────────────────────────────────
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (evt: AnalyzeStreamEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
          } catch {
            // Client disconnected — the pipeline keeps running so the charge
            // + persist still happen and the result lands in history.
          }
        };

        try {
          const analysis: DeepAnalysis = await runOptimizerPipeline(
            anthropic,
            {
              cvText,
              jobTitle,
              jobDescription: finalJobDescription,
              companyName,
              userSummary,
              deepDiveAnswers,
              mode: isQuickMode ? "quick" : "specific_role",
              seniority,
              goal,
            },
            {
              onStage: (stage) => send({ type: "stage", stage }),
              onAudit: (audit) => {
                const covered = audit.coverage.filter((c) => c.status !== "missing").length;
                send({
                  type: "audit",
                  overallScore: audit.originalScore.total,
                  summary: audit.summary,
                  strengths: audit.strengths,
                  requirementCount: audit.jdRequirements.length,
                  coveredCount: covered,
                  missingCount: audit.coverage.length - covered,
                });
              },
            }
          );

          const persistedJobTitle = resolveEffectiveJobTitle({
            cvText,
            jobTitle,
            jobDescription: finalJobDescription,
            companyName,
            mode: isQuickMode ? "quick" : "specific_role",
          });

          const meta = {
            mode: (isQuickMode ? "quick" : "specific_role") as "quick" | "specific_role",
            jobTitle: persistedJobTitle,
            jobUrl,
            companyName,
            cvTextUsed: cvText,
            jobDescriptionUsed: finalJobDescription || "",
          };

          // Charge the credit + persist the analysis in a single transaction so
          // a crash here never leaves a user billed without a result (or vice
          // versa). The decrement-then-guard handles concurrent requests racing
          // past the up-front balance check.
          let analysisId: string;
          try {
            const created = await prisma.$transaction(async (tx) => {
              if (!unlimited) {
                const updated = await tx.user.update({
                  where: { id: userId },
                  data: { credits: { decrement: 1 } },
                });
                if (updated.credits < 0) throw new Error("INSUFFICIENT_CREDITS");
              }
              return tx.analysis.create({
                data: {
                  userId,
                  cvText: cvText.slice(0, 60_000),
                  jobTitle: persistedJobTitle,
                  overallScore: Math.round(analysis.overallScore),
                  optimizedScore: Math.round(analysis.scoreComparison.optimized.total),
                  // meta rides inside raw so /results/[id] can regenerate the
                  // cover letter without a second source of truth.
                  raw: JSON.parse(JSON.stringify({ ...analysis, meta })),
                  improvements: {
                    create: analysis.improvements.map((imp, i) => ({
                      text: imp.text,
                      scoreImpact: imp.scoreImpact,
                      category: imp.category,
                      // All-in on the analysis credit: everything the user paid
                      // for is visible. (The blur/unlock economy is retired.)
                      unlocked: true,
                      position: i,
                    })),
                  },
                },
                select: { id: true },
              });
            });
            analysisId = created.id;
          } catch (persistErr) {
            if (persistErr instanceof Error && persistErr.message === "INSUFFICIENT_CREDITS") {
              send({ type: "error", error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" });
              controller.close();
              return;
            }
            console.error("[analyze] charge+persist transaction failed:", persistErr);
            fireOptimizeFailedServer(userId, "persist_error", {});
            send({
              type: "error",
              error: "Failed to save your analysis. Please try again — you weren't charged.",
              failure_reason: "persist_error",
            });
            controller.close();
            return;
          }

          // Fire-and-forget admin notification + server-side PostHog event +
          // DB log. No await so user-facing latency is unaffected.
          void (async () => {
            try {
              try {
                await prisma.optimizationLog.create({
                  data: {
                    userId,
                    userEmail,
                    jobTitle: persistedJobTitle,
                    companyName: companyName && companyName !== "Target Company" ? companyName : null,
                    matchScore: Math.round(analysis.overallScore),
                  },
                });
              } catch (logErr) {
                console.error("[analyze] optimizationLog write failed:", logErr);
              }

              await sendOptimizeNotification({
                userEmail,
                userId,
                jobTitle: persistedJobTitle,
                companyName,
                hasJobUrl: !!jobUrl,
                cvTextLength: cvText.length,
                jobDescriptionLength: (finalJobDescription || "").length,
                matchScore: analysis.overallScore,
              });

              const ph = getPostHogClient();
              if (ph) {
                ph.capture({
                  distinctId: userId,
                  event: "optimize_succeeded_server",
                  properties: {
                    email: userEmail,
                    jobTitle: persistedJobTitle,
                    companyName,
                    hasJobUrl: !!jobUrl,
                    cvTextLength: cvText.length,
                    jobDescriptionLength: (finalJobDescription || "").length,
                    matchScore: analysis.overallScore,
                    suggestionCount: analysis.suggestions.length,
                    groundedCount: analysis.suggestions.filter((s) => s.grounded).length,
                  },
                });
                await ph.shutdown();
              }
            } catch (notifyError) {
              console.error("[analyze] post-success notification failed:", notifyError);
            }
          })();

          send({ type: "result", success: true, analysis, analysisId, meta });
          controller.close();
        } catch (err) {
          if (err instanceof PipelineError) {
            console.error(`[analyze] pipeline ${err.stage} failed (${err.reason}):`, err.message);
            fireOptimizeFailedServer(userId, err.reason === "truncated" ? "truncated" : "model_error", {
              stage: err.stage,
              cv_text_length: cvText.length,
              job_description_length: (finalJobDescription || "").length,
            });
            send({
              type: "error",
              error:
                err.reason === "truncated"
                  ? "Your CV is too long for a single pass. Try removing older roles or shortening descriptions, then try again."
                  : "Our analysis service hit a snag. Please try again — you weren't charged.",
              failure_reason: err.reason,
            });
          } else {
            console.error("[analyze] pipeline failed:", err);
            fireOptimizeFailedServer(userId, "model_error", {});
            send({
              type: "error",
              error: "Our analysis service hit a snag. Please try again — you weren't charged.",
              failure_reason: "model_error",
            });
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
