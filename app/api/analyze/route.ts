import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "unpdf";
import { fetchJobDescription } from "@/lib/jobFetcher";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sendOptimizeNotification } from "@/lib/email";
import { getPostHogClient } from "@/lib/posthog-server";
import { prisma } from "@/lib/prisma";
import { extractBalancedJson } from "@/lib/extractJson";
import { FREE_CREDITS_FOR_NEW_USER } from "@/lib/credits";
// Prompt assembly lives in lib/optimizer/prompt.ts so the eval harness can
// exercise the EXACT prompt this route ships.
import { buildOptimizerPrompt, OPTIMIZER_SYSTEM_PROMPT } from "@/lib/optimizer/prompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fire a server-side optimize_failed event so failures stay visible in PostHog
// even when the client never reports them (e.g. user closes the tab on error).
function fireOptimizeFailedServer(
  userId: string,
  reason: "truncated" | "parse_error" | "no_json" | "model_error",
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

// Normalize the `improvements` field into the redesign-v2 shape. Accepts:
//   - new shape: Array<{ text, scoreImpact, category }>
//   - legacy: string[]
//   - mixed bag with missing fields
// Always returns a non-empty list (or [] if there is truly nothing).
export type NormalizedImprovement = {
  id: string;
  text: string;
  scoreImpact: number;
  category: "ats" | "impact" | "clarity";
};

function normalizeImprovements(raw: unknown): NormalizedImprovement[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalizedImprovement[] = [];
  raw.forEach((item, i) => {
    if (typeof item === "string") {
      out.push({
        id: `imp_${i}`,
        text: item,
        scoreImpact: 0,
        category: "impact",
      });
    } else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const text = String(obj.text ?? obj.improvement ?? "").trim();
      if (!text) return;
      let scoreImpact = Number(obj.scoreImpact ?? obj.score_impact ?? 0);
      if (!Number.isFinite(scoreImpact)) scoreImpact = 0;
      scoreImpact = Math.max(0, Math.min(15, Math.round(scoreImpact)));
      const catRaw = String(obj.category ?? "impact").toLowerCase();
      const category: NormalizedImprovement["category"] =
        catRaw === "ats" || catRaw === "clarity" ? catRaw : "impact";
      out.push({ id: `imp_${i}`, text, scoreImpact, category });
    }
  });
  // Stable sort: highest impact first, fall back to original order.
  return out
    .map((imp, idx) => ({ imp, idx }))
    .sort((a, b) => b.imp.scoreImpact - a.imp.scoreImpact || a.idx - b.idx)
    .map(({ imp }) => imp);
}


