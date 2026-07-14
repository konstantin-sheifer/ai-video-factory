import type {
  CreativeDirection,
  StoryTimeline,
  VoiceoverScript,
} from "./types";

export function polishVoiceover(
  creativeDirection: CreativeDirection,
  timeline: StoryTimeline,
  draft: VoiceoverScript
): VoiceoverScript {
  let text = normalizeVoiceover(draft.fullText);

  text = removeWeakPhrases(text);
  text = improveRhythm(text);

  return {
    estimatedDuration: timeline.duration,
    fullText: text,
  };
}

function normalizeVoiceover(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\.\./g, ".")
    .trim();
}

function removeWeakPhrases(text: string) {
  const weakPhrases = [
    "something was wrong",
    "something happened",
    "something changed",
    "I noticed something",
    "then I noticed",
    "watch what happens next",
    "you won't believe",
    "everything changed",
  ];

  let result = text;

  for (const phrase of weakPhrases) {
    result = result.replace(
      new RegExp(phrase, "gi"),
      ""
    );
  }

  return result.replace(/\s+/g, " ").trim();
}

function improveRhythm(text: string) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const improved = sentences.map((sentence) => {
    const clean = sentence.trim();

    if (clean.length < 25) {
      return clean;
    }

    return clean;
  });

  return improved.join(" ");
}