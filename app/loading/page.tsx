"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Scene = {
  scene: number;
  visual: string;
  voiceover: string;
  subtitle: string;
};

type GeneratedScript = {
  title: string;
  hook: string;
  duration: string;
  autoStyle?: string;
  visualStyle?: string;
  mainSubject?: string;
  environment?: string;
  scenes: Scene[];
  cta: string;
};

type SubtitleItem = {
  id?: number;
  start: number;
  end: number;
  text: string;
};

type TimelineItem = {
  id: number;
  scene: number;
  start: number;
  end: number;
  duration: number;
  visual: string;
  voiceover: string;
  subtitle: string;
};

type RenderState =
  | "Preparing"
  | "Writing script"
  | "Building timeline"
  | "Generating video"
  | "Creating voice"
  | "Creating subtitles"
  | "Rendering"
  | "Saving project"
  | "Finalizing"
  | "Completed";

type StoredSession = {
  idea: string;
  projectId: string;
  videoUrl: string;
  audioUrl: string;
  finalVideoUrl: string;
  subtitles: SubtitleItem[];
  script: GeneratedScript | null;
  timeline: TimelineItem[];
  renderState: RenderState;
};

type SavedProject = {
  id: string;
  title: string;
  idea: string;
  videoUrl: string;
  audioUrl: string;
  thumbnailUrl: string;
  status: "draft" | "rendering" | "completed" | "published";
  platforms: string[];
  scriptJson?: unknown;
  timelineJson?: unknown;
  subtitlesJson?: unknown;
  settingsJson?: unknown;
  createdAt: string;
  updatedAt: string;
};

const IDEA_KEY = "ai-video-factory-idea";
const SESSION_KEY = "ai-video-factory-studio-session";
const PROJECTS_KEY = "ai-video-factory-projects";

const stages: RenderState[] = [
  "Preparing",
  "Writing script",
  "Building timeline",
  "Generating video",
  "Creating voice",
  "Creating subtitles",
  "Rendering",
  "Saving project",
  "Finalizing",
  "Completed",
];

const stageLabels: Record<RenderState, string> = {
  Preparing: "Preparing your idea",
  "Writing script": "Writing script",
  "Building timeline": "Creating scenes",
  "Generating video": "Generating video",
  "Creating voice": "Adding voice",
  "Creating subtitles": "Building subtitles",
  Rendering: "Rendering video",
  "Saving project": "Saving project",
  Finalizing: "Finalizing",
  Completed: "Completed",
};

