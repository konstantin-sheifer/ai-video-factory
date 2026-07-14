import type { ProductionBible } from "../visual-development/movie-bible";
import type { Storyboard } from "../visual-development/storyboard-director";
import type { KeyFramePackage } from "../visual-development/keyframe-director";
import type { CameraPlan } from "../visual-development/camera-planner";
import type { ProviderPromptPackage } from "../visual-development/provider-prompt-builder";

export type QualityCriterion =
  | "HOOK_QUALITY"
  | "VISUAL_CLARITY"
  | "SINGLE_MAIN_EVENT"
  | "CHARACTER_CONSISTENCY"
  | "LOCATION_CONSISTENCY"
  | "VISUAL_PAYOFF"
  | "CAMERA_READABILITY"
  | "STORY_ESCALATION"
  | "PROVIDER_COMPATIBILITY"
  | "VIRAL_POTENTIAL";

export type QualityGrade =
  | "NEEDS_REVISION"
  | "GOOD_ENOUGH"
  | "PRODUCTION_READY";

export type QualityScore = {
  criterion: QualityCriterion;
  score: number;
  note: string;
};

export type ProductionQualityReview = {
  approved: boolean;
  canGenerate: boolean;
  overallScore: number;
  grade: QualityGrade;
  scores: QualityScore[];
  strengths: string[];
  weaknesses: string[];
  requiredFixes: string[];
  recommendation: string;
};

export function reviewProductionPackage(input: {
  bible: ProductionBible;
  storyboard: Storyboard;
  keyframes: KeyFramePackage;
  cameraPlan: CameraPlan;
  providerPrompt: ProviderPromptPackage;
}): ProductionQualityReview {
  const scores: QualityScore[] = [
    scoreHookQuality(input.storyboard),
    scoreVisualClarity(input.bible, input.providerPrompt),
    scoreSingleMainEvent(input.bible),
    scoreCharacterConsistency(input.bible, input.storyboard),
    scoreLocationConsistency(input.bible, input.storyboard),
    scoreVisualPayoff(input.bible, input.storyboard),
    scoreCameraReadability(input.cameraPlan),
    scoreStoryEscalation(input.storyboard),
    scoreProviderCompatibility(input.providerPrompt),
    scoreViralPotential(input.bible),
  ];

  const overallScore = Math.round(
    scores.reduce((sum, item) => sum + item.score, 0) / scores.length
  );

  const weaknesses = scores
    .filter((item) => item.score < 8)
    .map((item) => item.note);

  const requiredFixes = scores
    .filter((item) => item.score < 7)
    .map((item) => getRequiredFix(item.criterion));

  const strengths = scores
    .filter((item) => item.score >= 9)
    .map((item) => item.note);

  const grade = getQualityGrade(overallScore, requiredFixes.length);
  const canGenerate = grade !== "NEEDS_REVISION";

  return {
    approved: grade === "PRODUCTION_READY",
    canGenerate,
    overallScore,
    grade,
    scores,
    strengths,
    weaknesses,
    requiredFixes,
    recommendation: buildRecommendation(grade, requiredFixes),
  };
}

function getQualityGrade(
  overallScore: number,
  criticalIssueCount: number
): QualityGrade {
  if (overallScore >= 90 && criticalIssueCount === 0) {
    return "PRODUCTION_READY";
  }

  if (overallScore >= 75) {
    return "GOOD_ENOUGH";
  }

  return "NEEDS_REVISION";
}

function scoreHookQuality(storyboard: Storyboard): QualityScore {
  const firstFrame = storyboard.frames[0];
  const hasHook =
    Boolean(firstFrame?.visualDescription) &&
    firstFrame.visualDescription.length > 40 &&
    includesAny(firstFrame.visualDescription, [
      "first frame",
      "already",
      "notices",
      "glowing",
      "facing",
      "empty",
      "impossible",
    ]);

  return {
    criterion: "HOOK_QUALITY",
    score: hasHook ? 9 : 6,
    note: hasHook
      ? "Hook clearly starts with a visible first-frame mystery."
      : "Hook is not visually strong enough in the first second.",
  };
}

function scoreVisualClarity(
  bible: ProductionBible,
  providerPrompt: ProviderPromptPackage
): QualityScore {
  const prompt = providerPrompt.providerAgnosticPrompt.toLowerCase();
  const mustShowHits = bible.providerAgnosticRules.mustShow.filter((item) =>
    prompt.includes(item.toLowerCase().split(" ")[0])
  ).length;

  return {
    criterion: "VISUAL_CLARITY",
    score: mustShowHits >= 3 ? 9 : mustShowHits >= 2 ? 8 : 6,
    note:
      mustShowHits >= 3
        ? "Prompt contains enough concrete visual anchors."
        : "Prompt needs more concrete visual anchors from the Production Bible.",
  };
}

function scoreSingleMainEvent(bible: ProductionBible): QualityScore {
  const text = `${bible.creative.coreConflict} ${bible.creative.finalPayoff}`;

  const hasSingleEvent =
    includesAny(text, ["one", "single", "final", "whenever", "realizes"]) &&
    !includesAny(text, ["many different", "multiple stories", "several locations"]);

  return {
    criterion: "SINGLE_MAIN_EVENT",
    score: hasSingleEvent ? 10 : 6,
    note: hasSingleEvent
      ? "Concept is focused on one readable main event."
      : "Concept may contain too many events for a short video.",
  };
}

