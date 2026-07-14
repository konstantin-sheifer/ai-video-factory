import type { CreativeBrief } from "../creative-brief";
import type { ProductionBible } from "./movie-bible";

export type StoryboardFrameType =
  | "OPENING_HOOK"
  | "DISCOVERY"
  | "ACTION_TEST"
  | "ESCALATION"
  | "PAYOFF";

export type StoryboardFrame = {
  id: string;
  type: StoryboardFrameType;
  timeRange: {
    startSecond: number;
    endSecond: number;
  };
  purpose: string;
  visualDescription: string;
  subjectAction: string;
  cameraDirection: string;
  composition: string;
  mustShow: string[];
  mustAvoid: string[];
};

export type Storyboard = {
  productionBibleId: string;
  creativeBriefId?: string;
  format: ProductionBible["source"]["format"];
  duration: number;
  frames: StoryboardFrame[];
  continuityRules: string[];
};

export function createStoryboard(
  bible: ProductionBible,
  creativeBrief?: CreativeBrief
): Storyboard {
  if (!creativeBrief) {
    return createLegacyStoryboard(bible);
  }

  const beatCount = clamp(creativeBrief.creative.targetBeatCount, 3, 5);
  const ranges = createTimeRanges(creativeBrief.duration, beatCount);
  const frames = buildFrames({
    bible,
    brief: creativeBrief,
    ranges,
    beatCount,
  });

  return {
    productionBibleId: bible.id,
    creativeBriefId: creativeBrief.id,
    format: bible.source.format,
    duration: creativeBrief.duration,
    frames,
    continuityRules: [
      ...bible.visualLanguage.continuityRules,
      ...bible.characters.identityLock,
      "same visual style from first frame to last frame",
      "same lighting from first frame to last frame",
      "same location from first frame to last frame",
      "every beat must create new visual information",
      creativeBrief.rules.actionPrinciple,
    ],
  };
}