export default function LoadingPage() {
  const router = useRouter();
  const hasStartedRef = useRef(false);

  const [progress, setProgress] = useState(3);
  const [renderState, setRenderState] = useState<RenderState>("Preparing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const savedIdea = getSavedIdea();

    if (!savedIdea.trim()) {
      setErrorMessage("Enter an idea on the home page first.");
      setProgress(0);
      return;
    }

    generatePipeline(savedIdea);
  }, []);

  function getSavedIdea() {
    return localStorage.getItem(IDEA_KEY) || "";
  }

  function setStage(stage: RenderState) {
    setRenderState(stage);

    const stageIndex = stages.indexOf(stage);
    const nextProgress = Math.min(
      96,
      Math.max(3, Math.round((stageIndex / (stages.length - 1)) * 100))
    );

    setProgress(nextProgress);
  }

  function saveProjectToLocalLibrary(project: SavedProject) {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      const existingProjects = raw ? (JSON.parse(raw) as SavedProject[]) : [];

      const withoutDuplicate = existingProjects.filter(
        (item) => item.id !== project.id
      );

      localStorage.setItem(
        PROJECTS_KEY,
        JSON.stringify([project, ...withoutDuplicate])
      );
    } catch {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify([project]));
    }
  }

  function saveSession(session: StoredSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async function saveGenerationToDatabase(input: {
    projectId: string;
    idea: string;
    prompt: string;
    videoProvider: string;
    voiceProvider: string;
    renderProvider: string;
    videoUrl: string;
    audioUrl: string;
    finalVideoUrl: string;
  }) {
    try {
      await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: input.projectId,
          idea: input.idea,
          prompt: input.prompt,
          status: "completed",
          videoProvider: input.videoProvider,
          voiceProvider: input.voiceProvider,
          renderProvider: input.renderProvider,
          videoUrl: input.videoUrl,
          audioUrl: input.audioUrl,
          finalVideoUrl: input.finalVideoUrl,
        }),
      });
    } catch {}
  }

  async function generatePipeline(savedIdea: string) {
    try {
      setErrorMessage("");
      localStorage.removeItem(SESSION_KEY);

      setStage("Writing script");

      const scriptResponse = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: savedIdea }),
      });

      const scriptData = await scriptResponse.json();
      const generatedScript = scriptData.script as GeneratedScript;

      if (!scriptResponse.ok || !generatedScript) {
        throw new Error("Script generation failed.");
      }

      setStage("Building timeline");

      const timelineResponse = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: generatedScript?.scenes || [],
          duration: generatedScript?.duration || "10 seconds",
        }),
      });

      const timelineData = await timelineResponse.json();
      const generatedTimeline = timelineData.timeline || [];

      const voiceoverText =
        generatedScript?.scenes?.map((scene) => scene.voiceover).join(" ") ||
        generatedScript?.hook ||
        savedIdea;

      const videoPrompt = buildVideoPrompt(savedIdea, generatedScript);

      setStage("Generating video");

      const videoResponse = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: videoPrompt }),
      });

      const videoData = await videoResponse.json();
      const generatedVideoUrl = String(videoData.videoUrl || "").trim();

      if (!videoResponse.ok || !generatedVideoUrl) {
        throw new Error("Video generation failed.");
      }

      setStage("Creating voice");

      const voiceResponse = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceoverText,
          voiceStyle: "cinematic",
        }),
      });

      const voiceData = await voiceResponse.json();

      if (!voiceResponse.ok) {
        throw new Error("Voice generation failed.");
      }

      setStage("Creating subtitles");

      const subtitlesResponse = await fetch("/api/subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceoverText,
          style: "viral",
          duration: 10,
        }),
      });

      const subtitlesData = await subtitlesResponse.json();
      const nextSubtitles = subtitlesData.subtitles || [];

      setStage("Rendering");

      const renderResponse = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: generatedVideoUrl,
          audioUrl: voiceData.audioUrl || "",
          subtitles: nextSubtitles,
          timeline: generatedTimeline,
          subtitlesEnabled: true,
          voiceoverEnabled: true,
          backgroundMusicEnabled: false,
          renderStyle: "viral",
        }),
      });

      const renderData = await renderResponse.json();

      if (renderData.renderId) {
        await checkRenderStatus(renderData.renderId);
      }

      setStage("Saving project");

      const nextVideoUrl = generatedVideoUrl;
      const nextAudioUrl = voiceData.audioUrl || "";
      const nextFinalVideoUrl = generatedVideoUrl;

      const settingsJson = {
        styleMode: "auto",
        autoStyle: generatedScript.autoStyle || "Auto",
        visualStyle: generatedScript.visualStyle || "",
        mainSubject: generatedScript.mainSubject || "",
        environment: generatedScript.environment || "",
        subtitlesEnabled: true,
        voiceoverEnabled: true,
        backgroundMusicEnabled: false,
        renderStyle: "viral",
        voiceStyle: "cinematic",
        videoProvider: videoData.provider || "runway",
        voiceProvider: voiceData.provider || "elevenlabs",
        renderProvider: renderData.provider || "mock",
      };

      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generatedScript?.title || "AI Generated Video",
          idea: savedIdea,
          videoUrl: nextFinalVideoUrl,
          audioUrl: nextAudioUrl,
          thumbnailUrl: nextFinalVideoUrl,
          status: "completed",
          platforms: [],
          scriptJson: generatedScript,
          timelineJson: generatedTimeline,
          subtitlesJson: nextSubtitles,
          settingsJson,
        }),
      });

      const projectData = await projectResponse.json();
      const nextProjectId = projectData.project?.id || crypto.randomUUID();

      await saveGenerationToDatabase({
        projectId: nextProjectId,
        idea: savedIdea,
        prompt: videoPrompt,
        videoProvider: videoData.provider || "runway",
        voiceProvider: voiceData.provider || "elevenlabs",
        renderProvider: renderData.provider || "mock",
        videoUrl: nextVideoUrl,
        audioUrl: nextAudioUrl,
        finalVideoUrl: nextFinalVideoUrl,
      });

      const savedProject: SavedProject = {
        id: nextProjectId,
        title: generatedScript?.title || "AI Generated Video",
        idea: savedIdea,
        videoUrl: nextFinalVideoUrl,
        audioUrl: nextAudioUrl,
        thumbnailUrl: nextFinalVideoUrl,
        status: "completed",
        platforms: [],
        scriptJson: generatedScript,
        timelineJson: generatedTimeline,
        subtitlesJson: nextSubtitles,
        settingsJson,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveProjectToLocalLibrary(savedProject);

      saveSession({
        idea: savedIdea,
        projectId: nextProjectId,
        videoUrl: nextVideoUrl,
        audioUrl: nextAudioUrl,
        finalVideoUrl: nextFinalVideoUrl,
        subtitles: nextSubtitles,
        script: generatedScript,
        timeline: generatedTimeline,
        renderState: "Completed",
      });

      setStage("Finalizing");
      setProgress(100);

      window.setTimeout(() => {
        router.replace(`/studio?projectId=${nextProjectId}`);
      }, 700);
    } catch (error) {
      console.error("Loading generation error:", error);
      setErrorMessage("Generation failed. Please try again.");
      setRenderState("Completed");
    }
  }

  async function checkRenderStatus(renderId: string) {
    try {
      await fetch("/api/render/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renderId }),
      });
    } catch {}
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <section className="w-full max-w-3xl text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-zinc-500">
          AI Video Factory
        </p>

        <h1 className="mt-6 text-4xl font-bold sm:text-6xl">
          Your video is being created
        </h1>

        <p className="mt-5 text-lg text-zinc-400">
          {errorMessage || `${stageLabels[renderState]}...`}
        </p>

        <div className="relative mx-auto mt-14 h-32 w-full max-w-2xl">
          <div className="absolute bottom-8 left-0 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div
            className="absolute bottom-10 transition-all duration-700"
            style={{ left: `calc(${progress}% - 34px)` }}
          >
            <ChromeRunnerDino />
          </div>
        </div>

        <p className="mt-8 text-sm text-zinc-500">{progress}%</p>
      </section>
    </main>
  );
}

