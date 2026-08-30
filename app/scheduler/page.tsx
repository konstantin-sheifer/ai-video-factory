"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PostingFrequency = "1/day" | "2/day" | "3/day" | "custom";
type PreferredTime = "Morning" | "Afternoon" | "Evening" | "Night";
type QueueStatus = "idea" | "generating" | "generated";
type PlatformId = "youtube" | "tiktok" | "instagram";

type ContentCategory =
  | "Animals"
  | "Movies"
  | "History"
  | "Science"
  | "Technology"
  | "Space"
  | "Finance"
  | "Business"
  | "Sports"
  | "Travel"
  | "Food"
  | "Health"
  | "Motivation"
  | "Education"
  | "Mysteries"
  | "Luxury"
  | "Cars"
  | "Nature"
  | "AI"
  | "Custom";

type ContentChannel = {
  id: string;
  name: string;
  category: string;
  frequency: PostingFrequency;
  customVideosPerDay: number;
  preferredTime: PreferredTime;
  autopilot: boolean;
  platforms: PlatformId[];
  createdAt: string;
};

type QueueItem = {
  id: string;
  channelId: string;
  channelName: string;
  idea: string;
  status: QueueStatus;
  createdAt: string;
};

type PlatformApiItem = {
  id: PlatformId;
  name: string;
  connected: boolean;
  accountName: string;
  followers: number;
  videos: number;
};

type StarterConcept = {
  id?: string;
  title: string;
  hook: string;
  visual: string;
  createdAt?: string;
};

const CHANNELS_KEY = "ai-video-factory-content-channels";
const QUEUE_KEY = "ai-video-factory-content-queue";
const IDEA_KEY = "ai-video-factory-idea";
const SELECTED_QUEUE_IDEA_KEY = "ai-video-factory-selected-queue-idea";

const frequencyOptions: PostingFrequency[] = ["1/day", "2/day", "3/day", "custom"];
const preferredTimeOptions: PreferredTime[] = ["Morning", "Afternoon", "Evening", "Night"];

const categoryOptions: ContentCategory[] = [
  "Animals",
  "Movies",
  "History",
  "Science",
  "Technology",
  "Space",
  "Finance",
  "Business",
  "Sports",
  "Travel",
  "Food",
  "Health",
  "Motivation",
  "Education",
  "Mysteries",
  "Luxury",
  "Cars",
  "Nature",
  "AI",
  "Custom",
];