function buildFrames(input: {
  bible: ProductionBible;
  brief: CreativeBrief;
  ranges: Array<{ startSecond: number; endSecond: number }>;
  beatCount: number;
}): StoryboardFrame[] {
  const { bible, brief, ranges, beatCount } = input;

  if (beatCount <= 3) {
    return [
      makeFrame({
        id: "frame-a-opening-hook",
        type: "OPENING_HOOK",
        range: ranges[0],
        bible,
        brief,
        purpose: "Hook the viewer immediately with the strongest visible promise.",
        visualDescription: brief.creative.hook,
        subjectAction:
          "The main subject is already in the correct location and reacts to the impossible detail.",
        cameraDirection:
          "Open with a strong cinematic frame showing subject, location, and key object.",
        composition:
          "The first frame must be readable immediately, with no empty setup.",
      }),
      makeFrame({
        id: "frame-b-core-event",
        type: "ACTION_TEST",
        range: ranges[1],
        bible,
        brief,
        purpose: "Show the core event through one deliberate physical action.",
        visualDescription: brief.creative.coreEvent,
        subjectAction:
          "The main subject actively tests or triggers the central event.",
        cameraDirection:
          "Use a controlled push-in or tracking movement focused on the action.",
        composition:
          "The subject, key object, and cause-effect action must be visible together.",
      }),
      makeFrame({
        id: "frame-c-final-payoff",
        type: "PAYOFF",
        range: ranges[2],
        bible,
        brief,
        purpose: "End with a final image that proves the idea.",
        visualDescription: brief.creative.payoff,
        subjectAction:
          "The main subject reacts to the final proof while staying in the same location.",
        cameraDirection:
          "Hold the final composition long enough for the viewer to understand the payoff.",
        composition:
          "The final image must be centered, readable, and strong enough to work as a thumbnail.",
      }),
    ];
  }

  if (beatCount === 4) {
    return [
      makeFrame({
        id: "frame-a-opening-hook",
        type: "OPENING_HOOK",
        range: ranges[0],
        bible,
        brief,
        purpose: "Show the hook in the first second.",
        visualDescription: brief.creative.hook,
        subjectAction:
          "The main subject notices the unusual detail immediately.",
        cameraDirection:
          "Open with a cinematic establishing frame and begin a slow push toward the mystery.",
        composition:
          "Subject, location, and impossible detail must be visible immediately.",
      }),
      makeFrame({
        id: "frame-b-discovery",
        type: "DISCOVERY",
        range: ranges[1],
        bible,
        brief,
        purpose:
          "Let the viewer understand what is wrong through a clear character reaction.",
        visualDescription:
          "The main subject realizes the situation is not normal.",
        subjectAction:
          "The main subject reacts with a small realistic movement and focuses on the key object.",
        cameraDirection:
          "Move into a medium shot while keeping the key object readable.",
        composition:
          "The viewer must understand the mystery without needing narration.",
      }),
      makeFrame({
        id: "frame-c-escalation",
        type: "ESCALATION",
        range: ranges[2],
        bible,
        brief,
        purpose: "Escalate the event so the mystery becomes undeniable.",
        visualDescription: brief.creative.escalation,
        subjectAction:
          "The main subject actively tests the mystery or steps back as the event becomes stronger.",
        cameraDirection:
          "Use a controlled reveal or push-in to show the stronger evidence.",
        composition: "Character reaction and visual proof must both be visible.",
      }),
      makeFrame({
        id: "frame-d-final-payoff",
        type: "PAYOFF",
        range: ranges[3],
        bible,
        brief,
        purpose: "Deliver the memorable final proof of the idea.",
        visualDescription: brief.creative.payoff,
        subjectAction:
          "The main subject freezes, reacts, or completes one small action as the final proof appears.",
        cameraDirection:
          "Hold the final frame with strong cinematic composition.",
        composition:
          "Final payoff must be clear, physical, and impossible to miss.",
      }),
    ];
  }

  return [
    makeFrame({
      id: "frame-a-opening-hook",
      type: "OPENING_HOOK",
      range: ranges[0],
      bible,
      brief,
      purpose:
        "Instantly hook the viewer with location, subject, and impossible detail.",
      visualDescription: brief.creative.hook,
      subjectAction:
        "The main subject enters or is already present and immediately notices the strange detail.",
      cameraDirection: "Open with a strong cinematic frame; no slow empty setup.",
      composition:
        "Subject, location, and key object must be visible in the first frame.",
    }),
    makeFrame({
      id: "frame-b-discovery",
      type: "DISCOVERY",
      range: ranges[1],
      bible,
      brief,
      purpose: "Show the first clear discovery through a physical reaction.",
      visualDescription:
        "The main subject notices the first proof that something is wrong.",
      subjectAction:
        "The main subject shifts attention, looks closer, or changes body posture to confirm the detail.",
      cameraDirection:
        "Push from establishing frame into a readable medium shot.",
      composition:
        "The changed detail must be visible in the same frame as the subject.",
    }),
    makeFrame({
      id: "frame-c-action-test",
      type: "ACTION_TEST",
      range: ranges[2],
      bible,
      brief,
      purpose:
        "Make the character actively test the mystery instead of passively watching.",
      visualDescription: brief.creative.coreEvent,
      subjectAction:
        "The main subject performs one deliberate physical action that tests the impossible event.",
      cameraDirection:
        "Use controlled tracking or close push-in focused on the action.",
      composition:
        "Cause and effect must be readable: action first, result second.",
    }),
    makeFrame({
      id: "frame-d-escalation",
      type: "ESCALATION",
      range: ranges[3],
      bible,
      brief,
      purpose: "Escalate with stronger visual proof before the final reveal.",
      visualDescription: brief.creative.escalation,
      subjectAction:
        "The main subject reacts as the environment or key object proves the event is real.",
      cameraDirection:
        "Shift attention from the subject to the visual proof without changing location.",
      composition:
        "Character reaction and proof must stay connected in one coherent shot.",
    }),
    makeFrame({
      id: "frame-e-final-payoff",
      type: "PAYOFF",
      range: ranges[4],
      bible,
      brief,
      purpose: "End with one unforgettable visual image.",
      visualDescription: brief.creative.payoff,
      subjectAction:
        "The main subject freezes, steps back, or completes one small reaction as the final proof appears.",
      cameraDirection:
        "Hold a clean final frame with a slow cinematic push-in.",
      composition:
        "Final payoff must be centered, readable, and strong enough to be the thumbnail.",
    }),
  ];
}

function makeFrame(input: {
  id: string;
  type: StoryboardFrameType;
  range: { startSecond: number; endSecond: number };
  bible: ProductionBible;
  brief: CreativeBrief;
  purpose: string;
  visualDescription: string;
  subjectAction: string;
  cameraDirection: string;
  composition: string;
}): StoryboardFrame {
  return {
    id: input.id,
    type: input.type,
    timeRange: input.range,
    purpose: input.purpose,
    visualDescription: input.visualDescription,
    subjectAction: input.subjectAction,
    cameraDirection: input.cameraDirection,
    composition: input.composition,
    mustShow: [
      input.bible.characters.mainCharacter,
      input.bible.world.primaryLocation,
      ...input.bible.providerAgnosticRules.mustShow,
      input.brief.creative.coreEvent,
      input.brief.creative.payoff,
    ],
    mustAvoid: [
      ...input.bible.providerAgnosticRules.mustAvoid,
      ...input.brief.rules.mustAvoid,
    ],
  };
}

