export type TrendAnalysisInput = {
  originalIdea: string;
  platform:
  | "tiktok"
  | "youtube_shorts"
  | "instagram_reels"
  | "youtube"
  | "generic";
};

export type TrendAnalysisResult = {
  improvedIdea: string;
  hook: string;
  curiosityGap: string;
  emotionalTrigger: string;
  viralMechanism: string;
  retentionGoal: string;
};

export function analyzeTrend(
  input: TrendAnalysisInput
): TrendAnalysisResult {
  const idea = normalize(input.originalIdea);

  return {
    improvedIdea: improveIdea(idea),

    hook:
      "The first second must immediately show something impossible or unexpected.",

    curiosityGap:
      "The viewer should instantly ask: 'What is happening here?'",

    emotionalTrigger:
      "Curiosity, surprise, tension, and anticipation.",

    viralMechanism:
      "Every 2–3 seconds the viewer should receive new visual information that increases curiosity until the final payoff.",

    retentionGoal:
      "Maintain viewer attention until the final frame without dead time.",
  };
}

function improveIdea(idea: string) {
  return idea
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}