const starterConceptsByCategory: Record<string, StarterConcept[]> = {
  Animals: [
    {
      title: "Why octopuses can solve puzzles",
      hook: "They are smarter than most people think",
      visual: "Octopus opening a jar underwater with dramatic close-ups",
    },
    {
      title: "The animal that can survive in space-like conditions",
      hook: "This tiny creature is almost impossible to kill",
      visual: "Microscopic creature floating through extreme environments",
    },
    {
      title: "Why cats chirp at birds",
      hook: "That strange sound is not random",
      visual: "Cat staring through a window at birds in slow motion",
    },
    {
      title: "The bird that can imitate chainsaws",
      hook: "Some birds copy sounds so perfectly it feels fake",
      visual: "Forest bird with sound waves and shocked hikers",
    },
    {
      title: "The strangest migration on Earth",
      hook: "Millions of animals move together for one reason",
      visual: "Massive animal migration across dramatic landscapes",
    },
  ],
  Movies: [
    {
      title: "The Starbucks cup mistake in Game of Thrones",
      hook: "One modern cup broke the fantasy world for millions of viewers",
      visual: "Dramatic zoom on a medieval table with an impossible modern cup",
    },
    {
      title: "Leonardo DiCaprio’s real injury in Django Unchained",
      hook: "He cut his hand for real and kept acting",
      visual: "Intense movie set moment with actor staying in character",
    },
    {
      title: "The Joker hospital explosion almost failed",
      hook: "The detonator did not work right away, so Heath Ledger improvised",
      visual: "Clown walking away from a hospital before a sudden explosion",
    },
    {
      title: "The Matrix bullet-time effect used over 100 cameras",
      hook: "The famous slow-motion dodge was not just CGI",
      visual: "Hero leaning backward while cameras freeze the moment from every angle",
    },
    {
      title: "The Dark Knight truck flip was real",
      hook: "One of the most famous action scenes was filmed practically",
      visual: "City street at night with a massive truck flipping in slow motion",
    },
  ],
  History: [
    {
      title: "The shortest war in history lasted less than an hour",
      hook: "One country surrendered almost immediately",
      visual: "Old naval ships, smoke, and a fast animated timer",
    },
    {
      title: "The mistake that helped start World War I",
      hook: "One wrong turn changed the future of the world",
      visual: "Vintage car turning into a narrow street with dramatic tension",
    },
    {
      title: "The ancient city that disappeared overnight",
      hook: "People still argue about what really happened",
      visual: "Ruins covered by sand and a glowing map reveal",
    },
    {
      title: "The emperor who declared war on the sea",
      hook: "This sounds fake, but it is recorded in history",
      visual: "Roman soldiers standing at the shoreline in cinematic light",
    },
    {
      title: "The forgotten invention that came too early",
      hook: "It existed long before the world was ready for it",
      visual: "Old machine blueprint transforming into modern technology",
    },
  ],
  Space: [
    {
      title: "The planet where it rains diamonds",
      hook: "Some worlds are stranger than science fiction",
      visual: "Dark blue planet with glittering storms and diamond rain",
    },
    {
      title: "Why astronauts grow taller in space",
      hook: "The human body changes when gravity disappears",
      visual: "Astronaut floating beside a height chart inside a spacecraft",
    },
    {
      title: "The sound of a black hole",
      hook: "NASA turned cosmic data into something people can hear",
      visual: "Black hole waves pulsing through deep space",
    },
    {
      title: "The footprints on the Moon will last millions of years",
      hook: "There is almost nothing there to erase them",
      visual: "Moon boot print under Earthlight in silence",
    },
    {
      title: "The star that could explode any time",
      hook: "One cosmic event would be visible from Earth",
      visual: "Red giant star glowing brighter in a dark sky",
    },
  ],
  Technology: [
    {
      title: "The first computer bug was a real insect",
      hook: "The word bug became famous for a very literal reason",
      visual: "Old computer panel with a tiny moth and glowing circuits",
    },
    {
      title: "Why phone batteries hate cold weather",
      hook: "Your battery is not broken, chemistry is slowing down",
      visual: "Frozen phone screen with animated battery molecules",
    },
    {
      title: "The tiny chip that powers modern life",
      hook: "Almost everything around you depends on this invention",
      visual: "Microchip close-up transforming into cities, cars, and phones",
    },
    {
      title: "Why QR codes can hold so much information",
      hook: "Those black squares are more clever than they look",
      visual: "QR code expanding into hidden digital blocks",
    },
    {
      title: "The technology that almost replaced the internet",
      hook: "A different network once looked like the future",
      visual: "Retro computer network map fading into modern web lines",
    },
  ],
  AI: [
    {
      title: "Why AI sometimes makes things up",
      hook: "It is not lying like a human, it is predicting patterns",
      visual: "Neural network generating text with glitching fact cards",
    },
    {
      title: "The difference between AI and automation",
      hook: "Most people confuse these two things",
      visual: "Robot arm and glowing AI brain splitting into two paths",
    },
    {
      title: "How AI learns from examples",
      hook: "It does not memorize the way people imagine",
      visual: "Thousands of images flowing into a digital model",
    },
    {
      title: "The AI tool hidden inside your phone",
      hook: "You use machine learning more often than you think",
      visual: "Smartphone apps lighting up with invisible AI layers",
    },
    {
      title: "Why prompts change AI results so much",
      hook: "Small wording changes can create completely different outputs",
      visual: "Prompt text transforming into three different video scenes",
    },
  ],
};

