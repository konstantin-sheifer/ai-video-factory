import type { CameraPlan } from "./camera-planner";
import type { KeyFramePackage } from "./keyframe-director";
import type { ProductionBible } from "./movie-bible";
import type { Storyboard } from "./storyboard-director";

export type ProviderPromptPackage = {
  providerAgnosticPrompt: string;
  negativePrompt: string;
  promptSections: {
    productionIntent: string;
    visualStyle: string;
    storyBeats: string;
    cameraPlan: string;
    continuity: string;
    finalPayoff: string;
    providerRules: string;
  };
};

export function buildProviderPrompt(
  bible: ProductionBible,
  storyboard: Storyboard,
  keyframes: KeyFramePackage,
  cameraPlan: CameraPlan
): ProviderPromptPackage {
  const promptSections = {
    productionIntent: buildProductionIntent(bible),
    visualStyle: buildVisualStyle(bible),
    storyBeats: buildStoryBeats(storyboard),
    cameraPlan: buildCameraPlan(cameraPlan),
    continuity: buildContinuityRules(bible, storyboard, cameraPlan),
    finalPayoff: buildFinalPayoff(bible, storyboard),
    providerRules: buildProviderRules(),
  };

  const providerAgnosticPrompt = [
    promptSections.productionIntent,
    promptSections.visualStyle,
    promptSections.storyBeats,
    promptSections.cameraPlan,
    promptSections.continuity,
    promptSections.finalPayoff,
    promptSections.providerRules,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    providerAgnosticPrompt,
    negativePrompt: buildNegativePrompt(bible),
    promptSections,
  };
}

function buildProductionIntent(bible: ProductionBible) {
  return [
    "Create a vertical cinematic short video.",
    "The video must feel like a complete micro-film, not a random stock clip.",
    `Story: ${bible.story.logline}`,
    `Genre: ${bible.creative.genre}.`,
    `Tone: ${bible.creative.tone}.`,
    `Main subject: ${bible.characters.mainCharacter}.`,
    `Location: ${bible.world.primaryLocation}.`,
    `Core conflict: ${bible.creative.coreConflict}.`,
  ].join("\n");
}

function buildVisualStyle(bible: ProductionBible) {
  return [
    "VISUAL STYLE:",
    bible.visualLanguage.style,
    `Lighting: ${bible.world.lighting}.`,
    `Atmosphere: ${bible.world.atmosphere}.`,
    `Color palette: ${bible.visualLanguage.colorPalette}.`,
    `Character movement: ${bible.characters.movementStyle}.`,
  ].join("\n");
}

function buildStoryBeats(storyboard: Storyboard) {
  const beats = storyboard.frames.map((frame, index) => {
    return [
      `Beat ${index + 1} (${frame.timeRange.startSecond}-${frame.timeRange.endSecond}s):`,
      `Purpose: ${frame.purpose}`,
      `Visual: ${frame.visualDescription}`,
      `Action: ${frame.subjectAction}`,
      `Composition: ${frame.composition}`,
    ].join("\n");
  });

  return ["STORY BEATS:", ...beats].join("\n\n");
}

function buildCameraPlan(cameraPlan: CameraPlan) {
  const shots = cameraPlan.shots.map((shot, index) => {
    return [
      `Shot ${index + 1} (${shot.timeRange.startSecond}-${shot.timeRange.endSecond}s):`,
      `Type: ${shot.type}`,
      `Camera move: ${shot.cameraMove}`,
      `Lens language: ${shot.lensLanguage}`,
      `Framing: ${shot.framing}`,
      `Purpose: ${shot.purpose}`,
    ].join("\n");
  });

  return ["CAMERA PLAN:", ...shots].join("\n\n");
}

function buildContinuityRules(
  bible: ProductionBible,
  storyboard: Storyboard,
  cameraPlan: CameraPlan
) {
  const rules = [
    ...bible.visualLanguage.continuityRules,
    ...bible.characters.identityLock,
    ...storyboard.continuityRules,
    ...cameraPlan.globalCameraRules,
  ];

  return [
    "CONTINUITY RULES:",
    ...unique(rules).map((rule) => `- ${rule}`),
  ].join("\n");
}

function buildFinalPayoff(bible: ProductionBible, storyboard: Storyboard) {
  const finalFrame = storyboard.frames[storyboard.frames.length - 1];

  return [
    "FINAL PAYOFF:",
    `The ending must clearly show: ${bible.creative.finalPayoff}.`,
    finalFrame
      ? `Final beat: ${finalFrame.visualDescription} ${finalFrame.subjectAction}`
      : "",
    "The final image must be readable as a still thumbnail.",
    "Do not cut away before the viewer understands the payoff.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildProviderRules() {
  return [
    "EXECUTION RULES:",
    "- One coherent scene.",
    "- No unrelated location changes.",
    "- No random extra characters.",
    "- No stock-video filler.",
    "- No passive standing unless visual tension is created by the environment or camera.",
    "- Every beat must show new visual information.",
    "- Keep subject, wardrobe, location, lighting, and style consistent.",
    "- The first second must show the correct subject, location, and hook.",
    "- The final seconds must clearly show the visual payoff.",
    "- No text, subtitles, captions, watermark, logo, UI, or readable words inside the generated video.",
  ].join("\n");
}

function buildNegativePrompt(bible: ProductionBible) {
  const avoid = [
    ...bible.providerAgnosticRules.mustAvoid,
    "text",
    "caption",
    "subtitle",
    "watermark",
    "logo",
    "UI elements",
    "random people",
    "wrong location",
    "wrong character",
    "identity drift",
    "outfit change",
    "extra limbs",
    "distorted face",
    "low quality",
    "flicker",
    "stock footage",
    "generic walking",
    "boring static shot",
    "unrelated action",
  ];

  return unique(avoid).join(", ");
}

function unique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}