function createTimeRanges(duration: number, beatCount: number) {
  const safeDuration = Math.max(5, Math.round(duration));

  if (beatCount <= 3) {
    return [
      { startSecond: 0, endSecond: Math.max(1, Math.round(safeDuration * 0.25)) },
      {
        startSecond: Math.max(1, Math.round(safeDuration * 0.25)),
        endSecond: Math.round(safeDuration * 0.72),
      },
      { startSecond: Math.round(safeDuration * 0.72), endSecond: safeDuration },
    ];
  }

  if (beatCount === 4) {
    return [
      { startSecond: 0, endSecond: Math.max(1, Math.round(safeDuration * 0.18)) },
      {
        startSecond: Math.max(1, Math.round(safeDuration * 0.18)),
        endSecond: Math.round(safeDuration * 0.4),
      },
      {
        startSecond: Math.round(safeDuration * 0.4),
        endSecond: Math.round(safeDuration * 0.75),
      },
      { startSecond: Math.round(safeDuration * 0.75), endSecond: safeDuration },
    ];
  }

  return [
    { startSecond: 0, endSecond: Math.max(1, Math.round(safeDuration * 0.12)) },
    {
      startSecond: Math.max(1, Math.round(safeDuration * 0.12)),
      endSecond: Math.round(safeDuration * 0.3),
    },
    {
      startSecond: Math.round(safeDuration * 0.3),
      endSecond: Math.round(safeDuration * 0.5),
    },
    {
      startSecond: Math.round(safeDuration * 0.5),
      endSecond: Math.round(safeDuration * 0.78),
    },
    { startSecond: Math.round(safeDuration * 0.78), endSecond: safeDuration },
  ];
}

function createLegacyStoryboard(bible: ProductionBible): Storyboard {
  return {
    productionBibleId: bible.id,
    format: bible.source.format,
    duration: bible.source.duration,
    frames: [
      {
        id: "frame-a-opening-hook",
        type: "OPENING_HOOK",
        timeRange: { startSecond: 0, endSecond: 2 },
        purpose:
          "Immediately prove the location, main subject, and central mystery.",
        visualDescription: bible.story.hook,
        subjectAction:
          "The main character is already inside the correct location and notices the first impossible detail.",
        cameraDirection:
          "Start with a clear cinematic establishing frame, then slowly push toward the main subject and key object.",
        composition:
          "Main character, key object, and location must all be visible in the first frame.",
        mustShow: [
          bible.characters.mainCharacter,
          bible.world.primaryLocation,
          ...bible.providerAgnosticRules.mustShow.slice(0, 2),
        ],
        mustAvoid: bible.providerAgnosticRules.mustAvoid,
      },
      {
        id: "frame-b-discovery-escalation",
        type: "ESCALATION",
        timeRange: { startSecond: 2, endSecond: 7 },
        purpose:
          "Show the impossible event becoming undeniable through visible physical evidence.",
        visualDescription: `${bible.story.mystery} ${bible.story.escalation}`,
        subjectAction:
          "The main character performs one small realistic action that tests the mystery and reveals the event.",
        cameraDirection:
          "Keep one continuous shot with controlled camera movement; do not cut away from the key object.",
        composition:
          "The key object must remain readable and central while the character reacts naturally.",
        mustShow: [
          bible.creative.coreConflict,
          ...bible.world.keyProps.slice(0, 3),
        ],
        mustAvoid: bible.providerAgnosticRules.mustAvoid,
      },
      {
        id: "frame-c-final-payoff",
        type: "PAYOFF",
        timeRange: { startSecond: 7, endSecond: bible.source.duration },
        purpose:
          "End with one strong final image that proves the idea without explanation.",
        visualDescription: bible.story.payoff,
        subjectAction:
          "The main character stops or reacts quietly while the final visual proof appears in the same location.",
        cameraDirection:
          "Hold the final frame long enough for the viewer to understand the payoff.",
        composition:
          "Final payoff must be centered or clearly visible; no important object may be cropped.",
        mustShow: [
          bible.creative.finalPayoff,
          ...bible.providerAgnosticRules.mustShow.slice(-2),
        ],
        mustAvoid: bible.providerAgnosticRules.mustAvoid,
      },
    ],
    continuityRules: [
      ...bible.visualLanguage.continuityRules,
      ...bible.characters.identityLock,
      "same visual style from first frame to last frame",
      "same lighting from first frame to last frame",
      "same location from first frame to last frame",
      "no unrelated location",
      "no random stock-video person",
    ],
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max);
}
