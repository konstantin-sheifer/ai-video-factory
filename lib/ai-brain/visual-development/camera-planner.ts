import type { KeyFramePackage } from "./keyframe-director";

export type CameraShotType =
  | "ESTABLISHING"
  | "PUSH_IN"
  | "MEDIUM_REVEAL"
  | "ACTION_TRACKING"
  | "REACTION_CLOSEUP"
  | "PAYOFF_HOLD";

export type CameraShot = {
  id: string;
  type: CameraShotType;
  timeRange: {
    startSecond: number;
    endSecond: number;
  };
  cameraMove: string;
  lensLanguage: string;
  framing: string;
  purpose: string;
  mustShow: string[];
  mustAvoid: string[];
};

export type CameraPlan = {
  keyFramePackageId?: string;
  storyboardId?: string;
  duration: number;
  shots: CameraShot[];
  globalCameraRules: string[];
};

type SourceFrame = {
  id: string;
  type?: string;
  purpose?: string;
  timeRange?: {
    startSecond: number;
    endSecond: number;
  };
  visualDescription?: string;
  subjectAction?: string;
  cameraDirection?: string;
  composition?: string;
  mustShow?: string[];
  mustAvoid?: string[];
};

export function createCameraPlan(keyframes: KeyFramePackage): CameraPlan {
  const source = keyframes as unknown as Record<string, unknown>;
  const frames = getSourceFrames(source);
  const duration = getDuration(source, frames);

  const shots = frames.map((frame, index) =>
    createShotFromFrame(frame, index, frames.length, duration)
  );

  return {
    keyFramePackageId: getString(source.id),
    storyboardId: getString(source.storyboardId),
    duration,
    shots,
    globalCameraRules: [
      "Camera must tell the story, not merely observe the scene.",
      "Every camera move must reveal new visual information or increase tension.",
      "No random cuts, no montage, no unrelated close-ups.",
      "Keep the same location, subject identity, wardrobe, lighting, and visual style.",
      "Protect the final payoff: final frame must be centered, readable, and strong enough to work as a thumbnail.",
      "Use cinematic movement: establishing frame, controlled push-in, medium reveal, action tracking, reaction close-up, final payoff hold.",
      "Avoid passive security-camera framing.",
      "Avoid empty waiting; if the subject is still, the environment or camera must create visual tension.",
    ],
  };
}

function createShotFromFrame(
  frame: SourceFrame,
  index: number,
  total: number,
  duration: number
): CameraShot {
  const type = getShotType(frame, index, total);
  const timeRange = frame.timeRange || createFallbackRange(index, total, duration);

  return {
    id: `camera-shot-${index + 1}-${type.toLowerCase()}`,
    type,
    timeRange,
    cameraMove: getCameraMove(type, frame),
    lensLanguage: getLensLanguage(type),
    framing: getFraming(type, frame),
    purpose: getPurpose(type, frame),
    mustShow: getArray(frame.mustShow),
    mustAvoid: [
      ...getArray(frame.mustAvoid),
      "random camera shake",
      "unmotivated zoom",
      "confusing montage",
      "sudden location change",
      "cropped final payoff",
      "generic stock-video framing",
    ],
  };
}

function getShotType(
  frame: SourceFrame,
  index: number,
  total: number
): CameraShotType {
  const frameType = (frame.type || "").toUpperCase();

  if (index === 0 || frameType.includes("OPENING")) {
    return "ESTABLISHING";
  }

  if (index === total - 1 || frameType.includes("PAYOFF")) {
    return "PAYOFF_HOLD";
  }

  if (frameType.includes("ACTION")) {
    return "ACTION_TRACKING";
  }

  if (frameType.includes("ESCALATION")) {
    return "MEDIUM_REVEAL";
  }

  if (frameType.includes("DISCOVERY")) {
    return "REACTION_CLOSEUP";
  }

  return "PUSH_IN";
}

function getCameraMove(type: CameraShotType, frame: SourceFrame) {
  const originalDirection = getString(frame.cameraDirection);

  const moves: Record<CameraShotType, string> = {
    ESTABLISHING:
      "Start with a strong cinematic establishing frame, then begin a slow push-in toward the subject and key object.",
    PUSH_IN:
      "Use a smooth controlled push-in that increases attention without changing location.",
    MEDIUM_REVEAL:
      "Shift from subject reaction to the changed object with a clean medium reveal.",
    ACTION_TRACKING:
      "Track the character's physical test in one readable movement, keeping cause and effect in frame.",
    REACTION_CLOSEUP:
      "Move into a controlled reaction close-up while keeping the key object or threat visible enough to understand the scene.",
    PAYOFF_HOLD:
      "Hold the final payoff with a slow cinematic push-in; do not cut away before the viewer understands the final image.",
  };

  return originalDirection
    ? `${moves[type]} Original direction: ${originalDirection}`
    : moves[type];
}

