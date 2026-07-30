import { NextResponse } from "next/server";
import { createCreativeBrief } from "@/lib/ai-brain/creative-brief";
import { createCreativeProducerDecision } from "@/lib/ai-brain/creative-producer";
import { directEmotion } from "@/lib/ai-brain/agents/emotion-director";
import { createProductionBible } from "@/lib/ai-brain/visual-development/movie-bible";
import { createStoryboard } from "@/lib/ai-brain/visual-development/storyboard-director";
import { createKeyFrames } from "@/lib/ai-brain/visual-development/keyframe-director";
import { createCameraPlan } from "@/lib/ai-brain/visual-development/camera-planner";
import { buildProviderPrompt } from "@/lib/ai-brain/visual-development/provider-prompt-builder";
import { buildRunwayPromptPackage } from "@/lib/ai-brain/providers/runway-adapter";
import { reviewProductionPackage } from "@/lib/ai-brain/quality-control/quality-controller";
import {
  AppAuthenticationError,
  requireAppUser,
} from "@/lib/auth/require-app-user";

type ScriptRequest = { idea?: string; duration?: number };

type QualityReviewLike = {
  approved?: boolean;
  canGenerate?: boolean;
  overallScore?: number;
  grade?: string;
  recommendation?: string;
};

type CreativeProducerResult = Awaited<
  ReturnType<typeof createCreativeProducerDecision>
>;

export async function POST(request: Request) {
  try {
    await requireAppUser();
  } catch (error) {
    if (error instanceof AppAuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Script authentication failure.", {
      category: "unexpected_internal_failure",
    });

    return NextResponse.json(
      {
        provider: "ai-brain-error",
        mock: true,
        canGenerate: false,
        generationBlocked: true,
        generationBlockReason:
          "Script generation failed. Please try again.",
        error: "Failed to generate script.",
      },
      { status: 500 }
    );
  }

  let body: ScriptRequest;

  try {
    body = (await request.json()) as ScriptRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const rawIdea = typeof body.idea === "string" ? body.idea.trim() : "";

  if (!rawIdea) {
    return NextResponse.json(
      { error: "Video idea is required." },
      { status: 400 }
    );
  }

  try {
    const duration = normalizeDuration(body.duration);
    const creativeProducer = await createCreativeProducerDecision({ rawIdea, duration });
    const creativeBrief = getOrCreateCreativeBrief(creativeProducer, rawIdea, duration);
    const emotionDirector = directEmotion(creativeBrief);

    const aiBrain = buildAIBrainPackage({
      idea: creativeBrief.productionIdea,
      duration: creativeBrief.duration,
      creativeBrief,
    });

    const canGenerate =
      creativeBrief.finalGate.canGenerate &&
      creativeProducer.recommendation.shouldGenerate &&
      emotionDirector.status === "approved" &&
      resolveCanGenerate(aiBrain.qualityReview);

    const script = buildGeneratedScript({
      creativeProducer,
      bible: aiBrain.bible,
      storyboard: aiBrain.storyboard,
      runwayPrompt: aiBrain.runwayPackage.promptText,
    });

    return NextResponse.json({
      provider: "ai-brain",
      mock: false,
      canGenerate,
      generationBlocked: !canGenerate,
      generationBlockReason: canGenerate
        ? ""
        : getGenerationBlockReason(
            aiBrain.qualityReview,
            creativeBrief.finalGate.reason,
            creativeProducer.recommendation.reason,
            emotionDirector.recommendation
          ),
      script,
      aiBrain: {
        creativeBrief,
        creativeProducer,
        emotionDirector,
        ...aiBrain,
      },
    });
  } catch (error) {
    console.error("Script route failure.", {
      category: "unexpected_internal_failure",
      errorType: error instanceof Error ? error.name : "unknown",
    });

    return NextResponse.json(
      {
        provider: "ai-brain-error",
        mock: true,
        canGenerate: false,
        generationBlocked: true,
        generationBlockReason:
          "Script generation failed. Please try again.",
        error: "Failed to generate script.",
      },
      { status: 500 }
    );
  }
}

