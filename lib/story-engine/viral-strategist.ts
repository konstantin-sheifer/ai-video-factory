import type { CreativeDirection, StoryTimeline } from "./types";

export function createStoryTimeline(
  creativeDirection: CreativeDirection,
  duration = 10
): StoryTimeline {
  if (duration <= 10) {
    return {
      duration: 10,
      beats: [
        {
          type: "HOOK",
          startSecond: 0,
          endSecond: 1,
          objective: `Show the first impossible detail: ${creativeDirection.viralMechanism}`,
        },
        {
          type: "DISCOVERY",
          startSecond: 1,
          endSecond: 3,
          objective: `The subject notices the problem: ${creativeDirection.coreConflict}`,
        },
        {
          type: "ACTION",
          startSecond: 3,
          endSecond: 6,
          objective: "The subject performs one clear physical action to test the impossible event.",
        },
        {
          type: "REVEAL",
          startSecond: 6,
          endSecond: 8,
          objective: "The environment confirms the event is real and not imagined.",
        },
        {
          type: "PAYOFF",
          startSecond: 8,
          endSecond: 10,
          objective: `End with the strongest visual proof: ${creativeDirection.payoff}`,
        },
      ],
    };
  }

  return {
    duration,
    beats: [
      {
        type: "HOOK",
        startSecond: 0,
        endSecond: 2,
        objective: `Show the first impossible detail: ${creativeDirection.viralMechanism}`,
      },
      {
        type: "DISCOVERY",
        startSecond: 2,
        endSecond: 6,
        objective: `The subject notices the problem: ${creativeDirection.coreConflict}`,
      },
      {
        type: "ACTION",
        startSecond: 6,
        endSecond: Math.round(duration * 0.55),
        objective: "The subject tests the impossible event through one clear physical action.",
      },
      {
        type: "REVEAL",
        startSecond: Math.round(duration * 0.55),
        endSecond: Math.round(duration * 0.8),
        objective: "The world around the subject confirms the event visually.",
      },
      {
        type: "PAYOFF",
        startSecond: Math.round(duration * 0.8),
        endSecond: duration,
        objective: `End with the strongest visual proof: ${creativeDirection.payoff}`,
      },
    ],
  };
}