function scoreCharacterConsistency(
  bible: ProductionBible,
  storyboard: Storyboard
): QualityScore {
  const hasRules =
    bible.characters.identityLock.length >= 3 &&
    storyboard.continuityRules.some((rule) =>
      rule.toLowerCase().includes("same")
    );

  return {
    criterion: "CHARACTER_CONSISTENCY",
    score: hasRules ? 9 : 6,
    note: hasRules
      ? "Character identity is locked across the package."
      : "Character consistency rules are not strong enough.",
  };
}

function scoreLocationConsistency(
  bible: ProductionBible,
  storyboard: Storyboard
): QualityScore {
  const hasLocation =
    bible.world.primaryLocation.length > 30 &&
    storyboard.continuityRules.some((rule) =>
      rule.toLowerCase().includes("same")
    );

  return {
    criterion: "LOCATION_CONSISTENCY",
    score: hasLocation ? 10 : 6,
    note: hasLocation
      ? "Location is specific and locked for the full video."
      : "Location is too vague or not locked strongly enough.",
  };
}

function scoreVisualPayoff(
  bible: ProductionBible,
  storyboard: Storyboard
): QualityScore {
  const finalFrame = storyboard.frames[storyboard.frames.length - 1];
  const hasPayoff =
    bible.creative.finalPayoff.length > 40 &&
    finalFrame?.visualDescription.length > 40;

  return {
    criterion: "VISUAL_PAYOFF",
    score: hasPayoff ? 9 : 6,
    note: hasPayoff
      ? "Final payoff is visible and specific."
      : "Final payoff is too vague or not visually clear.",
  };
}

function scoreCameraReadability(cameraPlan: CameraPlan): QualityScore {
  const hasReadableCamera =
    cameraPlan.shots.length >= 3 &&
    cameraPlan.globalCameraRules.some((rule) =>
      rule.toLowerCase().includes("final frame")
    );

  return {
    criterion: "CAMERA_READABILITY",
    score: hasReadableCamera ? 9 : 7,
    note: hasReadableCamera
      ? "Camera plan supports a readable cinematic final image."
      : "Camera plan needs stronger final-frame readability.",
  };
}

function scoreStoryEscalation(storyboard: Storyboard): QualityScore {
  const hasEscalation = storyboard.frames.some(
    (frame) => frame.type === "ESCALATION"
  );

  return {
    criterion: "STORY_ESCALATION",
    score: hasEscalation ? 8 : 6,
    note: hasEscalation
      ? "Storyboard contains escalation before the payoff."
      : "Storyboard lacks a clear escalation beat.",
  };
}

function scoreProviderCompatibility(
  providerPrompt: ProviderPromptPackage
): QualityScore {
  const prompt = providerPrompt.providerAgnosticPrompt;
  const isTooLong = prompt.length > 4000;
  const hasContinuity = prompt.toLowerCase().includes("continuity");

  return {
    criterion: "PROVIDER_COMPATIBILITY",
    score: !isTooLong && hasContinuity ? 9 : 7,
    note:
      !isTooLong && hasContinuity
        ? "Prompt is structured and provider-ready."
        : "Prompt may be too long or missing clear continuity rules.",
  };
}

function scoreViralPotential(bible: ProductionBible): QualityScore {
  const hasViralMechanism =
    bible.creative.viralMechanism.length > 40 &&
    bible.creative.emotionalTrigger.length > 40;

  return {
    criterion: "VIRAL_POTENTIAL",
    score: hasViralMechanism ? 8 : 6,
    note: hasViralMechanism
      ? "Concept has a clear emotional trigger and retention mechanism."
      : "Viral mechanism needs to be sharper.",
  };
}

function getRequiredFix(criterion: QualityCriterion) {
  const fixes: Record<QualityCriterion, string> = {
    HOOK_QUALITY: "Strengthen the first-second visual hook.",
    VISUAL_CLARITY: "Add more concrete visual anchors.",
    SINGLE_MAIN_EVENT: "Reduce the idea to one clear visual event.",
    CHARACTER_CONSISTENCY: "Strengthen character identity lock.",
    LOCATION_CONSISTENCY: "Strengthen location lock.",
    VISUAL_PAYOFF: "Make the final visual payoff more specific.",
    CAMERA_READABILITY: "Improve camera readability and final framing.",
    STORY_ESCALATION: "Add a stronger escalation beat.",
    PROVIDER_COMPATIBILITY: "Simplify and structure the provider prompt.",
    VIRAL_POTENTIAL: "Sharpen the viral mechanism and emotional trigger.",
  };

  return fixes[criterion];
}

function buildRecommendation(
  grade: QualityGrade,
  requiredFixes: string[]
) {
  if (grade === "PRODUCTION_READY") {
    return "Production package is ready for video generation.";
  }

  if (grade === "GOOD_ENOUGH") {
    return "Good enough to generate for testing, but review weaknesses before spending many credits.";
  }

  return `Do not generate yet. ${
    requiredFixes[0] || "Rebuild the concept before spending video credits."
  }`;
}

function includesAny(text: string, values: string[]) {
  const lower = text.toLowerCase();

  return values.some((value) => lower.includes(value));
}
