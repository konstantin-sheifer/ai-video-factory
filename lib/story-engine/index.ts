import { createCreativeDirection } from "./creative-director";
import { createStoryTimeline } from "./viral-strategist";
import { createVoiceoverScript } from "./screenwriter";
import { createVisualDirection, createRunwayPrompt } from "./runway-director";
import { polishVoiceover } from "./voiceover-writer";
import { createSubtitleLines } from "./subtitle-writer";
import type { StoryPackage } from "./types";

export function createStoryPackage(idea: string, duration = 10): StoryPackage {
  const creativeDirection = createCreativeDirection(idea);
  const timeline = createStoryTimeline(creativeDirection, duration);
  const draftVoiceover = createVoiceoverScript(creativeDirection, timeline);
  const voiceover = polishVoiceover(
    creativeDirection,
    timeline,
    draftVoiceover
  );
  const subtitles = createSubtitleLines(voiceover, timeline);
  const visualDirection = createVisualDirection(creativeDirection, timeline);
  const runwayPrompt = createRunwayPrompt({
    creativeDirection,
    timeline,
    visualDirection,
  });

  return {
    creativeDirection,
    timeline,
    visualDirection,
    voiceover,
    subtitles,
    runwayPrompt,
  };
}