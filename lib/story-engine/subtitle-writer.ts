import type { StoryTimeline, SubtitleLine, VoiceoverScript } from "./types";

export function createSubtitleLines(
  voiceover: VoiceoverScript,
  timeline: StoryTimeline
): SubtitleLine[] {
  const lines = splitIntoCaptionLines(voiceover.fullText);

  if (!lines.length) {
    return [];
  }

  const secondsPerLine = timeline.duration / lines.length;

  return lines.map((text, index) => {
    const startSecond = roundTime(index * secondsPerLine);
    const endSecond =
      index === lines.length - 1
        ? timeline.duration
        : roundTime((index + 1) * secondsPerLine);

    return {
      startSecond,
      endSecond,
      text,
    };
  });
}

function splitIntoCaptionLines(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => cleanSubtitle(line))
    .filter(Boolean)
    .map((line) => limitWords(line, 7));
}

function cleanSubtitle(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim();
}

function limitWords(text: string, maxWords: number) {
  const words = text.split(" ").filter(Boolean);

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return words.slice(0, maxWords).join(" ");
}

function roundTime(value: number) {
  return Math.round(value * 100) / 100;
}