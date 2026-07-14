export type StoryArchitectureInput = {
  idea: string;
  duration: number;
};

export type StoryBeat = {
  name: "HOOK" | "DISCOVERY" | "ESCALATION" | "TWIST" | "PAYOFF";
  startSecond: number;
  endSecond: number;
  purpose: string;
  visualRequirement: string;
};

export type StoryArchitectureResult = {
  duration: number;
  structureName: string;
  beats: StoryBeat[];
};

export function createStoryArchitecture(
  input: StoryArchitectureInput
): StoryArchitectureResult {
  const duration = normalizeDuration(input.duration);

  if (duration <= 15) {
    return createShortStructure(duration);
  }

  if (duration <= 60) {
    return createReelStructure(duration);
  }

  return createLongStructure(duration);
}

function createShortStructure(duration: number): StoryArchitectureResult {
  return {
    duration,
    structureName: "Micro Viral Story",
    beats: [
      {
        name: "HOOK",
        startSecond: 0,
        endSecond: 1,
        purpose: "Instantly show the impossible or unusual detail.",
        visualRequirement:
          "The first frame must already contain the key object, location, and visual hook.",
      },
      {
        name: "DISCOVERY",
        startSecond: 1,
        endSecond: 3,
        purpose: "The main subject notices that something is wrong.",
        visualRequirement:
          "Use one clear reaction or physical movement, not random gesturing.",
      },
      {
        name: "ESCALATION",
        startSecond: 3,
        endSecond: 6,
        purpose: "The impossible event becomes more obvious.",
        visualRequirement:
          "Show the key object or environment changing in a visible way.",
      },
      {
        name: "TWIST",
        startSecond: 6,
        endSecond: 8,
        purpose: "Reveal that the situation is bigger than expected.",
        visualRequirement:
          "Show a second piece of evidence that confirms the idea.",
      },
      {
        name: "PAYOFF",
        startSecond: 8,
        endSecond: duration,
        purpose: "End with one strong final image.",
        visualRequirement:
          "The final frame must clearly prove the concept without needing explanation.",
      },
    ],
  };
}

function createReelStructure(duration: number): StoryArchitectureResult {
  return {
    duration,
    structureName: "Extended Short Story",
    beats: [
      {
        name: "HOOK",
        startSecond: 0,
        endSecond: 3,
        purpose: "Show the core mystery immediately.",
        visualRequirement: "Open with the most visually interesting element.",
      },
      {
        name: "DISCOVERY",
        startSecond: 3,
        endSecond: Math.round(duration * 0.25),
        purpose: "Let the subject understand the problem.",
        visualRequirement: "Show a clear investigation or test.",
      },
      {
        name: "ESCALATION",
        startSecond: Math.round(duration * 0.25),
        endSecond: Math.round(duration * 0.55),
        purpose: "Increase the stakes.",
        visualRequirement: "Show the event expanding or becoming harder to ignore.",
      },
      {
        name: "TWIST",
        startSecond: Math.round(duration * 0.55),
        endSecond: Math.round(duration * 0.8),
        purpose: "Reveal a new meaning behind the event.",
        visualRequirement: "Show a visual reversal or unexpected proof.",
      },
      {
        name: "PAYOFF",
        startSecond: Math.round(duration * 0.8),
        endSecond: duration,
        purpose: "Deliver a memorable final image.",
        visualRequirement: "End on one clean, shareable visual moment.",
      },
    ],
  };
}

function createLongStructure(duration: number): StoryArchitectureResult {
  return {
    duration,
    structureName: "Long-Form Cinematic Story",
    beats: [
      {
        name: "HOOK",
        startSecond: 0,
        endSecond: Math.round(duration * 0.08),
        purpose: "Open with a strong cinematic promise.",
        visualRequirement: "Show a powerful image that defines the story world.",
      },
      {
        name: "DISCOVERY",
        startSecond: Math.round(duration * 0.08),
        endSecond: Math.round(duration * 0.25),
        purpose: "Introduce the central mystery or conflict.",
        visualRequirement: "Show the subject encountering the problem.",
      },
      {
        name: "ESCALATION",
        startSecond: Math.round(duration * 0.25),
        endSecond: Math.round(duration * 0.6),
        purpose: "Develop the conflict.",
        visualRequirement: "Show multiple escalating visual consequences.",
      },
      {
        name: "TWIST",
        startSecond: Math.round(duration * 0.6),
        endSecond: Math.round(duration * 0.85),
        purpose: "Reveal the deeper truth.",
        visualRequirement: "Show a visual reversal that changes the meaning.",
      },
      {
        name: "PAYOFF",
        startSecond: Math.round(duration * 0.85),
        endSecond: duration,
        purpose: "Resolve with a cinematic ending.",
        visualRequirement: "End with a strong final image or emotional resolution.",
      },
    ],
  };
}

function normalizeDuration(duration: number) {
  if (!Number.isFinite(duration) || duration < 5) return 10;
  return Math.round(duration);
}