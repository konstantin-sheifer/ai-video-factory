"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

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
  runwayPrompt?: string;
};

type VideoBrief = {
  idea: string;
  autoStyle: string;
  visualStyle: string;
  mainSubject: string;
  environment: string;
  sceneVisual: string;
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

type Platform = "TikTok" | "YouTube Shorts" | "Instagram Reels";
type PlatformId = "youtube" | "tiktok" | "instagram";
type VoiceStyle =
  | "cinematic"
  | "male"
  | "female"
  | "narrator"
  | "storyteller"
  | "energetic"
  | "calm";

type PlatformApiItem = {
  id: PlatformId;
  name: Platform;
  connected: boolean;
  accountName: string;
  followers: number;
  videos: number;
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
const CONTENT_QUEUE_KEY = "ai-video-factory-content-queue";
const SELECTED_QUEUE_IDEA_KEY = "ai-video-factory-selected-queue-idea";

const fallbackConnectedPlatforms: Platform[] = ["TikTok", "YouTube Shorts"];

const fallbackPlatformItems: PlatformApiItem[] = [
  {
    id: "youtube",
    name: "YouTube Shorts",
    connected: true,
    accountName: "Demo YouTube Channel",
    followers: 0,
    videos: 0,
  },
  {
    id: "tiktok",
    name: "TikTok",
    connected: true,
    accountName: "@demo_tiktok_account",
    followers: 0,
    videos: 0,
  },
  {
    id: "instagram",
    name: "Instagram Reels",
    connected: false,
    accountName: "",
    followers: 0,
    videos: 0,
  },
];

const voiceStyleOptions: { id: VoiceStyle; label: string }[] = [
  { id: "cinematic", label: "Cinematic" },
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "narrator", label: "Narrator" },
  { id: "storyteller", label: "Storyteller" },
  { id: "energetic", label: "Energetic" },
  { id: "calm", label: "Calm" },
];

export default function StudioPage() {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get("projectId");
  const shouldGenerate = searchParams.get("generate") === "1";
  const hasStartedRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [projectId, setProjectId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [finalVideoUrl, setFinalVideoUrl] = useState("");
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  const [loading, setLoading] = useState(true);
  const [renderState, setRenderState] = useState<RenderState>("Preparing");

  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>("cinematic");

  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);
  const [platformItems, setPlatformItems] = useState<PlatformApiItem[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [publishStatus, setPublishStatus] = useState(
    "Open a project or start a new video from the home page."
  );
  const [publishing, setPublishing] = useState(false);

  const [downloadStatus, setDownloadStatus] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    if (urlProjectId) {
      loadProjectFromDatabase(urlProjectId);
      return;
    }

    if (shouldGenerate) {
      const savedIdea = getSavedIdea();
      generatePipeline(savedIdea);
      return;
    }

    const savedIdea = getSavedIdea();
    const restored = restoreSession(savedIdea);

    if (restored) {
      restoreStudioState(restored);
      setLoading(false);
      return;
    }

    setLoading(false);
    setRenderState("Completed");
    setPublishStatus("Open a project or start a new video from the home page.");
  }, [urlProjectId, shouldGenerate]);

  useEffect(() => {
    loadConnectedPlatforms();
  }, []);

  useEffect(() => {
    const itemCount = timeline.length || subtitles.length;

    if (!itemCount) return;

    const timer = window.setInterval(() => {
      setCurrentSceneIndex((current) => {
        if (current >= itemCount - 1) return 0;
        return current + 1;
      });
    }, 3500);

    return () => window.clearInterval(timer);
  }, [timeline.length, subtitles.length]);

  async function loadConnectedPlatforms() {
    try {
      setPlatformsLoading(true);

      const response = await fetch("/api/platforms", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load platforms.");
      }

      const data = (await response.json()) as PlatformApiItem[];
      const platformList = Array.isArray(data) && data.length ? data : fallbackPlatformItems;
      const connectedPlatforms = platformList
        .filter((platform) => platform.connected)
        .map((platform) => platform.name);

      setPlatformItems(platformList);
      setAvailablePlatforms(connectedPlatforms);
      setSelectedPlatforms((current) =>
        current.filter((platform) => connectedPlatforms.includes(platform))
      );
    } catch (error) {
      console.error("Studio platforms load error:", error);
      setPlatformItems(fallbackPlatformItems);
      setAvailablePlatforms(fallbackConnectedPlatforms);
      setSelectedPlatforms((current) =>
        current.filter((platform) => fallbackConnectedPlatforms.includes(platform))
      );
    } finally {
      setPlatformsLoading(false);
    }
  }

  function getSavedIdea() {
    return (
      localStorage.getItem(IDEA_KEY) ||
      "A cinematic futuristic AI-generated short video about creativity and technology."
    );
  }

  function restoreSession(currentIdea: string): StoredSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const session = JSON.parse(raw) as StoredSession;

      if (!session.finalVideoUrl && !session.videoUrl) return null;
      if (session.idea !== currentIdea) return null;

      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function restoreStudioState(session: StoredSession) {
    setProjectId(session.projectId || "");
    setVideoUrl(session.videoUrl || "");
    setAudioUrl(session.audioUrl || "");
    setFinalVideoUrl(session.finalVideoUrl || session.videoUrl || "");
    setSubtitles(session.subtitles || []);
    setScript(session.script || null);
    setTimeline(session.timeline || []);
    setRenderState(session.renderState || "Completed");
    setPublishStatus("Select platforms to publish.");
    setDownloadStatus("");
    setCurrentSceneIndex(0);
    setCurrentVideoTime(0);
  }

  function saveSession(session: StoredSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async function loadProjectFromDatabase(id: string) {
    try {
      setLoading(true);
      setRenderState("Preparing");
      setDownloadStatus("");
      setPublishStatus("Select platforms to publish.");
      clearPlaybackState();

      const response = await fetch(`/api/projects/${id}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.project) {
        setPublishStatus("Project could not be loaded.");
        setRenderState("Completed");
        return;
      }

      const project = data.project as SavedProject;

      const restoredScript = isGeneratedScript(project.scriptJson)
        ? project.scriptJson
        : buildFallbackScript(project);

      const restoredTimeline = isTimeline(project.timelineJson)
        ? project.timelineJson
        : [];

      const restoredSubtitles = isSubtitles(project.subtitlesJson)
        ? project.subtitlesJson
        : buildFallbackSubtitles(project);

      setProjectId(project.id);
      setVideoUrl(project.videoUrl || "");
      setAudioUrl(project.audioUrl || "");
      setFinalVideoUrl(project.videoUrl || "");
      setScript(restoredScript);
      setTimeline(restoredTimeline);
      setSubtitles(restoredSubtitles);
      setRenderState("Completed");
      setPublishStatus("Select platforms to publish.");

      saveSession({
        idea: project.idea,
        projectId: project.id,
        videoUrl: project.videoUrl || "",
        audioUrl: project.audioUrl || "",
        finalVideoUrl: project.videoUrl || "",
        subtitles: restoredSubtitles,
        script: restoredScript,
        timeline: restoredTimeline,
        renderState: "Completed",
      });
    } catch {
      setPublishStatus("Project could not be loaded.");
      setRenderState("Completed");
    } finally {
      setLoading(false);
    }
  }

  function clearPlaybackState() {
    audioRef.current?.pause();

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    setProjectId("");
    setVideoUrl("");
    setAudioUrl("");
    setFinalVideoUrl("");
    setSubtitles([]);
    setTimeline([]);
    setScript(null);
    setCurrentSceneIndex(0);
    setCurrentVideoTime(0);
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

  function markQueueItemAsVideo(projectId: string) {
    try {
      const selectedRaw = localStorage.getItem(SELECTED_QUEUE_IDEA_KEY);
      if (!selectedRaw) return;

      const selected = JSON.parse(selectedRaw) as {
        queueItemId?: string;
        idea?: string;
        channelName?: string;
      };

      if (!selected.queueItemId) return;

      const queueRaw = localStorage.getItem(CONTENT_QUEUE_KEY);
      if (!queueRaw) return;

      const queue = JSON.parse(queueRaw) as {
        id: string;
        channelId: string;
        channelName: string;
        idea: string;
        status: "Idea" | "Script" | "Video" | "Scheduled" | "Published";
        createdAt: string;
        projectId?: string;
      }[];

      const nextQueue = queue.map((item) => {
        if (item.id !== selected.queueItemId) return item;

        return {
          ...item,
          status: "Video" as const,
          projectId,
        };
      });

      localStorage.setItem(CONTENT_QUEUE_KEY, JSON.stringify(nextQueue));
      localStorage.removeItem(SELECTED_QUEUE_IDEA_KEY);
    } catch {}
  }

  async function generatePipeline(savedIdea: string) {
    try {
      setLoading(true);
      setRenderState("Preparing");
      setDownloadStatus("");
      setPublishStatus("Select platforms to publish.");
      clearPlaybackState();

      localStorage.removeItem(SESSION_KEY);

      setRenderState("Writing script");

      const scriptResponse = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: savedIdea }),
      });

      const scriptData = await scriptResponse.json();
      const generatedScript = scriptData.script as GeneratedScript;

      if (!scriptResponse.ok || !generatedScript) {
        setPublishStatus("Script generation failed. Please try again.");
        throw new Error("Script generation failed.");
      }

      setScript(generatedScript);

      setRenderState("Building timeline");

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

      setTimeline(generatedTimeline);

      const voiceoverText =
        generatedScript?.scenes?.map((scene) => scene.voiceover).join(" ") ||
        generatedScript?.hook ||
        savedIdea;

      const videoBrief = buildVideoBrief(savedIdea, generatedScript);
      const videoPrompt = buildVideoPromptForDatabase(videoBrief);

      setRenderState("Generating video");

      const videoResponse = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: videoBrief }),
      });

      const videoData = await videoResponse.json();
      const generatedVideoUrl = String(videoData.videoUrl || "").trim();

      if (!videoResponse.ok || !generatedVideoUrl) {
        setPublishStatus("Video generation failed. Please try again.");
        throw new Error("Runway did not return a valid videoUrl.");
      }

      setRenderState("Creating voice");

      const voiceResponse = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceoverText,
          voiceStyle,
        }),
      });

      const voiceData = await voiceResponse.json();

      if (!voiceResponse.ok) {
        setPublishStatus("Voice generation failed. Please try again.");
        throw new Error("Voice generation failed.");
      }

      setRenderState("Creating subtitles");

      let nextSubtitles: SubtitleItem[] = [];

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: voiceData.audioUrl || "",
          wordsPerSubtitle: 4,
        }),
      });

      const transcribeData = await transcribeResponse.json();

      if (transcribeResponse.ok && Array.isArray(transcribeData.subtitles)) {
        nextSubtitles = transcribeData.subtitles;
      } else {
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
        nextSubtitles = subtitlesData.subtitles || [];
      }

      setRenderState("Rendering");

      const renderResponse = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: generatedVideoUrl,
          audioUrl: voiceData.audioUrl || "",
          subtitles: nextSubtitles,
          timeline: generatedTimeline,
          subtitlesEnabled,
          backgroundMusicEnabled: musicEnabled,
          renderStyle: "viral",
        }),
      });

      const renderData = await renderResponse.json();

      if (renderData.renderId) {
        await checkRenderStatus(renderData.renderId);
      }

      setRenderState("Saving project");

      const nextVideoUrl = generatedVideoUrl;
      const nextAudioUrl = voiceData.audioUrl || "";
      const nextFinalVideoUrl =
        String(renderData.finalVideoUrl || "").trim() || generatedVideoUrl;

      const settingsJson = {
        styleMode: "auto",
        autoStyle: generatedScript.autoStyle || "Auto",
        visualStyle: generatedScript.visualStyle || "",
        mainSubject: generatedScript.mainSubject || "",
        environment: generatedScript.environment || "",
        subtitlesEnabled,
        voiceoverEnabled,
        backgroundMusicEnabled: musicEnabled,
        renderStyle: "viral",
        voiceStyle,
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

      markQueueItemAsVideo(nextProjectId);

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

      setRenderState("Finalizing");

      setProjectId(nextProjectId);
      setVideoUrl(nextVideoUrl);
      setAudioUrl(nextAudioUrl);
      setSubtitles(nextSubtitles);
      setFinalVideoUrl(nextFinalVideoUrl);
      setScript(generatedScript);
      setTimeline(generatedTimeline);

      setRenderState("Completed");

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

      window.history.replaceState({}, "", `/studio?projectId=${nextProjectId}`);
    } catch {
      setRenderState("Completed");
    } finally {
      setLoading(false);
    }
  }

  function toggleVoiceover() {
    const nextValue = !voiceoverEnabled;
    const video = videoRef.current;
    const audio = audioRef.current;

    setVoiceoverEnabled(nextValue);

    if (!audio) return;

    if (!nextValue) {
      audio.pause();
      return;
    }

    if (!video) {
      audio.play().catch(() => {});
      return;
    }

    audio.volume = video.muted ? 0 : video.volume || 1;
    audio.currentTime = video.currentTime;

    if (!video.paused && !video.ended) {
      audio.play().catch(() => {});
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

  function togglePlatform(platform: Platform) {
    setDownloadStatus("");

    if (!availablePlatforms.includes(platform)) {
      setPublishStatus("Connect this platform before publishing.");
      return;
    }

    setSelectedPlatforms((current) => {
      if (current.includes(platform)) {
        const next = current.filter((item) => item !== platform);

        setPublishStatus(
          next.length ? "Ready to publish." : "Select platforms to publish."
        );

        return next;
      }

      setPublishStatus("Ready to publish.");
      return [...current, platform];
    });
  }

  function toggleMusic() {
    setMusicEnabled((current) => !current);
    setDownloadStatus("");
    setPublishStatus("Background music will be added in the render step later.");
  }

  function syncAudioWithVideo() {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (isFinalRenderedVideo) {
      audio?.pause();
      return;
    }

    if (!video || !audio || !voiceoverEnabled) return;

    audio.volume = video.muted ? 0 : video.volume || 1;
    audio.currentTime = video.currentTime;

    if (video.paused || video.ended) {
      audio.pause();
      return;
    }

    audio.play().catch(() => {});
  }

  function handleVideoPlay() {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video?.ended) {
      video.currentTime = 0;
    }

    if (audio && video && video.currentTime < 0.25) {
      audio.currentTime = 0;
    }

    syncAudioWithVideo();
  }

  function handleVideoPause() {
    audioRef.current?.pause();
  }

  function handleVideoEnded() {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    if (video) {
      video.currentTime = 0;
      setCurrentVideoTime(0);
    }
  }

  function handleVideoTimeUpdate() {
    const video = videoRef.current;

    if (!video) return;

    setCurrentVideoTime(video.currentTime);
  }

  function handleVideoVolumeChange() {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video || !audio) return;

    audio.volume = video.muted ? 0 : video.volume || 1;

    if (video.muted || video.volume === 0) {
      audio.pause();
      return;
    }

    if (voiceoverEnabled && !video.paused && !video.ended) {
      audio.play().catch(() => {});
    }
  }

  async function publishVideo() {
    if (!activeVideoUrl || publishing) return;

    setDownloadStatus("");

    if (!selectedPlatforms.length) {
      setPublishStatus("Choose at least one connected platform.");
      return;
    }

    const unavailableSelection = selectedPlatforms.find(
      (platform) => !availablePlatforms.includes(platform)
    );

    if (unavailableSelection) {
      setPublishStatus(`${unavailableSelection} is not connected.`);
      return;
    }

    try {
      setPublishing(true);
      setPublishStatus("Publishing...");

      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: activeVideoUrl,
          platforms: selectedPlatforms,
          caption: script?.hook || "Created with AI Video Factory.",
          projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPublishStatus(data.error || "Publish failed.");
        return;
      }

      setPublishStatus(data.message || "Published.");
    } catch {
      setPublishStatus("Publish failed.");
    } finally {
      setPublishing(false);
    }
  }

  async function downloadVideo() {
    if (!activeVideoUrl || downloading) return;

    try {
      setDownloading(true);
      setPublishStatus("Select platforms to publish.");
      setDownloadStatus("Preparing final MP4...");

      let downloadUrl = activeVideoUrl;

      if (audioUrl && !activeVideoUrl.startsWith("/final-videos/")) {
        setDownloadStatus("Rendering MP4 with voiceover...");

        const renderResponse = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoUrl: activeVideoUrl,
            audioUrl,
            subtitles,
            timeline,
            subtitlesEnabled,
            backgroundMusicEnabled: musicEnabled,
            renderStyle: "viral",
          }),
        });

        const renderData = await renderResponse.json();

        if (!renderResponse.ok || !renderData.finalVideoUrl) {
          setDownloadStatus(renderData.error || "Final render failed.");
          return;
        }

        downloadUrl = String(renderData.finalVideoUrl || "").trim();
        audioRef.current?.pause();
      }

      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: downloadUrl,
          fileName: "ai-video-factory-video.mp4",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setDownloadStatus(data.error || "Download failed.");
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "ai-video-factory-video.mp4";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);
      setDownloadStatus("Download ready.");
    } catch (error) {
      console.error("Studio download error:", error);
      setDownloadStatus("Download failed.");
    } finally {
      setDownloading(false);
    }
  }

  const activeVideoUrl = finalVideoUrl || videoUrl;
  const isFinalRenderedVideo = activeVideoUrl.startsWith("/final-videos/");
  const shouldUseExternalAudio = Boolean(audioUrl) && !isFinalRenderedVideo;

  const activeSubtitle = isFinalRenderedVideo
    ? ""
    : getActiveSubtitle(
        subtitles,
        currentVideoTime,
        script,
        currentSceneIndex
      );

  const statusText = loading ? renderState : downloadStatus || publishStatus;

  return (
    <main className="h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,183,255,0.10),transparent_35%),radial-gradient(circle_at_bottom,rgba(139,92,246,0.12),transparent_35%)]" />

      <div className="absolute left-8 top-6 z-20 max-w-[430px]">
        <p className="text-[12px] font-black uppercase tracking-[0.38em] text-cyan-300">
          AI Video Factory
        </p>
        <p className="mt-1 text-[24px] font-black leading-none tracking-[-0.05em] text-white">
          Studio
        </p>
        <p className="mt-2 text-xs leading-relaxed text-white/45">
          Edit, preview, download, and publish your AI-generated video.
        </p>
      </div>

      <section className="relative z-10 mx-auto h-screen max-w-[1400px] px-6 py-5">
        <div className="flex h-full items-center justify-center">
          <div className="relative aspect-[9/16] h-[calc(100vh-64px)] max-h-[720px] overflow-hidden rounded-[34px] border border-white/10 bg-black shadow-[0_0_80px_rgba(0,0,0,0.45)]">
            {activeVideoUrl ? (
              <video
                ref={videoRef}
                src={activeVideoUrl}
                controls
                playsInline
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onEnded={handleVideoEnded}
                onTimeUpdate={handleVideoTimeUpdate}
                onVolumeChange={handleVideoVolumeChange}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black px-8 text-center text-sm font-bold leading-relaxed text-white/40">
                Open a saved project or start a new video from the home page.
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-center text-sm font-bold text-white/70 backdrop-blur-sm">
                <div>{renderState}</div>
                <div className="mt-4 h-1.5 w-[54%] overflow-hidden rounded-full bg-white/10">
                  <div className="h-full animate-[renderProgress_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                </div>
              </div>
            )}

            {subtitlesEnabled && activeVideoUrl && activeSubtitle && (
              <div className="pointer-events-none absolute bottom-16 left-1/2 max-w-[88%] -translate-x-1/2">
                <div className="overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-black/65 px-4 py-2 text-center text-[13px] font-black leading-snug text-white shadow-[0_0_25px_rgba(0,0,0,0.35)] backdrop-blur-md">
                  {activeSubtitle}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="absolute right-8 top-1/2 flex h-[calc(100vh-80px)] w-[340px] -translate-y-1/2 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
          <div>
            <p className="text-xs leading-relaxed text-white/50">
              Choose platforms, adjust settings, download, or publish.
            </p>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-white/40">
              Platforms
            </p>

            <div className="space-y-2">
              {platformsLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-xs font-bold text-white/45">
                  Loading connected platforms...
                </div>
              ) : platformItems.length ? (
                platformItems.map((platform) => {
                  const isConnected = platform.connected;
                  const isSelected = selectedPlatforms.includes(platform.name);

                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.name)}
                      className={`flex h-[40px] w-full items-center justify-between rounded-2xl border border-white/10 px-4 ${
                        isConnected ? "bg-white/[0.03]" : "bg-white/[0.02] opacity-55"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-bold">{platform.name}</span>
                        <span
                          className={`block text-[9px] font-black uppercase tracking-[0.18em] ${
                            isConnected ? "text-cyan-300" : "text-white/35"
                          }`}
                        >
                          {isConnected ? "Connected" : "Not connected"}
                        </span>
                      </span>

                      <span
                        className={`h-5 w-5 rounded-md border ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-400"
                            : "border-white/20"
                        }`}
                      />
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-xs font-bold leading-relaxed text-white/45">
                  No platforms connected. Connect accounts on the Platforms page first.
                </div>
              )}
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-white/40">
              Video Settings
            </p>

            <div className="space-y-2">
              <button
                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                className="flex h-[38px] w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4"
              >
                <span className="text-sm font-bold">Subtitles</span>
                <span
                  className={`h-5 w-5 rounded-md border ${
                    subtitlesEnabled
                      ? "border-cyan-400 bg-cyan-400"
                      : "border-white/20"
                  }`}
                />
              </button>

              <button
                onClick={toggleVoiceover}
                className="flex h-[38px] w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4"
              >
                <span className="text-sm font-bold">Voiceover</span>
                <span
                  className={`h-5 w-5 rounded-md border ${
                    voiceoverEnabled
                      ? "border-cyan-400 bg-cyan-400"
                      : "border-white/20"
                  }`}
                />
              </button>

              <label className="flex h-[38px] w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4">
                <span className="text-sm font-bold">Voice Style</span>

                <select
                  value={voiceStyle}
                  onChange={(event) => setVoiceStyle(event.target.value as VoiceStyle)}
                  className="max-w-[150px] bg-transparent text-right text-xs font-black text-cyan-300 outline-none"
                >
                  {voiceStyleOptions.map((option) => (
                    <option key={option.id} value={option.id} className="bg-[#050816] text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={toggleMusic}
                className="flex h-[38px] w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4"
              >
                <span className="text-sm font-bold">Background Music</span>
                <span
                  className={`h-5 w-5 rounded-md border ${
                    musicEnabled
                      ? "border-cyan-400 bg-cyan-400"
                      : "border-white/20"
                  }`}
                />
              </button>
            </div>
          </div>

          <p className="mt-3 min-h-[24px] line-clamp-2 text-xs font-semibold leading-snug text-white/55">
            {statusText}
          </p>

          <div className="mt-auto space-y-2 pb-1">
            <button
              onClick={publishVideo}
              disabled={!activeVideoUrl || publishing || platformsLoading || !availablePlatforms.length}
              className="h-[44px] w-full rounded-[18px] bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 text-[16px] font-black text-white shadow-[0_0_35px_rgba(0,212,255,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish"}
            </button>

            <button
              onClick={downloadVideo}
              disabled={!activeVideoUrl || downloading}
              className="h-[44px] w-full rounded-[18px] border border-white/10 bg-white/[0.03] text-[16px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? "Preparing..." : "Download MP4"}
            </button>
          </div>
        </aside>
      </section>

      {shouldUseExternalAudio && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      <style jsx global>{`
        @keyframes renderProgress {
          0% {
            width: 0%;
            transform: translateX(0%);
          }

          50% {
            width: 65%;
            transform: translateX(35%);
          }

          100% {
            width: 0%;
            transform: translateX(100%);
          }
        }
      `}</style>
    </main>
  );
}

function getActiveSubtitle(
  subtitles: SubtitleItem[],
  currentTime: number,
  script: GeneratedScript | null,
  currentSceneIndex: number
) {
  const timedSubtitle = subtitles.find((item) => {
    return currentTime >= item.start && currentTime <= item.end;
  });

  if (timedSubtitle?.text) {
    return getCaptionLine(timedSubtitle.text);
  }

  return getCaptionLine(
    script?.scenes?.[currentSceneIndex % Math.max(script.scenes.length, 1)]
      ?.subtitle || ""
  );
}

function buildFallbackScript(project: SavedProject): GeneratedScript {
  const title = getCleanTitle(project.title, project.idea);
  const caption = getShortCaption(project.idea, title);

  return {
    title,
    hook: caption,
    duration: "10 seconds",
    autoStyle: "Auto",
    visualStyle: "coherent AI video style inferred from the idea",
    mainSubject: project.idea,
    environment: "a setting that matches the idea",
    scenes: [],
    cta: "Download or publish your AI video.",
  };
}

function buildFallbackSubtitles(project: SavedProject): SubtitleItem[] {
  const title = getCleanTitle(project.title, project.idea);
  const caption = getShortCaption(project.idea, title);

  return [
    {
      start: 0,
      end: 4,
      text: caption,
    },
  ];
}

function isGeneratedScript(value: unknown): value is GeneratedScript {
  if (!value || typeof value !== "object") return false;

  const script = value as GeneratedScript;

  return (
    typeof script.title === "string" &&
    typeof script.hook === "string" &&
    typeof script.duration === "string" &&
    Array.isArray(script.scenes) &&
    typeof script.cta === "string"
  );
}

function isTimeline(value: unknown): value is TimelineItem[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    return (
      typeof item === "object" &&
      item !== null &&
      typeof (item as TimelineItem).id === "number" &&
      typeof (item as TimelineItem).subtitle === "string"
    );
  });
}

function isSubtitles(value: unknown): value is SubtitleItem[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    return (
      typeof item === "object" &&
      item !== null &&
      typeof (item as SubtitleItem).start === "number" &&
      typeof (item as SubtitleItem).end === "number" &&
      typeof (item as SubtitleItem).text === "string"
    );
  });
}

function getCleanTitle(title: string, idea: string) {
  const cleanTitle = title?.trim();

  if (
    cleanTitle &&
    cleanTitle.toLowerCase() !== "ai generated video" &&
    cleanTitle.toLowerCase() !== "untitled ai video"
  ) {
    return cleanTitle;
  }

  const cleanIdea = idea?.trim();

  if (!cleanIdea) {
    return "AI Video";
  }

  const words = cleanIdea
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["a", "an", "the"].includes(word.toLowerCase()))
    .slice(0, 4);

  return (
    words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "AI Video"
  );
}

function getShortCaption(idea: string, fallback: string) {
  const cleanIdea = idea?.trim();

  if (!cleanIdea) {
    return fallback || "Your AI video is ready.";
  }

  const firstSentence = cleanIdea.split(/[.!?—]/)[0]?.trim();

  return getCaptionLine(firstSentence || fallback || "Your AI video is ready.");
}

function getCaptionLine(text: string) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (!cleanText) return "";

  const words = cleanText.split(" ");

  if (words.length <= 7) {
    return cleanText;
  }

  return `${words.slice(0, 7).join(" ")}...`;
}

function buildVideoBrief(idea: string, script: GeneratedScript | null): VideoBrief {
  const firstScene = script?.scenes?.[0];

  return {
    idea: idea.trim(),
    autoStyle: script?.autoStyle || "Auto",
    visualStyle:
      script?.visualStyle ||
      "coherent short-form AI video style inferred from the idea",
    mainSubject: script?.mainSubject || idea,
    environment: script?.environment || "a setting that matches the idea",
    sceneVisual: script?.runwayPrompt || firstScene?.visual || idea,
  };
}

function buildVideoPromptForDatabase(brief: VideoBrief) {
  return JSON.stringify(brief);
}
