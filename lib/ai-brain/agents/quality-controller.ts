export type QualityInput = {
  idea: string;
  duration: number;
};

export type QualityIssue = {
  severity: "critical" | "warning";
  message: string;
};

export type QualityResult = {
  approved: boolean;
  score: number;
  issues: QualityIssue[];
  recommendations: string[];
};

export function reviewProduction(
  input: QualityInput
): QualityResult {
  const issues: QualityIssue[] = [];
  const recommendations: string[] = [];

  let score = 100;

  const idea = input.idea.trim();

  if (idea.length < 20) {
    issues.push({
      severity: "critical",
      message: "Idea is too short.",
    });

    recommendations.push(
      "Expand the idea before generating the story."
    );

    score -= 20;
  }

  if (!containsConflict(idea)) {
    issues.push({
      severity: "critical",
      message: "No visible conflict detected.",
    });

    recommendations.push(
      "Add a clear impossible event or mystery."
    );

    score -= 20;
  }

  if (!containsVisualObject(idea)) {
    issues.push({
      severity: "warning",
      message: "No obvious visual object.",
    });

    recommendations.push(
      "Introduce a physical object that can drive the story."
    );

    score -= 10;
  }

  if (input.duration < 8) {
    issues.push({
      severity: "warning",
      message: "Very short duration.",
    });

    recommendations.push(
      "Increase duration if the story requires more development."
    );

    score -= 5;
  }

  if (score < 0) score = 0;

  return {
    approved: score >= 70,
    score,
    issues,
    recommendations,
  };
}

function containsConflict(text: string) {
  const lower = text.toLowerCase();

  return [
    "discover",
    "found",
    "suddenly",
    "impossible",
    "moved",
    "future",
    "mystery",
    "secret",
    "changed",
    "appeared",
    "disappeared",
    "stopped",
    "frozen",
  ].some((word) => lower.includes(word));
}

function containsVisualObject(text: string) {
  const lower = text.toLowerCase();

  return [
    "phone",
    "painting",
    "mannequin",
    "clock",
    "door",
    "key",
    "device",
    "mirror",
    "book",
    "train",
    "subway",
    "office",
    "coffee",
    "camera",
  ].some((word) => lower.includes(word));
}