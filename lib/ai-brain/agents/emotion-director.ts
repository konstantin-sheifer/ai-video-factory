import type { CreativeBrief } from "../creative-brief";

export type EmotionName =
  | "curiosity"
  | "suspense"
  | "anxiety"
  | "fear"
  | "shock"
  | "wonder"
  | "delight"
  | "urgency";

export type EmotionBeat = {
  id: string;
  beatIndex: number;
  beatRole: "hook" | "discovery" | "test" | "escalation" | "payoff";
  emotion: EmotionName;
  intensity: number;
  viewerQuestion: string;
  objective: string;
  visualRequirement: string;
  mustAvoid: string[];
};

export type EmotionDirectorResult = {
  status: "approved" | "needs_revision";
  overallEmotionalScore: number;
  emotionalArc: string;
  emotionCurve: EmotionBeat[];
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    note: string;
  }>;
  recommendation: string;
};

export function directEmotion(brief: CreativeBrief): EmotionDirectorResult {
  const curve = buildBeatBasedEmotionCurve(brief);
  const checks = buildEmotionChecks(curve);
  const passed = checks.every((check) => check.passed);
  const score = calculateScore(curve, checks);

  return {
    status: passed ? "approved" : "needs_revision",
    overallEmotionalScore: score,
    emotionalArc: buildArcDescription(curve),
    emotionCurve: curve,
    checks,
    recommendation: passed
      ? "Beat-based emotional curve is strong enough for production."
      : "Strengthen beat-based emotional escalation before generation.",
  };
}

function buildBeatBasedEmotionCurve(brief: CreativeBrief): EmotionBeat[] {
  if (brief.creative.style === "comedy_reaction") {
    return [
      makeBeat(1, "hook", "curiosity", 30, "What is about to happen?", "Show the funny setup clearly.", brief),
      makeBeat(2, "discovery", "delight", 55, "Why is this funny?", "Reveal the first cause-effect gag.", brief),
      makeBeat(3, "test", "delight", 75, "How far will it go?", "Escalate the gag with a clearer reaction.", brief),
      makeBeat(4, "payoff", "shock", 100, "Did that really happen?", "End with one replayable final reaction.", brief),
    ];
  }

  if (brief.creative.style === "luxury_commercial") {
    return [
      makeBeat(1, "hook", "wonder", 35, "What is this beautiful object?", "Open with premium visual intrigue.", brief),
      makeBeat(2, "discovery", "curiosity", 55, "Why does it feel special?", "Reveal one elegant detail.", brief),
      makeBeat(3, "escalation", "wonder", 75, "What is the transformation?", "Build toward the hero image.", brief),
      makeBeat(4, "payoff", "shock", 95, "Why is this final frame memorable?", "Hold the premium final frame.", brief),
    ];
  }

  return [
    makeBeat(1, "hook", "curiosity", 35, "What is wrong here?", "Show the first impossible detail without overexplaining.", brief),
    makeBeat(2, "discovery", "suspense", 55, "Did it move?", "Suggest movement while leaving a moment of doubt.", brief),
    makeBeat(3, "test", "anxiety", 75, "Is the danger getting closer?", "Make the subject test the mystery through one clear physical action.", brief),
    makeBeat(4, "escalation", "fear", 90, "Can the character stay safe?", "Reveal that the threat is now physically closer.", brief),
    makeBeat(5, "payoff", "shock", 100, "What just happened?", "Deliver the strongest final image.", brief),
  ];
}

function makeBeat(
  beatIndex: number,
  beatRole: EmotionBeat["beatRole"],
  emotion: EmotionName,
  intensity: number,
  viewerQuestion: string,
  objective: string,
  brief: CreativeBrief
): EmotionBeat {
  return {
    id: `emotion-beat-${beatIndex}-${beatRole}`,
    beatIndex,
    beatRole,
    emotion,
    intensity,
    viewerQuestion,
    objective,
    visualRequirement: buildVisualRequirement(beatRole, emotion, brief),
    mustAvoid: [
      "flat emotion",
      "empty waiting",
      "generic walking",
      "unclear threat",
      "unclear final payoff",
      "random action not connected to the story",
    ],
  };
}

function buildVisualRequirement(
  beatRole: EmotionBeat["beatRole"],
  emotion: EmotionName,
  brief: CreativeBrief
) {
  if (beatRole === "hook") {
    return `The first beat must make the viewer ask a question: ${brief.creative.hook}`;
  }

  if (beatRole === "discovery") {
    return "Show a small but readable discovery. Do not fully reveal the threat yet.";
  }

  if (beatRole === "test") {
    return `The subject must actively test the event: ${brief.creative.coreEvent}`;
  }

  if (beatRole === "escalation") {
    return `Escalate visually and emotionally: ${brief.creative.escalation}`;
  }

  if (beatRole === "payoff") {
    return `End with the clearest and strongest image: ${brief.creative.payoff}`;
  }

  return `${emotion}: ${brief.creative.wowReason}`;
}

function buildEmotionChecks(curve: EmotionBeat[]) {
  const intensities = curve.map((beat) => beat.intensity);
  const finalBeat = curve[curve.length - 1];
  const strictlyRising = intensities.every(
    (value, index) => index === 0 || value >= intensities[index - 1]
  );

  const hasHook = curve.some((beat) => beat.beatRole === "hook");
  const hasPayoff = curve.some((beat) => beat.beatRole === "payoff");

  return [
    {
      id: "rising-emotion",
      label: "Emotional intensity rises through the story beats.",
      passed: strictlyRising,
      note: strictlyRising
        ? "Each beat is at least as emotionally intense as the previous beat."
        : "One or more beats reduce emotional intensity too early.",
    },
    {
      id: "strong-final-beat",
      label: "Final beat is the strongest moment.",
      passed: finalBeat?.intensity >= 90,
      note: finalBeat?.intensity >= 90
        ? "The final beat is strong enough to carry the payoff."
        : "Final beat needs stronger emotional impact.",
    },
    {
      id: "hook-and-payoff",
      label: "The curve has both a hook and a payoff.",
      passed: hasHook && hasPayoff,
      note: hasHook && hasPayoff
        ? "The emotional curve has a clear beginning and ending."
        : "The emotional curve is missing either the hook or payoff beat.",
    },
    {
      id: "visual-requirements",
      label: "Every emotion has a visual requirement.",
      passed: curve.every((beat) => beat.visualRequirement.length > 12),
      note: "Emotions are connected to visible screen requirements.",
    },
  ];
}

function calculateScore(
  curve: EmotionBeat[],
  checks: EmotionDirectorResult["checks"]
) {
  const averageIntensity =
    curve.reduce((sum, beat) => sum + beat.intensity, 0) / curve.length;
  const checkBonus =
    checks.filter((check) => check.passed).length / checks.length;

  return Math.round(averageIntensity * 0.7 + checkBonus * 30);
}

function buildArcDescription(curve: EmotionBeat[]) {
  return curve
    .map(
      (beat) =>
        `Beat ${beat.beatIndex} ${beat.beatRole}: ${beat.emotion} ${beat.intensity}%`
    )
    .join(" → ");
}