export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing required environment variable: ANTHROPIC_API_KEY" },
        { status: 500 }
      );
    }

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
    // balance up front so we don't burn a Claude call for a user with 0.
    // The actual decrement happens AFTER the work succeeds, in the same
    // transaction that persists the analysis (see below) — failures are
    // never charged, so no refund endpoint is needed.
    const dbUser = await prisma.user.upsert({
      where: { id: userId },
      update: { email: userEmail },
      create: {
        id: userId,
        email: userEmail,
        credits: FREE_CREDITS_FOR_NEW_USER,
      },
    });
    if (dbUser.credits <= 0) {
      return NextResponse.json(
        { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    const formData = await request.formData();
    
    let cvText = formData.get("cvText") as string || "";
    const cvFile = formData.get("cv") as File | null;
    const mode = (formData.get("mode") as string) || "specific_role";
    const jobDescription = formData.get("jobDescription") as string || "";
    const jobUrl = formData.get("jobUrl") as string || "";
    const jobTitle = formData.get("jobTitle") as string || "";
    const companyName = formData.get("companyName") as string || "";
    
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
    
    // Get optional summary
    const userSummary = formData.get("summary") as string || "";

    // Extract text from PDF if provided
    if (cvFile && !cvText) {
      try {
        const arrayBuffer = await cvFile.arrayBuffer();
        const { text } = await extractText(arrayBuffer);
        cvText = Array.isArray(text) ? text.join("\n") : text;
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        return NextResponse.json(
          { error: "Failed to parse PDF. Please try pasting your CV text instead." },
          { status: 400 }
        );
      }
    }

    if (!cvText) {
      return NextResponse.json(
        { error: "No CV content provided" },
        { status: 400 }
      );
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

    const { analysisPrompt, effectiveJobTitle } = buildOptimizerPrompt({
      cvText,
      jobTitle,
      jobDescription: finalJobDescription,
      companyName,
      userSummary,
      deepDiveAnswers,
      mode: isQuickMode ? "quick" : "specific_role",
    });

    // DEBUG: Log what job context we received
    console.log("=== JOB CONTEXT DEBUG ===");
    console.log("Received jobTitle:", jobTitle);
    console.log("Received jobDescription length:", jobDescription?.length || 0);
    console.log("Final effectiveJobTitle:", effectiveJobTitle);
    console.log("========================");

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: OPTIMIZER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : "";

    // If the model hit max_tokens, the JSON is truncated — never try to parse
    // it, surface a specific actionable error so the user can shorten + retry.
    // No credit has been charged at this point.
    if (response.stop_reason === "max_tokens") {
      console.error("[analyze] model output truncated at max_tokens");
      fireOptimizeFailedServer(userId, "truncated", {
        cv_text_length: cvText.length,
        job_description_length: (finalJobDescription || "").length,
      });
      return NextResponse.json(
        {
          error: "Your CV is too long for a single pass. Try removing older roles or shortening descriptions, then try again.",
          failure_reason: "truncated",
        },
        { status: 422 }
      );
    }

    // Parse the JSON response. Use a balanced-brace scan instead of a greedy
    // regex so we don't accidentally swallow trailing text or fail on minor
    // whitespace differences.
    let analysis;
    try {
      const jsonText = extractBalancedJson(content);
      if (!jsonText) throw new Error("No JSON object found in response");
      analysis = JSON.parse(jsonText);
      // Coerce `improvements` into the new {text, scoreImpact, category} shape.
      // The prompt asks for the rich shape, but we tolerate the legacy
      // string[] response too so cached/in-flight analyses don't break the
      // results page during the rollout.
      analysis.improvements = normalizeImprovements(analysis.improvements);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Raw response (first 500 chars):", content.slice(0, 500));
      fireOptimizeFailedServer(userId, "parse_error", {
        message: parseError instanceof Error ? parseError.message : "unknown",
        cv_text_length: cvText.length,
      });
      return NextResponse.json(
        {
          error: "We couldn't read the AI's response. Please try again — you weren't charged.",
          failure_reason: "parse_error",
        },
        { status: 500 }
      );
    }

    const matchScore =
      typeof analysis?.matchScore === "number"
        ? analysis.matchScore
        : typeof analysis?.overall_score === "number"
          ? analysis.overall_score
          : undefined;

    // Charge the credit + persist the analysis in a single transaction so a
    // crash here never leaves a user billed without a result (or vice versa) —
    // same pattern as /api/voice/finalize. The decrement-then-guard handles
    // concurrent requests racing past the up-front balance check.
    let analysisId: string | null = null;
    try {
      const normalizedImps = (analysis.improvements ?? []) as NormalizedImprovement[];
      const created = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
        });
        if (updated.credits < 0) throw new Error("INSUFFICIENT_CREDITS");
        return tx.analysis.create({
          data: {
            userId,
            cvText: cvText.slice(0, 60_000),
            jobTitle: effectiveJobTitle,
            overallScore: typeof analysis?.overallScore === "number" ? Math.round(analysis.overallScore) : null,
            optimizedScore:
              typeof analysis?.scoreComparison?.optimized?.total === "number"
                ? Math.round(analysis.scoreComparison.optimized.total)
                : null,
            raw: analysis,
            improvements: {
              create: normalizedImps.map((imp, i) => ({
                text: imp.text,
                scoreImpact: imp.scoreImpact,
                category: imp.category,
                unlocked: i < 3, // top 3 by score impact are free
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
        return NextResponse.json(
          { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
          { status: 402 }
        );
      }
      console.error("[analyze] charge+persist transaction failed:", persistErr);
      return NextResponse.json(
        { error: "Failed to save your analysis. Please try again — you weren't charged.", failure_reason: "persist_error" },
        { status: 500 }
      );
    }

    // Fire-and-forget admin notification + server-side PostHog event + DB log.
    // No await so user-facing latency is unaffected.
    void (async () => {
      try {
        try {
          await prisma.optimizationLog.create({
            data: {
              userId,
              userEmail,
              jobTitle: effectiveJobTitle,
              companyName: companyName && companyName !== "Target Company" ? companyName : null,
              matchScore: typeof matchScore === "number" ? Math.round(matchScore) : null,
            },
          });
        } catch (logErr) {
          console.error("[analyze] optimizationLog write failed:", logErr);
        }

        await sendOptimizeNotification({
          userEmail,
          userId,
          jobTitle: effectiveJobTitle,
          companyName,
          hasJobUrl: !!jobUrl,
          cvTextLength: cvText.length,
          jobDescriptionLength: (finalJobDescription || "").length,
          matchScore,
        });

        const ph = getPostHogClient();
        if (ph) {
          ph.capture({
            distinctId: userId,
            event: "optimize_succeeded_server",
            properties: {
              email: userEmail,
              jobTitle: effectiveJobTitle,
              companyName,
              hasJobUrl: !!jobUrl,
              cvTextLength: cvText.length,
              jobDescriptionLength: (finalJobDescription || "").length,
              matchScore,
            },
          });
          await ph.shutdown();
        }
      } catch (notifyError) {
        console.error("[analyze] post-success notification failed:", notifyError);
      }
    })();

    return NextResponse.json({
      success: true,
      analysis,
      analysisId,
      meta: {
        mode: isQuickMode
          ? "quick"
          : mode === "title_only"
            ? "title_only"
            : "specific_role",
        jobTitle: effectiveJobTitle,
        jobUrl,
        companyName,
        cvTextUsed: cvText,
        jobDescriptionUsed: finalJobDescription || "",
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
