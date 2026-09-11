import { createCreativeProducerDecision } from "@/lib/ai-brain/creative-producer";
import { directEmotion } from "@/lib/ai-brain/agents/emotion-director";
import { createProductionBible } from "@/lib/ai-brain/visual-development/movie-bible";
import { createStoryboard } from "@/lib/ai-brain/visual-development/storyboard-director";
import { createKeyFrames } from "@/lib/ai-brain/visual-development/keyframe-director";
import { createCameraPlan } from "@/lib/ai-brain/visual-development/camera-planner";
import { buildProviderPrompt } from "@/lib/ai-brain/visual-development/provider-prompt-builder";
import { buildRunwayPromptPackage } from "@/lib/ai-brain/providers/runway-adapter";
import { reviewProductionPackage } from "@/lib/ai-brain/quality-control/quality-controller";

type CreativeProducerResult = Awaited<ReturnType<typeof createCreativeProducerDecision>>;

export async function buildProductionPlan(rawIdea: string, duration: number) {
  const creativeProducer = await createCreativeProducerDecision({ rawIdea, duration });
  const creativeBrief = creativeProducer.creativeBrief;
  const emotionDirector = directEmotion(creativeBrief);
  const bible = createProductionBible({
    idea: creativeBrief.productionIdea, duration,
    format: duration <= 15 ? "short" : duration <= 60 ? "reel" : "long_video",
    platform: "generic",
  }, creativeBrief);
  const storyboard = createStoryboard(bible, creativeBrief);
  const keyframes = createKeyFrames(storyboard);
  const cameraPlan = createCameraPlan(keyframes);
  const providerPrompt = buildProviderPrompt(bible, storyboard, keyframes, cameraPlan);
  const runwayPackage = buildRunwayPromptPackage(providerPrompt, duration);
  const qualityReview = reviewProductionPackage({ bible, storyboard, keyframes, cameraPlan, providerPrompt });
  const script = buildGeneratedScript({ creativeProducer, bible, storyboard, runwayPrompt: runwayPackage.promptText });
  return {
    script,
    aiBrain: { creativeProducer, creativeBrief, emotionDirector, bible, storyboard, keyframes, cameraPlan, providerPrompt, runwayPackage, qualityReview },
  };
}

export type ProductionPlan = Awaited<ReturnType<typeof buildProductionPlan>>;

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
