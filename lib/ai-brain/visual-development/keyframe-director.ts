import type { Storyboard } from "./storyboard-director";

export type VisualContract = {
  lockedCharacter: boolean;
  lockedLocation: boolean;
  lockedLighting: boolean;
  lockedCamera: boolean;
  lockedPalette: boolean;
  requiredObjects: string[];
  forbiddenObjects: string[];
};

export type KeyFrame = {
  id: string;
  sourceFrameId: string;
  title: string;
  imagePrompt: string;
  purpose: string;
  visualContract: VisualContract;
};

export type KeyFramePackage = {
  storyboardId: string;
  keyFrames: KeyFrame[];
};

export function createKeyFrames(
  storyboard: Storyboard
): KeyFramePackage {
  return {
    storyboardId: storyboard.productionBibleId,
    keyFrames: storyboard.frames.map((frame, index) => ({
      id: `keyframe-${index + 1}`,
      sourceFrameId: frame.id,
      title: frame.type,
      purpose: frame.purpose,
      imagePrompt: [
        frame.visualDescription,
        frame.subjectAction,
        frame.cameraDirection,
        frame.composition,
        "Ultra-realistic cinematic frame.",
        "No text. No watermark. No logo."
      ].join(" "),
      visualContract: {
        lockedCharacter: true,
        lockedLocation: true,
        lockedLighting: true,
        lockedCamera: true,
        lockedPalette: true,
        requiredObjects: frame.mustShow,
        forbiddenObjects: frame.mustAvoid,
      },
    })),
  };
}
