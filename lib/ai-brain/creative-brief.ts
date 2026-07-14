export type CreativeBriefStage =
  | "creative_producer"
  | "production_bible"
  | "storyboard"
  | "keyframes"
  | "camera_plan"
  | "provider_prompt"
  | "quality_review"
  | "render";

export type CreativeBriefStatus =
  | "draft"
  | "in_progress"
  | "needs_revision"
  | "ready"
  | "blocked";

export type CreativeBriefCheck = {
  id: string;
  label: string;
  passed: boolean;
  note: string;
};

export type CreativeBriefStageResult = {
  stage: CreativeBriefStage;
  status: CreativeBriefStatus;
  score?: number;
  checks: CreativeBriefCheck[];
  notes: string[];
  updatedAt: string;
};

export type CreativeBrief = {
  id: string;
  originalIdea: string;
  productionIdea: string;
  duration: number;

  creative: {
    style: string;
    pacing: string;
    beatDensity: string;
    targetBeatCount: number;
    wowReason: string;
    hook: string;
    coreEvent: string;
    escalation: string;
    payoff: string;
  };

  rules: {
    mustFeelLike: string[];
    mustAvoid: string[];
    actionPrinciple: string;
  };

  stages: CreativeBriefStageResult[];

  finalGate: {
    canGenerate: boolean;
    reason: string;
  };

  createdAt: string;
  updatedAt: string;
};

export function createCreativeBrief(input: {
  originalIdea: string;
  productionIdea: string;
  duration: number;
  creative: CreativeBrief["creative"];
  rules: CreativeBrief["rules"];
  initialChecks?: CreativeBriefCheck[];
}): CreativeBrief {
  const now = new Date().toISOString();

  return {
    id: `brief-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    originalIdea: input.originalIdea,
    productionIdea: input.productionIdea,
    duration: input.duration,
    creative: input.creative,
    rules: input.rules,
    stages: [
      {
        stage: "creative_producer",
        status: "ready",
        checks: input.initialChecks || [],
        notes: ["Creative Producer created the initial production brief."],
        updatedAt: now,
      },
    ],
    finalGate: {
      canGenerate: true,
      reason: "Creative brief is ready for production pipeline.",
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function addBriefStage(
  brief: CreativeBrief,
  stage: CreativeBriefStageResult
): CreativeBrief {
  const now = new Date().toISOString();

  return {
    ...brief,
    stages: [
      ...brief.stages.filter((item) => item.stage !== stage.stage),
      {
        ...stage,
        updatedAt: stage.updatedAt || now,
      },
    ],
    updatedAt: now,
  };
}

export function blockBrief(
  brief: CreativeBrief,
  reason: string
): CreativeBrief {
  return {
    ...brief,
    finalGate: {
      canGenerate: false,
      reason,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function approveBrief(
  brief: CreativeBrief,
  reason = "Creative brief passed all required gates."
): CreativeBrief {
  return {
    ...brief,
    finalGate: {
      canGenerate: true,
      reason,
    },
    updatedAt: new Date().toISOString(),
  };
}