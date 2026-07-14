"use client";

import { useEffect, useMemo, useState } from "react";

type PlatformId = "youtube" | "tiktok" | "instagram";

type PlatformApiItem = {
  id: PlatformId;
  name: string;
  connected: boolean;
  accountName: string;
  followers: number;
  videos: number;
};

const fallbackPlatforms: PlatformApiItem[] = [
  {
    id: "youtube",
    name: "YouTube Shorts",
    connected: false,
    accountName: "",
    followers: 0,
    videos: 0,
  },
  {
    id: "tiktok",
    name: "TikTok",
    connected: false,
    accountName: "",
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

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<PlatformApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPlatformId, setUpdatingPlatformId] = useState<PlatformId | "">("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPlatforms();
  }, []);

  const connectedCount = useMemo(() => {
    return platforms.filter((platform) => platform.connected).length;
  }, [platforms]);

  const notConnectedCount = platforms.length - connectedCount;

  async function loadPlatforms() {
    try {
      setLoading(true);

      const response = await fetch("/api/platforms", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load platforms.");
      }

      const data = (await response.json()) as PlatformApiItem[];

      setPlatforms(Array.isArray(data) ? data : fallbackPlatforms);
    } catch (error) {
      console.error("Platforms load error:", error);
      setPlatforms(fallbackPlatforms);
      setMessage("Could not load platforms.");
    } finally {
      setLoading(false);
    }
  }

  async function updatePlatform(platformId: PlatformId, connected: boolean) {
    try {
      setUpdatingPlatformId(platformId);
      setMessage("");

      const response = await fetch("/api/platforms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId,
          connected,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Platform update failed.");
        return;
      }

      setPlatforms(Array.isArray(data) ? data : fallbackPlatforms);
      setMessage(connected ? "Platform connected." : "Platform disconnected.");
    } catch (error) {
      console.error("Platforms update error:", error);
      setMessage("Platform update failed.");
    } finally {
      setUpdatingPlatformId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] px-10 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(0,183,255,0.10),transparent_34%),radial-gradient(circle_at_bottom,rgba(139,92,246,0.13),transparent_34%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.38em] text-cyan-300">
              AI Video Factory
            </p>

            <h1 className="mt-2 text-[32px] font-black leading-none tracking-[-0.05em] text-white">
              Connected Platforms
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">
              Connect YouTube Shorts, TikTok, and Instagram Reels accounts for
              publishing, scheduling, and analytics.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white/70 transition hover:bg-white/[0.08]"
          >
            Back to Dashboard
          </a>
        </header>

        <div className="mb-6 grid gap-5 md:grid-cols-3">
          <MetricCard label="Connected" value={String(connectedCount)} />
          <MetricCard label="Not Connected" value={String(notConnectedCount)} />
          <MetricCard label="Available Platforms" value={String(platforms.length)} />
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-bold text-white/60">
            {message}
          </div>
        )}

        {loading ? (
          <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-10 text-center text-white/45 backdrop-blur-xl">
            Loading platforms...
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-3">
            {platforms.map((platform) => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                updating={updatingPlatformId === platform.id}
                onConnect={() => updatePlatform(platform.id, true)}
                onDisconnect={() => updatePlatform(platform.id, false)}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function PlatformCard({
  platform,
  updating,
  onConnect,
  onDisconnect,
}: {
  platform: PlatformApiItem;
  updating: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const isConnected = platform.connected;

  return (
    <article className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.04em]">
            {platform.name}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/45">
            {getPlatformDescription(platform.id)}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
            isConnected
              ? "bg-cyan-400/15 text-cyan-200"
              : "bg-white/10 text-white/45"
          }`}
        >
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      <div className="space-y-3 rounded-3xl border border-white/10 bg-black/25 p-5">
        <InfoLine
          label="Account"
          value={platform.accountName || "No account connected"}
        />
        <InfoLine label="Followers" value={formatNumber(platform.followers)} />
        <InfoLine label="Videos" value={formatNumber(platform.videos)} />
      </div>

      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={updating}
        className={`mt-5 h-12 w-full rounded-2xl text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isConnected
            ? "border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
            : "bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 text-white shadow-[0_0_34px_rgba(0,212,255,0.22)]"
        }`}
      >
        {updating ? "Updating..." : isConnected ? "Disconnect" : "Connect"}
      </button>
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <p className="text-sm font-bold text-white/45">{label}</p>
      <p className="mt-3 text-4xl font-black tracking-[-0.05em]">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-semibold text-white/35">{label}</span>
      <span className="text-right text-sm font-black text-white/75">
        {value}
      </span>
    </div>
  );
}

function getPlatformDescription(platformId: PlatformId) {
  if (platformId === "youtube") {
    return "Publish Shorts directly to your YouTube channel.";
  }

  if (platformId === "tiktok") {
    return "Schedule and publish vertical videos to TikTok.";
  }

  return "Prepare automatic publishing to Instagram Reels.";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}