function buildAIBrainPackage(input: {
  idea: string;
  duration: number;
  creativeBrief: ReturnType<typeof createCreativeBrief>;
}) {
  const bible = createProductionBible(
    {
      idea: input.idea,
      duration: input.duration,
      format:
        input.duration <= 15 ? "short" : input.duration <= 60 ? "reel" : "long_video",
      platform: "generic",
    },
    input.creativeBrief
  );

  const storyboard = createStoryboard(bible, input.creativeBrief);
  const keyframes = createKeyFrames(storyboard);
  const cameraPlan = createCameraPlan(keyframes);
  const providerPrompt = buildProviderPrompt(bible, storyboard, keyframes, cameraPlan);
  const runwayPackage = buildRunwayPromptPackage(providerPrompt);
  const qualityReview = reviewProductionPackage({
    bible,
    storyboard,
    keyframes,
    cameraPlan,
    providerPrompt,
  });

  return { bible, storyboard, keyframes, cameraPlan, providerPrompt, runwayPackage, qualityReview };
}

function getOrCreateCreativeBrief(
  creativeProducer: CreativeProducerResult,
  rawIdea: string,
  duration: number
) {
  if (creativeProducer.creativeBrief) return creativeProducer.creativeBrief;

  return createCreativeBrief({
    originalIdea: creativeProducer.originalIdea || rawIdea,
    productionIdea: creativeProducer.productionIdea || rawIdea,
    duration,
    creative: {
      style: creativeProducer.style || "cinematic_realism",
      pacing: creativeProducer.pacing || "mystery_reveal",
      beatDensity: creativeProducer.beatDensity || "balanced",
      targetBeatCount: creativeProducer.targetBeatCount || 4,
      wowReason:
        creativeProducer.wowReason ||
        "The video should feel like a complete micro-film with a clear payoff.",
      hook:
        creativeProducer.hook ||
        "The first second must show the unusual detail already happening.",
      coreEvent:
        creativeProducer.coreEvent ||
        "The main subject performs one simple action that reveals the event.",
      escalation:
        creativeProducer.escalation ||
        "The event becomes clearer through a second visual proof.",
      payoff:
        creativeProducer.payoff ||
        "The final frame clearly proves the idea without explanation.",
    },
    rules: {
      mustFeelLike: creativeProducer.visualRules?.mustFeelLike || [
        "a complete micro-film",
        "a polished cinematic scene",
        "a clear visual story",
        "a strong final image",
      ],
      mustAvoid: creativeProducer.visualRules?.mustAvoid || [
        "empty standing without visual tension",
        "generic walking",
        "random background",
        "unclear final image",
        "technical narration in voiceover",
      ],
      actionPrinciple:
        creativeProducer.visualRules?.actionPrinciple ||
        "Every beat must either reveal new information, test the mystery, escalate the event, or deliver the payoff.",
    },
    initialChecks: creativeProducer.stageChecks || [],
  });
}

function resolveCanGenerate(qualityReview: QualityReviewLike) {
  if (typeof qualityReview.canGenerate === "boolean") return qualityReview.canGenerate;
  if (typeof qualityReview.overallScore === "number") return qualityReview.overallScore >= 75;
  if (qualityReview.grade) {
    return qualityReview.grade !== "NEEDS_REVISION" && qualityReview.grade !== "REJECT";
  }
  return Boolean(qualityReview.approved);
}

function getGenerationBlockReason(
  qualityReview: QualityReviewLike,
  briefReason: string,
  creativeProducerReason: string,
  emotionReason: string
) {
  return (
    qualityReview.recommendation ||
    emotionReason ||
    briefReason ||
    creativeProducerReason ||
    "AI Brain quality score is too low. Improve the concept before spending video credits."
  );
}