function buildVideoPrompt(idea: string, script: GeneratedScript | null) {
  const firstScene = script?.scenes?.[0];

  const autoStyle = script?.autoStyle || "Auto";
  const visualStyle =
    script?.visualStyle ||
    "coherent short-form AI video style inferred from the idea";
  const mainSubject = script?.mainSubject || idea;
  const environment = script?.environment || "a setting that matches the idea";
  const visual = firstScene?.visual || idea;

  const prompt = [
    "Vertical 9:16 short-form video.",
    `User idea: ${idea}`,
    `Auto style: ${autoStyle}.`,
    `Visual style: ${visualStyle}.`,
    `Main subject: ${mainSubject}.`,
    `Environment/background: ${environment}.`,
    `Scene: ${visual}.`,
    "Keep the same subject and same environment throughout the entire clip.",
    "No unrelated background. No random setting changes. No text overlays. No logos. No watermark.",
    "Smooth camera movement, clear composition, high-quality lighting, strong visual storytelling.",
  ].join(" ");

  return prompt.length > 950 ? `${prompt.slice(0, 947).trim()}...` : prompt;
}

function ChromeRunnerDino() {
  return (
    <div className="dino">
      <div className="pixel p1" />
      <div className="pixel p2" />
      <div className="pixel p3" />
      <div className="pixel p4" />
      <div className="pixel p5" />
      <div className="pixel p6" />
      <div className="pixel p7" />
      <div className="pixel p8" />
      <div className="pixel p9" />
      <div className="pixel p10" />
      <div className="pixel p11" />
      <div className="pixel p12" />
      <div className="pixel p13" />
      <div className="pixel p14" />
      <div className="pixel p15" />
      <div className="pixel p16" />
      <div className="pixel p17" />
      <div className="pixel p18" />
      <div className="pixel p19" />
      <div className="pixel p20" />
      <div className="pixel p21" />
      <div className="pixel p22" />
      <div className="pixel p23" />
      <div className="pixel p24" />
      <div className="pixel p25" />
      <div className="pixel p26" />
      <div className="pixel p27" />
      <div className="pixel p28" />
      <div className="pixel p29" />
      <div className="pixel p30" />
      <div className="pixel p31" />
      <div className="pixel p32" />
      <div className="pixel p33" />
      <div className="pixel p34" />
      <div className="pixel p35" />
      <div className="pixel p36" />
      <div className="pixel p37" />
      <div className="pixel p38" />
      <div className="pixel p39" />
      <div className="pixel p40" />

      <div className="leg-a" />
      <div className="leg-b" />
      <div className="eye" />

      <style jsx>{`
        .dino {
          position: relative;
          width: 68px;
          height: 64px;
          image-rendering: pixelated;
          transform: scale(0.9);
          transform-origin: bottom center;
        }

        .pixel,
        .leg-a,
        .leg-b {
          position: absolute;
          width: 6px;
          height: 6px;
          background: white;
        }

        .eye {
          position: absolute;
          left: 54px;
          top: 12px;
          width: 4px;
          height: 4px;
          background: black;
          z-index: 2;
        }

        .p1 { left: 42px; top: 0; }
        .p2 { left: 48px; top: 0; }
        .p3 { left: 54px; top: 0; }
        .p4 { left: 60px; top: 0; }
        .p5 { left: 42px; top: 6px; }
        .p6 { left: 48px; top: 6px; }
        .p7 { left: 54px; top: 6px; }
        .p8 { left: 60px; top: 6px; }
        .p9 { left: 42px; top: 12px; }
        .p10 { left: 48px; top: 12px; }
        .p11 { left: 54px; top: 12px; }
        .p12 { left: 42px; top: 18px; }
        .p13 { left: 48px; top: 18px; }
        .p14 { left: 54px; top: 18px; }
        .p15 { left: 60px; top: 18px; }
        .p16 { left: 36px; top: 24px; }
        .p17 { left: 42px; top: 24px; }
        .p18 { left: 30px; top: 30px; }
        .p19 { left: 36px; top: 30px; }
        .p20 { left: 42px; top: 30px; }
        .p21 { left: 18px; top: 36px; }
        .p22 { left: 24px; top: 36px; }
        .p23 { left: 30px; top: 36px; }
        .p24 { left: 36px; top: 36px; }
        .p25 { left: 42px; top: 36px; }
        .p26 { left: 12px; top: 30px; }
        .p27 { left: 6px; top: 24px; }
        .p28 { left: 0; top: 18px; }
        .p29 { left: 18px; top: 42px; }
        .p30 { left: 24px; top: 42px; }
        .p31 { left: 30px; top: 42px; }
        .p32 { left: 36px; top: 42px; }
        .p33 { left: 42px; top: 42px; }
        .p34 { left: 24px; top: 48px; }
        .p35 { left: 30px; top: 48px; }
        .p36 { left: 36px; top: 48px; }
        .p37 { left: 48px; top: 36px; }
        .p38 { left: 54px; top: 42px; }
        .p39 { left: 48px; top: 24px; }
        .p40 { left: 54px; top: 24px; }

        .leg-a {
          left: 24px;
          top: 54px;
          animation: leg-a-run 0.2s infinite steps(1);
        }

        .leg-b {
          left: 36px;
          top: 54px;
          animation: leg-b-run 0.2s infinite steps(1);
        }

        @keyframes leg-a-run {
          0% { height: 12px; transform: translateY(0); }
          50% { height: 6px; transform: translateY(6px); }
          100% { height: 12px; transform: translateY(0); }
        }

        @keyframes leg-b-run {
          0% { height: 6px; transform: translateY(6px); }
          50% { height: 12px; transform: translateY(0); }
          100% { height: 6px; transform: translateY(6px); }
        }
      `}</style>
    </div>
  );
}
