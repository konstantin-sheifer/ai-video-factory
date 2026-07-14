import type { ProviderPromptPackage } from "../visual-development/provider-prompt-builder";

export type RunwayPromptPackage = {
  promptText: string;
  negativePrompt: string;
  duration: number;
};

const TARGET_MAX_CHARS = 1800;

export function buildRunwayPromptPackage(
  input: ProviderPromptPackage
): RunwayPromptPackage {
  return {
    promptText: optimizeForRunway(input),
    negativePrompt: input.negativePrompt,
    duration: 10,
  };
}

function optimizeForRunway(input: ProviderPromptPackage) {
  const sections = input.promptSections;

  const story = compactSection(sections.productionIntent, [
    "Story:",
    "Genre:",
    "Tone:",
    "Main subject:",
    "Location:",
  ]);

  const style = compactSection(sections.visualStyle, [
    "VISUAL STYLE:",
    "Lighting:",
    "Atmosphere:",
    "Character movement:",
  ]);

  const beats = extractCompactBeats(sections.storyBeats);
  const camera = extractCompactCamera(sections.cameraPlan);
  const continuity = extractCompactContinuity(sections.continuity);
  const payoff = compactSection(sections.finalPayoff, [
    "The ending must clearly show:",
    "Final beat:",
  ]);

  const prompt = [
    "Vertical cinematic short video. One coherent scene. No montage.",
    story,
    style,
    "STORY BEATS:",
    beats,
    "CAMERA:",
    camera,
    "CONTINUITY:",
    continuity,
    "FINAL PAYOFF:",
    payoff,
    "No text, captions, subtitles, watermark, logo, or UI inside the video.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return hardLimit(prompt, TARGET_MAX_CHARS);
}

function extractCompactBeats(text: string) {
  const beatBlocks = text
    .split(/\n\n+/)
    .filter((block) => block.toLowerCase().startsWith("beat "));

  const compact = beatBlocks.map((block) => {
    const title = block.match(/Beat\s+\d+\s+\([^)]+\):/i)?.[0] || "";
    const visual = getLineValue(block, "Visual:");
    const action = getLineValue(block, "Action:");
    return `${title} ${visual} ${action}`.trim();
  });

  return compact.join("\n");
}

function extractCompactCamera(text: string) {
  const shotBlocks = text
    .split(/\n\n+/)
    .filter((block) => block.toLowerCase().startsWith("shot "));

  const compact = shotBlocks.map((block) => {
    const title = block.match(/Shot\s+\d+\s+\([^)]+\):/i)?.[0] || "";
    const move = getLineValue(block, "Camera move:");
    const framing = getLineValue(block, "Framing:");
    return `${title} ${move} ${framing}`.trim();
  });

  return compact.join("\n");
}

function extractCompactContinuity(text: string) {
  const importantRules = text
    .split("\n")
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean)
    .filter((line) =>
      includesAny(line.toLowerCase(), [
        "same",
        "one continuous",
        "no random",
        "no montage",
        "final frame",
        "keep the same",
        "every beat",
      ])
    );

  return unique(importantRules)
    .slice(0, 8)
    .map((rule) => `- ${rule}`)
    .join("\n");
}

function compactSection(text: string, keepPrefixes: string[]) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) =>
      keepPrefixes.some((prefix) =>
        line.toLowerCase().startsWith(prefix.toLowerCase())
      )
    )
    .join("\n");
}

function getLineValue(block: string, label: string) {
  const line = block
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.toLowerCase().startsWith(label.toLowerCase()));

  return line ? line.replace(label, "").trim() : "";
}

function hardLimit(text: string, maxChars: number) {
  const clean = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (clean.length <= maxChars) {
    return clean;
  }

  return `${clean.slice(0, maxChars - 120).trim()}\n\nFinal seconds must clearly show the payoff. Keep same subject, same location, same style.`;
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
