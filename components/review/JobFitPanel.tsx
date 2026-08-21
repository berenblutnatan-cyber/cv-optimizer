"use client";

// The Job-fit rail segment — requirement coverage with inline evidence
// (previously an invisible tooltip) + keyword chips.

import { CoverageMatrix } from "./CoverageMatrix";
import { KeywordChips } from "./KeywordChips";
import type { DeepAnalysis } from "@/lib/optimizer/types";
import type { JdRequirement } from "@/lib/optimizer/types";

export function JobFitPanel({
  analysis,
  addedSkillReqIds,
  onAddSkill,
  onJumpToSuggestion,
  suggestionIdByReq,
}: {
  analysis: DeepAnalysis;
  addedSkillReqIds: Set<string>;
  onAddSkill: (req: JdRequirement) => void;
  onJumpToSuggestion: (id: string) => void;
  suggestionIdByReq: Map<string, string>;
}) {
  return (
    <div className="space-y-4">
      <CoverageMatrix
        requirements={analysis.jdRequirements ?? []}
        coverage={analysis.coverage ?? []}
        addedSkillReqIds={addedSkillReqIds}
        onAddSkill={onAddSkill}
        onJumpToSuggestion={onJumpToSuggestion}
        suggestionIdByReq={suggestionIdByReq}
      />
      <KeywordChips
        present={analysis.keywords?.present ?? []}
        missing={analysis.keywords?.missing ?? []}
        missingKeySkills={analysis.missingKeySkills ?? []}
        added={analysis.keywords?.added ?? []}
      />
    </div>
  );
}
