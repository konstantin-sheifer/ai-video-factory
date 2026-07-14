export type StoryBeatType =
  | "HOOK"
  | "DISCOVERY"
  | "ACTION"
  | "ESCALATION"
  | "REVEAL"
  | "PAYOFF";

export type StoryBeat = {
  type: StoryBeatType;
  startSecond: number;
  endSecond: number;
  objective: string;
};

export type StoryTimeline = {
  duration: number;
  beats: StoryBeat[];
};

export type CreativeDirection = {
  title: string;
  idea: string;

  genre: string;
  audience: string;

  emotionalTrigger: string;
  viralMechanism: string;

  coreConflict: string;
  payoff: string;
};

export type VisualDirection = {
  visualStyle: string;

  mainSubject: string;

  environment: string;

  camera: string;

  lighting: string;

  colorPalette: string;

  continuityRules: string[];
};

export type VoiceoverScript = {
  fullText: string;
  estimatedDuration: number;
};

export type SubtitleLine = {
  startSecond: number;
  endSecond: number;
  text: string;
};

export type StoryPackage = {
  creativeDirection: CreativeDirection;

  timeline: StoryTimeline;

  visualDirection: VisualDirection;

  voiceover: VoiceoverScript;

  subtitles: SubtitleLine[];

  runwayPrompt: string;
};