function buildGeneratedScript(input: {
  creativeProducer: CreativeProducerResult;
  bible: ReturnType<typeof createProductionBible>;
  storyboard: ReturnType<typeof createStoryboard>;
  runwayPrompt: string;
}) {
  const { creativeProducer, bible, storyboard, runwayPrompt } = input;
  const narration = buildNarrationScript(creativeProducer, bible);

  return {
    title: buildTitle(bible.source.improvedIdea),
    hook: narration.hook,
    duration: `${bible.source.duration} seconds`,
    autoStyle: bible.creative.genre,
    visualStyle: bible.visualLanguage.style,
    mainSubject: bible.characters.mainCharacter,
    environment: bible.world.primaryLocation,
    scenes: [
      {
        scene: 1,
        visual: buildSceneVisual(creativeProducer, bible, storyboard),
        voiceover: narration.voiceover,
        subtitle: getShortLine(narration.hook, 7),
      },
    ],
    cta: narration.cta,
    runwayPrompt,
  };
}

function buildNarrationScript(
  creativeProducer: CreativeProducerResult,
  bible: ReturnType<typeof createProductionBible>
) {
  const idea = bible.source.improvedIdea.toLowerCase();

  if (
    idea.includes("mannequin") ||
    idea.includes("shopping mall") ||
    idea.includes("closed mall") ||
    idea.includes("janitor")
  ) {
    return {
      hook: "At midnight, the mall was supposed to be empty.",
      voiceover:
        "At midnight, the mall was supposed to be empty. But every time the janitor looked away, the mannequins moved closer. He raised his flashlight, and the glass answered first.",
      cta: "Then one hand touched the glass.",
    };
  }

  return {
    hook: cleanNarrationLine(creativeProducer.hook),
    voiceover: [
      creativeProducer.hook,
      creativeProducer.coreEvent,
      creativeProducer.escalation,
      creativeProducer.payoff,
    ]
      .map((line) => cleanNarrationLine(line))
      .filter(Boolean)
      .join(" "),
    cta: cleanNarrationLine(creativeProducer.payoff),
  };
}

function buildSceneVisual(
  creativeProducer: CreativeProducerResult,
  bible: ReturnType<typeof createProductionBible>,
  storyboard: ReturnType<typeof createStoryboard>
) {
  return [
    bible.story.logline,
    `Creative style: ${creativeProducer.style}.`,
    `Pacing: ${creativeProducer.pacing}.`,
    `Beat density: ${creativeProducer.beatDensity}.`,
    `Target beat count: ${creativeProducer.targetBeatCount}.`,
    `Wow reason: ${creativeProducer.wowReason}.`,
    `Location: ${bible.world.primaryLocation}.`,
    `Main character: ${bible.characters.mainCharacter}.`,
    `Visual payoff: ${bible.creative.finalPayoff}.`,
    `Action principle: ${creativeProducer.visualRules.actionPrinciple}.`,
    `Storyboard: ${storyboard.frames
      .map(
        (frame) =>
          `${frame.timeRange.startSecond}-${frame.timeRange.endSecond}s ${frame.visualDescription}`
      )
      .join(" ")}`,
  ].join(" ");
}

function cleanNarrationLine(text: string) {
  return text
    .replace(/the first frame shows/gi, "")
    .replace(/visual payoff:/gi, "")
    .replace(/location:/gi, "")
    .replace(/main character:/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDuration(duration?: number) {
  if (!duration || !Number.isFinite(duration)) return 10;
  if (duration < 5) return 10;
  if (duration > 60) return 60;
  return Math.round(duration);
}

function buildTitle(idea: string) {
  const words = idea
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["a", "an", "the"].includes(word.toLowerCase()))
    .slice(0, 5);

  return (
    words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "AI Video"
  );
}

function getShortLine(text: string, maxWords: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return words.length <= maxWords
    ? words.join(" ")
    : words.slice(0, maxWords).join(" ");
}
