import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

export const runtime = "nodejs";

type SelectedChange = {
  id?: string;
  original: string;
  suggested: string | null; // null => skip
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    let cvText = (formData.get("cvText") as string) || "";
    const cvFile = formData.get("cv") as File | null;
    const selectedChangesRaw = (formData.get("selectedChanges") as string) || "[]";

    // Extract text from PDF if provided and cvText not present
    if (cvFile && !cvText) {
      try {
        const arrayBuffer = await cvFile.arrayBuffer();
        const { text } = await extractText(arrayBuffer);
        cvText = text.join("\n");
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        return NextResponse.json(
          { error: "Failed to parse PDF. Please try pasting your CV text instead." },
          { status: 400 }
        );
      }
    }

    if (!cvText) {
      return NextResponse.json({ error: "No CV content provided" }, { status: 400 });
    }

    let selectedChanges: SelectedChange[] = [];
    try {
      selectedChanges = JSON.parse(selectedChangesRaw);
      if (!Array.isArray(selectedChanges)) throw new Error("selectedChanges must be an array");
    } catch {
      return NextResponse.json({ error: "Invalid selectedChanges payload" }, { status: 400 });
    }

    const warnings: { id?: string; original: string; reason: string }[] = [];
    let optimizedCV = cvText;

    for (const ch of selectedChanges) {
      if (!ch || typeof ch.original !== "string") continue;
      if (!ch.suggested) continue; // skipped

      const idx = optimizedCV.indexOf(ch.original);
      if (idx === -1) {
        warnings.push({
          id: ch.id,
          original: ch.original,
          reason: "Original text not found in CV (may have changed or appears differently).",
        });
        continue;
      }

      optimizedCV = optimizedCV.slice(0, idx) + ch.suggested + optimizedCV.slice(idx + ch.original.length);
    }

    return NextResponse.json({ success: true, optimizedCV, warnings });
  } catch (error) {
    console.error("Optimize error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Optimize failed" },
      { status: 500 }
    );
  }
}