const fallbackConcepts: StarterConcept[] = [
  {
    title: "A surprising fact most people never notice",
    hook: "The smallest detail can change how people see the topic",
    visual: "Fast cinematic reveal with one clear center object",
  },
  {
    title: "The biggest myth about this topic",
    hook: "It sounds obvious, but the truth is completely different",
    visual: "Before-and-after visual story with a clean reveal",
  },
  {
    title: "A hidden detail that changes everything",
    hook: "People usually miss it the first time",
    visual: "Close-up detail expanding into a bigger dramatic scene",
  },
  {
    title: "Why this topic keeps people watching",
    hook: "There is one emotional trigger behind the attention",
    visual: "Short cinematic sequence with a clear transformation",
  },
  {
    title: "The simple story behind a viral short",
    hook: "A small moment can become a strong 10-second video",
    visual: "Clean vertical storytelling shot with dramatic lighting",
  },
];

export default function SchedulerPage() {
  const router = useRouter();

  const [channels, setChannels] = useState<ContentChannel[]>([]);
  const [contentQueue, setContentQueue] = useState<QueueItem[]>([]);
  const [, setAvailablePlatforms] = useState<PlatformId[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const [channelName, setChannelName] = useState("");
  const [category, setCategory] = useState<ContentCategory>("Animals");
  const [customCategory, setCustomCategory] = useState("");
  const [postingFrequency, setPostingFrequency] = useState<PostingFrequency>("1/day");
  const [customVideosPerDay, setCustomVideosPerDay] = useState(4);
  const [preferredTime, setPreferredTime] = useState<PreferredTime>("Morning");
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([]);

  const [queueIdea, setQueueIdea] = useState("");
  const [message, setMessage] = useState("");
  const [queueError, setQueueError] = useState("");
  const [isGeneratingQueue, setIsGeneratingQueue] = useState(false);

  useEffect(() => {
    async function initializeScheduler() {
      const storedChannels = readStorage<ContentChannel[]>(CHANNELS_KEY, []);
      const storedQueue = readStorage<QueueItem[]>(QUEUE_KEY, []);
      const normalizedChannels = storedChannels.map(normalizeChannel);
      let durableQueue: QueueItem[] = [];

      try {
        const [queueResponse, platformResponse] = await Promise.all([
          fetch("/api/channels/generate-queue", { cache: "no-store" }),
          fetch("/api/platforms", { cache: "no-store" }),
        ]);
        if (queueResponse.ok) {
          const data = await queueResponse.json();
          durableQueue = Array.isArray(data.concepts)
            ? data.concepts.map((item: StarterConcept & { channelId: string; channelName: string; status: QueueStatus }) => ({
                id: String(item.id),
                channelId: item.channelId,
                channelName: item.channelName,
                idea: formatConcept(item),
                status: item.status,
                createdAt: item.createdAt || getTodayDate(),
              }))
            : [];
        }
        if (platformResponse.ok) {
          const platforms = (await platformResponse.json()) as PlatformApiItem[];
          setAvailablePlatforms(Array.isArray(platforms) ? platforms.filter((item) => item.connected).map((item) => item.id) : []);
        }
      } catch {
        // Local data remains available when staging dependencies are temporarily unavailable.
      }

      const mergedQueue = mergeQueueItems(durableQueue, storedQueue);
      setChannels(normalizedChannels);
      setContentQueue(mergedQueue);
      setSelectedChannelId(normalizedChannels[0]?.id || null);
      writeStorage(CHANNELS_KEY, normalizedChannels);
      writeStorage(QUEUE_KEY, mergedQueue);
    }

    void initializeScheduler();
  }, []);

  const selectedChannel = useMemo(() => {
    return channels.find((channel) => channel.id === selectedChannelId) || null;
  }, [channels, selectedChannelId]);

  const selectedQueue = useMemo(() => {
    if (!selectedChannel) return [];
    return contentQueue.filter((item) => item.channelId === selectedChannel.id);
  }, [contentQueue, selectedChannel]);

  const generatedCount = selectedQueue.filter((item) => item.status === "generated").length;

  function saveChannel() {
    const name = channelName.trim();
    const resolvedCategory = category === "Custom" ? customCategory.trim() : category;

    if (!name || !resolvedCategory) {
      setMessage("Add a channel name and content category first.");
      return;
    }

    const existingChannel = channels.find((channel) => channel.name.toLowerCase() === name.toLowerCase());
    const savedChannel: ContentChannel = {
      id: existingChannel?.id || crypto.randomUUID(),
      name,
      category: resolvedCategory,
      frequency: postingFrequency,
      customVideosPerDay,
      preferredTime,
      autopilot: autopilotEnabled,
      platforms: selectedPlatforms,
      createdAt: existingChannel?.createdAt || getTodayDate(),
    };

    const nextChannels = existingChannel
      ? channels.map((channel) => (channel.id === existingChannel.id ? savedChannel : channel))
      : [savedChannel, ...channels];

    setChannels(nextChannels);
    writeStorage(CHANNELS_KEY, nextChannels);
    setSelectedChannelId(savedChannel.id);
    setChannelName("");
    setCategory("Animals");
    setCustomCategory("");
    setPostingFrequency("1/day");
    setCustomVideosPerDay(4);
    setPreferredTime("Morning");
    setAutopilotEnabled(false);
    setSelectedPlatforms([]);
    setQueueIdea("");
    setMessage(existingChannel ? `Channel updated: ${savedChannel.name}` : `Channel created: ${savedChannel.name}`);
  }

  function selectChannel(channelId: string) {
    setSelectedChannelId(channelId);
    setQueueIdea("");
    const channel = channels.find((item) => item.id === channelId);
    if (channel) setMessage(`Selected channel: ${channel.name}`);
  }

  function addQueueIdea() {
    if (!selectedChannel) return setMessage("Select a channel first.");
    const idea = queueIdea.trim();
    if (!idea) return setMessage("Add a video concept first.");

    const nextItem: QueueItem = {
      id: crypto.randomUUID(),
      channelId: selectedChannel.id,
      channelName: selectedChannel.name,
      idea,
      status: "idea",
      createdAt: getTodayDate(),
    };
    const nextQueue = [nextItem, ...contentQueue];
    setContentQueue(nextQueue);
    writeStorage(QUEUE_KEY, nextQueue);
    setQueueIdea("");
    setMessage(`Concept added to ${selectedChannel.name}.`);
  }
  async function seedAutopilotQueue() {
    if (!selectedChannel) {
      setMessage("Select a channel first.");
      return;
    }

    if (isGeneratingQueue) {
      return;
    }

    setIsGeneratingQueue(true);
    setQueueError("");
    setMessage(`Generating AI ideas for ${selectedChannel.name}...`);

    try {
      const response = await fetch("/api/channels/generate-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelId: selectedChannel.id,
          channelName: selectedChannel.name,
          category: selectedChannel.category,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to generate queue.");
      }

      const data = (await response.json()) as { ideas?: StarterConcept[] };
      const ideas = Array.isArray(data.ideas) ? data.ideas : [];

      if (!ideas.length) {
        throw new Error("No ideas returned.");
      }

      const concepts = ideas.map((concept: StarterConcept) => ({
        id: concept.id || crypto.randomUUID(),
        channelId: selectedChannel.id,
        channelName: selectedChannel.name,
        idea: formatConcept({
          title: String(concept.title || ""),
          hook: String(concept.hook || ""),
          visual: String(concept.visual || ""),
        }),
        status: "idea" as QueueStatus,
        createdAt: concept.createdAt || getTodayDate(),
      }));

      setContentQueue((currentQueue) => {
        const conceptIds = new Set(concepts.map((concept) => concept.id));
        const nextQueue = [...concepts, ...currentQueue.filter((item) => !conceptIds.has(item.id))];

        writeStorage(QUEUE_KEY, nextQueue);

        return nextQueue;
      });

      setMessage(`${concepts.length} AI ideas added to ${selectedChannel.name}.`);
    } catch (error) {
      console.error(error);
      const controlledMessage = error instanceof Error ? error.message : "Failed to generate queue.";
      setQueueError(controlledMessage);
      setMessage(`AI queue generation failed: ${controlledMessage}`);
    } finally {
      setIsGeneratingQueue(false);
    }
  }

  function removeQueueIdea(itemId: string) {
    const nextQueue = contentQueue.filter((item) => item.id !== itemId);
    setContentQueue(nextQueue);
    writeStorage(QUEUE_KEY, nextQueue);
    setMessage("Concept removed from content queue.");
  }

  function generateQueueVideo(item: QueueItem) {
    const nextQueue = contentQueue.map((queueItem) =>
      queueItem.id === item.id
        ? { ...queueItem, status: "generating" as QueueStatus }
        : queueItem
    );

    setContentQueue(nextQueue);
    writeStorage(QUEUE_KEY, nextQueue);

    localStorage.setItem(IDEA_KEY, item.idea);
    localStorage.setItem(
      SELECTED_QUEUE_IDEA_KEY,
      JSON.stringify({
        queueItemId: item.id,
        idea: item.idea,
        channelName: item.channelName,
      })
    );

    const params = new URLSearchParams({
      generate: "1",
      idea: item.idea,
      channelId: item.channelId,
      queueItemId: item.id,
    });

    router.push(`/studio?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-[#050816] px-10 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(0,183,255,0.10),transparent_34%),radial-gradient(circle_at_bottom,rgba(139,92,246,0.13),transparent_34%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.38em] text-cyan-300">AI Video Factory</p>
            <h1 className="mt-2 text-[34px] font-black leading-none tracking-[-0.05em] text-white">Channels</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">Create multiple content channels, build idea queues, and generate videos one channel at a time.</p>
          </div>
          <a href="/dashboard" className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white/70 transition hover:bg-white/[0.08]">Back to Dashboard</a>
        </div>

        <section className="mb-6 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Step 1</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Create Channel</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">Create a channel, choose a content category and frequency, then save it to your channel list.</p>
            </div>
            <button onClick={saveChannel} className="h-12 rounded-2xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-7 text-sm font-black text-white shadow-[0_0_34px_rgba(0,212,255,0.22)]" type="button">Save Channel</button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.25fr_260px_160px]">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/35">Channel Name</span>
              <input value={channelName} onChange={(event) => setChannelName(event.target.value)} className={fieldClassName} />
            </label>

            <div>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/35">Content Category</span>
              <div className="grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/30 p-2">
                {categoryOptions.map((option) => (
                  <button key={option} onClick={() => setCategory(option)} className={`h-9 rounded-xl text-xs font-black transition ${category === option ? "bg-cyan-400 text-black" : "text-white/45 hover:bg-white/[0.06] hover:text-white"}`} type="button">{option}</button>
                ))}
              </div>
              {category === "Custom" ? <input value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} className={`${fieldClassName} mt-3`} /> : null}
            </div>

            <div>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/35">Frequency</span>
              <div className="grid h-12 grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/30 p-1">
                {frequencyOptions.map((option) => (
                  <button key={option} onClick={() => setPostingFrequency(option)} className={`rounded-xl text-xs font-black transition ${postingFrequency === option ? "bg-cyan-400 text-black" : "text-white/45 hover:bg-white/[0.06] hover:text-white"}`} type="button">{option}</button>
                ))}
              </div>
              {postingFrequency === "custom" ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Videos per day</span>
                    <input value={customVideosPerDay} onChange={(event) => setCustomVideosPerDay(Number(event.target.value) || 1)} min={1} max={24} type="number" className={fieldClassName} />
                  </label>
                  <div className="mt-3">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Preferred time</span>
                    <div className="grid grid-cols-2 gap-2">
                      {preferredTimeOptions.map((time) => (
                        <button key={time} onClick={() => setPreferredTime(time)} className={`h-9 rounded-xl text-xs font-black transition ${preferredTime === time ? "bg-cyan-400 text-black" : "bg-white/[0.04] text-white/45 hover:bg-white/[0.08] hover:text-white"}`} type="button">{time}</button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] font-bold text-white/35">Uses local account time.</p>
                  </div>
                </div>
              ) : null}
            </div>

            <button onClick={() => setAutopilotEnabled((current) => !current)} className="mt-6 flex h-12 items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-black text-white" type="button">
              <span>Autopilot</span>
              <span className={`h-5 w-5 rounded-md border ${autopilotEnabled ? "border-cyan-400 bg-cyan-400" : "border-white/20"}`} />
            </button>
          </div>

          {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white/55">{message}</p> : null}

          <div className="mt-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black tracking-[-0.04em]">My Channels</h3>
                <p className="mt-1 text-sm text-white/45">Select a channel to manage its content queue.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-black text-white/45">{channels.length} channels</span>
            </div>

            {channels.length ? (
              <div className="grid gap-3">
                {channels.map((channel, index) => {
                  const channelQueue = contentQueue.filter((item) => item.channelId === channel.id);
                  const isSelected = selectedChannelId === channel.id;
                  return (
                    <button key={channel.id} onClick={() => selectChannel(channel.id)} className={`grid gap-4 rounded-3xl border p-4 text-left transition lg:grid-cols-[50px_1fr_120px_120px_120px_130px] ${isSelected ? "border-cyan-400/35 bg-cyan-400/10" : "border-white/10 bg-black/25 hover:bg-white/[0.04]"}`} type="button">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white/50">{index + 1}</div>
                      <div>
                        <p className="text-base font-black text-white">{channel.name}</p>
                        <p className="mt-1 line-clamp-1 text-sm font-semibold text-white/45">{channel.category}</p>
                      </div>
                      <ChannelStat label="Queue" value={String(channelQueue.length)} />
                      <ChannelStat label="Videos" value="0" />
                      <ChannelStat label="Frequency" value={getFrequencyLabel(channel)} />
                      <ChannelStat label="Autopilot" value={channel.autopilot ? "On" : "Off"} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/25 p-8 text-center"><p className="text-sm font-bold text-white/40">No channels yet. Create your first channel above.</p></div>
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Step 2</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black tracking-[-0.04em]">Content Queue</h2>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/45">{selectedChannel ? selectedChannel.name : "No channel selected"}</span>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/45">{selectedQueue.length} concepts</span>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/45">{generatedCount} generated</span>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">Select a channel above, add concepts to its queue, and generate one video at a time.</p>
            </div>
            <button
              onClick={seedAutopilotQueue}
              disabled={!selectedChannel || isGeneratingQueue}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-7 text-sm font-black text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
            >
              {isGeneratingQueue ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" />
                  Generating...
                </>
              ) : (
                "Generate Starter Queue"
              )}
            </button>
          </div>

          {queueError ? <p role="alert" className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-100">{queueError}</p> : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_180px]">
            <input value={queueIdea} onChange={(event) => setQueueIdea(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addQueueIdea(); }} disabled={!selectedChannel} className={fieldClassName} />
            <button onClick={addQueueIdea} disabled={!selectedChannel} className="h-12 rounded-2xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-6 text-sm font-black text-white shadow-[0_0_34px_rgba(0,212,255,0.22)] disabled:cursor-not-allowed disabled:opacity-40" type="button">Add Concept</button>
          </div>

          <div className="mt-5 space-y-3">
            {selectedQueue.length ? selectedQueue.map((item) => (
              <div key={item.id} className="grid gap-4 rounded-3xl border border-white/10 bg-black/25 p-4 lg:grid-cols-[1fr_170px]">
                <ConceptPreview idea={item.idea} channelName={item.channelName} />
                <div className="flex flex-col items-end justify-between gap-4">
                  <button onClick={() => generateQueueVideo(item)} className="h-9 rounded-xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-4 text-xs font-black text-white" type="button">Generate Video</button>
                  <button onClick={() => removeQueueIdea(item.id)} aria-label="Remove concept" title="Remove concept" className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-lg font-black text-white/55 hover:bg-white/[0.04] hover:text-white" type="button">🗑</button>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm font-bold text-white/35">{selectedChannel ? "No concepts in this channel queue yet." : "Create or select a channel first."}</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

const fieldClassName = "h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none disabled:cursor-not-allowed disabled:opacity-40";

function ChannelStat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">{label}</p><p className="mt-1 text-sm font-black text-white/75">{value}</p></div>;
}

function ConceptPreview({ idea, channelName }: { idea: string; channelName: string }) {
  const concept = parseVideoConcept(idea);
  return <div className="space-y-2"><ConceptLine label="Channel" text={channelName} muted /><ConceptLine label="Idea" text={concept.title} strong />{concept.hook ? <ConceptLine label="Hook" text={capitalizeFirst(concept.hook)} /> : null}{concept.visual ? <ConceptLine label="Visual" text={capitalizeFirst(concept.visual)} muted /> : null}</div>;
}

function ConceptLine({ label, text, strong, muted }: { label: string; text: string; strong?: boolean; muted?: boolean }) {
  return <p className={`text-sm leading-relaxed ${strong ? "font-black text-white" : muted ? "font-semibold text-white/55" : "font-semibold text-white/70"}`}><span className="mr-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">[{label}]</span>{text}</p>;
}

function parseVideoConcept(idea: string) {
  const title = idea.split(". Hook:")[0]?.trim() || idea.trim();
  const hook = idea.match(/Hook:\s*(.*?)(?:\. Visual:|$)/)?.[1]?.trim() || "";
  const visual = idea.match(/Visual:\s*(.*?)$/)?.[1]?.trim() || "";
  return { title, hook, visual };
}

function getStarterConcepts(channel: ContentChannel) {
  const normalizedCategory = channel.category.trim();
  return starterConceptsByCategory[normalizedCategory] || starterConceptsByCategory[guessCategory(normalizedCategory)] || fallbackConcepts;
}

function guessCategory(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("animal")) return "Animals";
  if (normalized.includes("movie") || normalized.includes("film")) return "Movies";
  if (normalized.includes("history")) return "History";
  if (normalized.includes("space")) return "Space";
  if (normalized.includes("tech")) return "Technology";
  if (normalized.includes("ai")) return "AI";
  return "";
}

function formatConcept(concept: StarterConcept) {
  return `${concept.title}. Hook: ${concept.hook}. Visual: ${concept.visual}`;
}

function getFrequencyLabel(channel: ContentChannel) {
  if (channel.frequency !== "custom") return channel.frequency;
  return `${channel.customVideosPerDay}/day ${channel.preferredTime}`;
}

function normalizeChannel(channel: Partial<ContentChannel> & { niche?: string }) {
  return { id: channel.id || crypto.randomUUID(), name: channel.name || "Untitled Channel", category: channel.category || channel.niche || "Animals", frequency: channel.frequency || "1/day", customVideosPerDay: channel.customVideosPerDay || 4, preferredTime: channel.preferredTime || "Morning", autopilot: Boolean(channel.autopilot), platforms: Array.isArray(channel.platforms) ? channel.platforms : [], createdAt: channel.createdAt || getTodayDate() };
}

function getTodayDate() { return new Date().toISOString().slice(0, 10); }
function capitalizeFirst(text: string) { return text ? text.charAt(0).toUpperCase() + text.slice(1) : text; }
function readStorage<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { const stored = window.localStorage.getItem(key); return stored ? (JSON.parse(stored) as T) : fallback; } catch { return fallback; } }
function writeStorage<T>(key: string, value: T) { if (typeof window === "undefined") return; window.localStorage.setItem(key, JSON.stringify(value)); }

function mergeQueueItems(primary: QueueItem[], secondary: QueueItem[]) {
  const merged = new Map<string, QueueItem>();
  for (const item of [...primary, ...secondary]) merged.set(item.id, item);
  return [...merged.values()];
}
