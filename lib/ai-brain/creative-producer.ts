import {
  createCreativeBrief,
  type CreativeBrief,
  type CreativeBriefCheck,
} from "./creative-brief";

export type CreativeStyle =
  | "cinematic_realism"
  | "stylized_animation"
  | "premium_3d_animation"
  | "cinematic_horror"
  | "sci_fi_thriller"
  | "luxury_commercial"
  | "comedy_reaction";

export type PacingProfile =
  | "slow_tension"
  | "mystery_reveal"
  | "action_dense"
  | "comedy_reaction"
  | "premium_slow"
  | "cinematic_wonder";

export type BeatDensity = "minimal" | "balanced" | "dense";

export type CreativeProducerInput = {
  rawIdea: string;
  duration: number;
};

export type CreativeProducerDecision = {
  originalIdea: string;
  productionIdea: string;
  style: CreativeStyle;
  pacing: PacingProfile;
  beatDensity: BeatDensity;
  targetBeatCount: number;
  logline: string;
  hook: string;
  coreEvent: string;
  escalation: string;
  payoff: string;
  wowReason: string;
  creativeBrief: CreativeBrief;
  stageChecks: CreativeBriefCheck[];
  visualRules: {
    mustFeelLike: string[];
    mustAvoid: string[];
    actionPrinciple: string;
  };
  recommendation: {
    shouldGenerate: boolean;
    reason: string;
  };
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const CREATIVE_STYLES: CreativeStyle[] = [
  "cinematic_realism",
  "stylized_animation",
  "premium_3d_animation",
  "cinematic_horror",
  "sci_fi_thriller",
  "luxury_commercial",
  "comedy_reaction",
];

const PACING_PROFILES: PacingProfile[] = [
  "slow_tension",
  "mystery_reveal",
  "action_dense",
  "comedy_reaction",
  "premium_slow",
  "cinematic_wonder",
];

const BEAT_DENSITIES: BeatDensity[] = ["minimal", "balanced", "dense"];

export async function createCreativeProducerDecision(
  input: CreativeProducerInput
): Promise<CreativeProducerDecision> {
  const rawIdea = cleanText(input.rawIdea);
  const duration = normalizeDuration(input.duration);

  if (!rawIdea) {
    return createFallbackDecision({
      rawIdea: "A cinematic mystery short.",
      duration,
      forceNeedsRevision: true,
      reason: "User idea is empty.",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || process.env.AI_BRAIN_LIVE === "false") {
    return createFallbackDecision({
      rawIdea,
      duration,
      forceNeedsRevision: rawIdea.length < 20,
      reason: apiKey
        ? "Live AI Brain is disabled by AI_BRAIN_LIVE=false."
        : "OPENAI_API_KEY is missing; using deterministic fallback.",
    });
  }

  try {
    const decision = await callCreativeProducerAgent({
      apiKey,
      rawIdea,
      duration,
    });

    return normalizeDecision(decision, rawIdea, duration);
  } catch (error) {
    console.error("Creative Producer error:", error);

    return createFallbackDecision({
      rawIdea,
      duration,
      forceNeedsRevision: rawIdea.length < 20,
      reason: "Creative Producer failed; using deterministic fallback.",
    });
  }
}

async function callCreativeProducerAgent(input: {
  apiKey: string;
  rawIdea: string;
  duration: number;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are the Creative Producer of AI Video Factory.",
            "Turn a simple idea into a complete, high-retention, wow short video concept.",
            "Return only valid JSON.",
            "The JSON must include: productionIdea, style, pacing, beatDensity, targetBeatCount, logline, hook, coreEvent, escalation, payoff, wowReason, stageChecks, visualRules, recommendation.",
            "For 10 seconds, usually choose 4-6 beats, not 10.",
            "A short video must feel like a complete micro-film: hook, discovery, action/test, escalation, payoff.",
            "Choose style based on what makes the idea strongest, not always realism.",
            "The payoff must be visual, physical, and understandable without explanation.",
            "Avoid empty standing, generic walking, and passive posing unless stillness is the story mechanism.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            rawIdea: input.rawIdea,
            duration: input.duration,
            goal:
              "Create a wow short video concept that feels complete and cinematic from a simple prompt.",
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = (await response.json()) as OpenAIChatResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Creative Producer returned empty content.");
  }

  return JSON.parse(content) as Partial<CreativeProducerDecision>;
}

function normalizeDecision(
  raw: Partial<CreativeProducerDecision>,
  originalIdea: string,
  duration: number
): CreativeProducerDecision {
  const style = CREATIVE_STYLES.includes(raw.style as CreativeStyle)
    ? (raw.style as CreativeStyle)
    : "cinematic_realism";

  const pacing = PACING_PROFILES.includes(raw.pacing as PacingProfile)
    ? (raw.pacing as PacingProfile)
    : "mystery_reveal";

  const beatDensity = BEAT_DENSITIES.includes(raw.beatDensity as BeatDensity)
    ? (raw.beatDensity as BeatDensity)
    : "balanced";

  const targetBeatCount =
    typeof raw.targetBeatCount === "number"
      ? clamp(Math.round(raw.targetBeatCount), 3, getMaxBeatCount(duration))
      : getBeatCount(duration, beatDensity);

  const stageChecks = normalizeStageChecks(raw.stageChecks, originalIdea);

  const visualRules = {
    mustFeelLike: normalizeStringArray(raw.visualRules?.mustFeelLike, [
      "a complete micro-film",
      "a polished cinematic scene",
      "a clear visual story",
      "a strong final image",
    ]),
    mustAvoid: normalizeStringArray(raw.visualRules?.mustAvoid, [
      "empty standing without visual tension",
      "generic walking",
      "random background",
      "unclear final image",
      "technical narration in voiceover",
    ]),
    actionPrinciple:
      cleanText(raw.visualRules?.actionPrinciple || "") ||
      "Every beat must either reveal new information, test the mystery, escalate the event, or deliver the payoff.",
  };

  const productionIdea =
    cleanText(raw.productionIdea || "") || upgradeWeakIdea(originalIdea);

  const decisionBase = {
    originalIdea,
    productionIdea,
    style,
    pacing,
    beatDensity,
    targetBeatCount,
    logline:
      cleanText(raw.logline || "") ||
      "A familiar situation becomes impossible through one clear visual event.",
    hook:
      cleanText(raw.hook || "") ||
      "The first second must show the unusual detail already happening.",
    coreEvent:
      cleanText(raw.coreEvent || "") ||
      "The main subject performs one simple action that tests the impossible event.",
    escalation:
      cleanText(raw.escalation || "") ||
      "The impossible event becomes more obvious through a second visual proof.",
    payoff:
      cleanText(raw.payoff || "") ||
      "The final frame clearly proves the idea without needing explanation.",
    wowReason:
      cleanText(raw.wowReason || "") ||
      "The video has a clear hook, visual mystery, escalation, and payoff.",
    stageChecks,
    visualRules,
    recommendation: {
      shouldGenerate:
        typeof raw.recommendation?.shouldGenerate === "boolean"
          ? raw.recommendation.shouldGenerate
          : originalIdea.length >= 20,
      reason:
        cleanText(raw.recommendation?.reason || "") ||
        "The concept has enough structure to continue into production.",
    },
  };

  const creativeBrief = createCreativeBrief({
    originalIdea,
    productionIdea,
    duration,
    creative: {
      style,
      pacing,
      beatDensity,
      targetBeatCount,
      wowReason: decisionBase.wowReason,
      hook: decisionBase.hook,
      coreEvent: decisionBase.coreEvent,
      escalation: decisionBase.escalation,
      payoff: decisionBase.payoff,
    },
    rules: visualRules,
    initialChecks: stageChecks,
  });

  return {
    ...decisionBase,
    creativeBrief,
  };
}

function createFallbackDecision(input: {
  rawIdea: string;
  duration: number;
  forceNeedsRevision: boolean;
  reason: string;
}): CreativeProducerDecision {
  const style = inferFallbackStyle(input.rawIdea);
  const pacing = inferFallbackPacing(input.rawIdea);
  const beatDensity: BeatDensity = "balanced";
  const targetBeatCount = getBeatCount(input.duration, beatDensity);
  const productionIdea = upgradeWeakIdea(input.rawIdea);
  const stageChecks = createDefaultStageChecks(input.rawIdea);

  const visualRules = {
    mustFeelLike: [
      "a complete short film",
      "clear beginning, middle, and payoff",
      "one strong visual idea",
      "professional cinematic execution",
    ],
    mustAvoid: [
      "empty standing without visual tension",
      "generic walking",
      "random background",
      "unclear final image",
      "technical narration in voiceover",
    ],
    actionPrinciple:
      "Every beat must either reveal new information, test the mystery, escalate the event, or deliver the payoff.",
  };

  const decisionBase = {
    originalIdea: input.rawIdea,
    productionIdea,
    style,
    pacing,
    beatDensity,
    targetBeatCount,
    logline:
      "A familiar situation becomes impossible through one clear visual event.",
    hook:
      "The first second must show the unusual detail already happening on screen.",
    coreEvent:
      "The main subject performs one simple physical action that tests the impossible event.",
    escalation:
      "The impossible event becomes clearer through a second visual proof.",
    payoff:
      "The final frame clearly proves the idea without needing explanation.",
    wowReason:
      "The video can work if every beat creates new visual information and ends with a strong payoff.",
    stageChecks,
    visualRules,
    recommendation: {
      shouldGenerate: !input.forceNeedsRevision,
      reason: input.reason,
    },
  };

  const creativeBrief = createCreativeBrief({
    originalIdea: input.rawIdea,
    productionIdea,
    duration: input.duration,
    creative: {
      style,
      pacing,
      beatDensity,
      targetBeatCount,
      wowReason: decisionBase.wowReason,
      hook: decisionBase.hook,
      coreEvent: decisionBase.coreEvent,
      escalation: decisionBase.escalation,
      payoff: decisionBase.payoff,
    },
    rules: visualRules,
    initialChecks: stageChecks,
  });

  return {
    ...decisionBase,
    creativeBrief,
  };
}

function normalizeStageChecks(
  value: unknown,
  rawIdea: string
): CreativeBriefCheck[] {
  if (!Array.isArray(value)) {
    return createDefaultStageChecks(rawIdea);
  }

  const checks = value.map((check, index) => {
    const item = check as Partial<CreativeBriefCheck>;

    return {
      id: cleanText(item.id || `check-${index + 1}`),
      label: cleanText(item.label || "Creative quality check"),
      passed: Boolean(item.passed),
      note: cleanText(item.note || ""),
    };
  });

  return checks.length > 0 ? checks : createDefaultStageChecks(rawIdea);
}

function createDefaultStageChecks(rawIdea: string): CreativeBriefCheck[] {
  const longEnough = rawIdea.length >= 20;

  return [
    {
      id: "clear-idea",
      label: "The idea is specific enough to stage visually.",
      passed: longEnough,
      note: longEnough
        ? "The prompt has enough signal to build a visual story."
        : "The prompt is too short and needs more visual detail.",
    },
    {
      id: "micro-film-structure",
      label: "The concept can support hook, middle, and payoff.",
      passed: true,
      note: "Creative Producer will structure it as a complete micro-film.",
    },
    {
      id: "visual-payoff",
      label: "The ending must be physical and readable.",
      passed: true,
      note: "The final frame must prove the concept visually.",
    },
  ];
}

function inferFallbackStyle(idea: string): CreativeStyle {
  const text = idea.toLowerCase();

  if (includesAny(text, ["horror", "scary", "ghost", "haunted", "mannequin"])) {
    return "cinematic_horror";
  }

  if (includesAny(text, ["robot", "future", "space", "sci-fi", "device"])) {
    return "sci_fi_thriller";
  }

  if (includesAny(text, ["dog", "cat", "animal", "cute", "kid"])) {
    return "premium_3d_animation";
  }

  if (includesAny(text, ["funny", "comedy", "laugh"])) {
    return "comedy_reaction";
  }

  return "cinematic_realism";
}

function inferFallbackPacing(idea: string): PacingProfile {
  const text = idea.toLowerCase();

  if (includesAny(text, ["chase", "run", "escape", "race", "fight"])) {
    return "action_dense";
  }

  if (includesAny(text, ["horror", "scary", "haunted", "mannequin", "painting"])) {
    return "mystery_reveal";
  }

  if (includesAny(text, ["luxury", "product", "watch", "car"])) {
    return "premium_slow";
  }

  if (includesAny(text, ["funny", "dog", "cat", "animal"])) {
    return "comedy_reaction";
  }

  return "mystery_reveal";
}

function upgradeWeakIdea(idea: string) {
  const cleanIdea = cleanText(idea);

  if (cleanIdea.length >= 20) {
    return cleanIdea;
  }

  return `${cleanIdea} becomes a cinematic short with one main subject, one impossible visual event, a clear escalation, and a final image that proves the idea.`;
}

function getBeatCount(duration: number, density: BeatDensity) {
  if (duration <= 10) {
    if (density === "dense") return 5;
    if (density === "balanced") return 4;
    return 3;
  }

  if (duration <= 30) {
    if (density === "dense") return 8;
    if (density === "balanced") return 6;
    return 4;
  }

  if (duration <= 60) {
    if (density === "dense") return 12;
    if (density === "balanced") return 8;
    return 6;
  }

  return density === "dense" ? 18 : density === "balanced" ? 12 : 8;
}

function getMaxBeatCount(duration: number) {
  if (duration <= 10) return 6;
  if (duration <= 30) return 10;
  if (duration <= 60) return 14;
  return 24;
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const clean = value
    .map((item) => cleanText(String(item || "")))
    .filter(Boolean);

  return clean.length > 0 ? clean : fallback;
}

function normalizeDuration(duration: number) {
  if (!Number.isFinite(duration)) return 10;
  if (duration < 5) return 10;
  if (duration > 7200) return 7200;
  return Math.round(duration);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}
