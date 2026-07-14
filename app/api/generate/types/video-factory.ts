export type ProjectStatus =
  | "draft"
  | "planning"
  | "generating"
  | "preview"
  | "exported"
  | "published";

export type GenerationMode = "mock" | "real";

export type GenerationJobType =
  | "script"
  | "scene_plan"
  | "voiceover"
  | "image"
  | "video"
  | "subtitles"
  | "hashtags"
  | "music"
  | "export";

export interface Character {
  id: string;
  projectId: string;

  name: string;
  role: string;

  age?: string;

  appearance: string;
  outfit: string;
  personality: string;

  voiceStyle?: string;

  referenceImageUrl?: string;

  consistencyPrompt: string;
}

export interface StyleBible {
  id: string;
  projectId: string;

  genre: string;

  visualStyle: string;

  colorPalette: string;

  lighting: string;

  cameraStyle: string;

  pacing: string;

  mood: string;

  negativePrompt?: string;
}

export interface Scene {
  id: string;
  projectId: string;

  sceneNumber: number;

  title: string;

  narrationText: string;

  visualDescription: string;

  cameraDirection?: string;

  mood?: string;

  location?: string;

  charactersInScene: string[];

  continuityNotes?: string;

  prompt?: string;

  imageUrl?: string;

  videoUrl?: string;

  durationSeconds: number;

  status: ProjectStatus;
}

export interface VoiceoverTrack {
  id: string;

  projectId: string;

  provider?: string;

  script: string;

  audioUrl?: string;

  durationSeconds?: number;
}

export interface SubtitleTrack {
  id: string;

  projectId: string;

  language: string;

  subtitleUrl?: string;
}

export interface HashtagSet {
  id: string;

  projectId: string;

  hashtags: string[];
}

export interface GenerationJob {
  id: string;

  userId: string;

  projectId: string;

  sceneId?: string;

  type: GenerationJobType;

  provider?: string;

  mode: GenerationMode;

  inputHash?: string;

  status: "queued" | "running" | "completed" | "failed";

  costEstimate?: number;

  actualCost?: number;

  resultUrl?: string;

  errorMessage?: string;

  createdAt: string;
}

export interface ExportTask {
  id: string;

  projectId: string;

  status: "queued" | "running" | "completed" | "failed";

  exportUrl?: string;

  createdAt: string;
}

export interface PublishTask {
  id: string;

  projectId: string;

  platform:
    | "youtube"
    | "tiktok"
    | "instagram";

  status: "queued" | "running" | "completed" | "failed";

  scheduledFor?: string;

  publishedUrl?: string;
}

export interface Project {
  id: string;

  userId: string;

  title: string;

  idea: string;

  mode: "custom" | "surprise";

  status: ProjectStatus;

  durationTarget: number;

  aspectRatio: "9:16";

  styleBibleId?: string;

  characters: Character[];

  scenes: Scene[];

  voiceover?: VoiceoverTrack;

  subtitles?: SubtitleTrack;

  hashtags?: HashtagSet;

  exportUrl?: string;

  createdAt: string;

  updatedAt: string;
}