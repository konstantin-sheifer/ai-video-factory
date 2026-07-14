export type StudioMode =
  | "short"
  | "reel"
  | "long_video"
  | "movie";

export type TargetPlatform =
  | "tiktok"
  | "youtube_shorts"
  | "instagram_reels"
  | "youtube"
  | "generic";

export type ProductionIntent = {
  idea: string;
  duration: number;
  mode: StudioMode;
  platform: TargetPlatform;
};

export type AgentName =
  | "trend_strategist"
  | "creative_director"
  | "story_architect"
  | "screenwriter"
  | "character_designer"
  | "environment_designer"
  | "shot_planner"
  | "cinematographer"
  | "prompt_engineer"
  | "voice_director"
  | "subtitle_director"
  | "music_director"
  | "quality_controller";

export type AgentTask = {
  agent: AgentName;
  priority: "critical" | "high" | "normal";
  objective: string;
  requiredOutput: string;
};

export type ProductionPlan = {
  productionId: string;
  intent: ProductionIntent;
  qualityTarget: "prototype" | "publishable" | "premium";
  providerStrategy: {
    videoProvider: "runway" | "replaceable";
    providerLocked: boolean;
    reason: string;
  };
  agentTasks: AgentTask[];
  successCriteria: string[];
};

export function createProductionPlan(input: {
  idea: string;
  duration?: number;
  mode?: StudioMode;
  platform?: TargetPlatform;
}): ProductionPlan {
  const duration = normalizeDuration(input.duration);
  const mode = input.mode || inferMode(duration);
  const platform = input.platform || "generic";

  const intent: ProductionIntent = {
    idea: cleanText(input.idea),
    duration,
    mode,
    platform,
  };

  return {
    productionId: createProductionId(),
    intent,
    qualityTarget: "premium",
    providerStrategy: {
      videoProvider: "replaceable",
      providerLocked: false,
      reason:
        "AI Brain owns the creative intelligence. Runway is only one replaceable video provider.",
    },
    agentTasks: buildAgentTasks(intent),
    successCriteria: buildSuccessCriteria(intent),
  };
}

function buildAgentTasks(intent: ProductionIntent): AgentTask[] {
  return [
    {
      agent: "trend_strategist",
      priority: "high",
      objective:
        "Find the viral angle, retention hook, curiosity gap, and reason viewers should watch until the final second.",
      requiredOutput:
        "viral mechanism, audience trigger, first-second hook, retention driver",
    },
    {
      agent: "creative_director",
      priority: "critical",
      objective:
        "Turn the raw user idea into a premium cinematic concept with a clear conflict, emotional trigger, and final visual payoff.",
      requiredOutput:
        "genre, tone, conflict, mystery, escalation, reveal, payoff",
    },
    {
      agent: "story_architect",
      priority: "critical",
      objective:
        "Structure the idea into a duration-aware story arc with no empty seconds.",
      requiredOutput:
        "timeline beats mapped to seconds",
    },
    {
      agent: "screenwriter",
      priority: "critical",
      objective:
        "Write concise voiceover that supports the visual story without overexplaining it.",
      requiredOutput:
        "duration-fit voiceover script",
    },
    {
      agent: "character_designer",
      priority: "high",
      objective:
        "Define one stable main subject with identity, outfit, proportions, and continuity rules.",
      requiredOutput:
        "character lock",
    },
    {
      agent: "environment_designer",
      priority: "high",
      objective:
        "Define one stable location with lighting, props, atmosphere, and background details.",
      requiredOutput:
        "environment lock",
    },
    {
      agent: "shot_planner",
      priority: "critical",
      objective:
        "Translate the story into visible cinematic actions, not abstract narration.",
      requiredOutput:
        "shot-by-shot visual plan",
    },
    {
      agent: "cinematographer",
      priority: "high",
      objective:
        "Define camera movement, framing, lens feeling, lighting, and composition.",
      requiredOutput:
        "camera and lighting direction",
    },
    {
      agent: "prompt_engineer",
      priority: "critical",
      objective:
        "Convert the studio plan into provider-ready prompts while keeping providers replaceable.",
      requiredOutput:
        "provider-agnostic visual prompt and provider adapter input",
    },
    {
      agent: "voice_director",
      priority: "normal",
      objective:
        "Choose voice style, pacing, emotion, and delivery that fit the video.",
      requiredOutput:
        "voice direction",
    },
    {
      agent: "subtitle_director",
      priority: "normal",
      objective:
        "Create short readable subtitles and prepare for karaoke-style timing later.",
      requiredOutput:
        "subtitle lines and style direction",
    },
    {
      agent: "music_director",
      priority: "normal",
      objective:
        "Define music mood, intensity, and sound design direction.",
      requiredOutput:
        "music and sound design brief",
    },
    {
      agent: "quality_controller",
      priority: "critical",
      objective:
        "Reject weak concepts, passive scenes, generic AI visuals, missing payoff, or provider prompts that can drift away from the idea.",
      requiredOutput:
        "quality score, rejection reasons, required fixes",
    },
  ];
}

function buildSuccessCriteria(intent: ProductionIntent) {
  return [
    "The final video must clearly match the user's idea.",
    "The first second must show a hook or impossible detail.",
    "The video must contain a visible event, not only a person posing or gesturing.",
    "The subject must remain visually consistent.",
    "The location must remain consistent.",
    "The final seconds must deliver a clear visual payoff.",
    "The result must feel more cinematic, viral, and professional than a basic AI video.",
    `The structure must fit ${intent.duration} seconds without empty time.`,
    "The video provider must remain replaceable.",
  ];
}

function inferMode(duration: number): StudioMode {
  if (duration <= 15) return "short";
  if (duration <= 60) return "reel";
  if (duration <= 600) return "long_video";
  return "movie";
}

function normalizeDuration(duration?: number) {
  if (!duration || !Number.isFinite(duration)) {
    return 10;
  }

  if (duration < 5) return 10;
  if (duration > 7200) return 7200;

  return Math.round(duration);
}

function createProductionId() {
  return `production-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}