function getLensLanguage(type: CameraShotType) {
  const language: Record<CameraShotType, string> = {
    ESTABLISHING:
      "24-28mm cinematic wide lens feel; enough environment to understand the location immediately.",
    PUSH_IN:
      "35mm natural cinematic lens feel; balanced subject and environment visibility.",
    MEDIUM_REVEAL:
      "35-50mm medium lens feel; readable subject reaction and key object change.",
    ACTION_TRACKING:
      "35mm controlled handheld or dolly feel; physical action stays readable.",
    REACTION_CLOSEUP:
      "50mm close lens feel; emotional reaction is clear without losing story context.",
    PAYOFF_HOLD:
      "35-50mm hero frame; final object and character reaction are both legible.",
  };

  return language[type];
}

function getFraming(type: CameraShotType, frame: SourceFrame) {
  const originalComposition = getString(frame.composition);

  const framing: Record<CameraShotType, string> = {
    ESTABLISHING:
      "Subject, location, and key object must be visible in the first frame.",
    PUSH_IN:
      "Frame the subject in foreground or midground with the key object still readable.",
    MEDIUM_REVEAL:
      "Compose the shot so the viewer sees what changed and why it matters.",
    ACTION_TRACKING:
      "Keep the character's action and the resulting visual change in one coherent frame.",
    REACTION_CLOSEUP:
      "Show the character's reaction clearly, but do not crop out the story evidence.",
    PAYOFF_HOLD:
      "Center the final proof. No important object may be cropped. Frame must work as a thumbnail.",
  };

  return originalComposition
    ? `${framing[type]} Composition requirement: ${originalComposition}`
    : framing[type];
}

function getPurpose(type: CameraShotType, frame: SourceFrame) {
  const framePurpose = getString(frame.purpose);
  const frameVisual = getString(frame.visualDescription);

  const purpose: Record<CameraShotType, string> = {
    ESTABLISHING:
      "Make the viewer understand the world, subject, and hook immediately.",
    PUSH_IN:
      "Increase attention and guide the viewer toward the central mystery.",
    MEDIUM_REVEAL:
      "Reveal stronger evidence that the event is real.",
    ACTION_TRACKING:
      "Make the scene active by showing a deliberate physical test or cause-effect action.",
    REACTION_CLOSEUP:
      "Make the character's emotional discovery readable.",
    PAYOFF_HOLD:
      "Deliver the final visual proof clearly and memorably.",
  };

  return [purpose[type], framePurpose, frameVisual]
    .filter(Boolean)
    .join(" ");
}

function getSourceFrames(source: Record<string, unknown>): SourceFrame[] {
  const directFrames = source.frames;

  if (Array.isArray(directFrames)) {
    return directFrames as SourceFrame[];
  }

  const keyframes = source.keyframes;

  if (Array.isArray(keyframes)) {
    return keyframes as SourceFrame[];
  }

  const items = source.items;

  if (Array.isArray(items)) {
    return items as SourceFrame[];
  }

  return [
    {
      id: "fallback-opening",
      type: "OPENING_HOOK",
      timeRange: { startSecond: 0, endSecond: 2 },
      visualDescription:
        "Opening hook with subject, location, and key object visible.",
    },
    {
      id: "fallback-action",
      type: "ACTION_TEST",
      timeRange: { startSecond: 2, endSecond: 7 },
      visualDescription:
        "The subject performs one physical action that reveals the story.",
    },
    {
      id: "fallback-payoff",
      type: "PAYOFF",
      timeRange: { startSecond: 7, endSecond: 10 },
      visualDescription:
        "Final visual proof appears clearly in the same location.",
    },
  ];
}

function getDuration(source: Record<string, unknown>, frames: SourceFrame[]) {
  const duration = source.duration;

  if (typeof duration === "number" && Number.isFinite(duration)) {
    return duration;
  }

  const lastFrame = frames[frames.length - 1];
  const endSecond = lastFrame?.timeRange?.endSecond;

  if (typeof endSecond === "number" && Number.isFinite(endSecond)) {
    return endSecond;
  }

  return 10;
}

function createFallbackRange(index: number, total: number, duration: number) {
  const startSecond = Math.round((duration / total) * index);
  const endSecond =
    index === total - 1
      ? duration
      : Math.round((duration / total) * (index + 1));

  return { startSecond, endSecond };
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item)).filter(Boolean);
}
