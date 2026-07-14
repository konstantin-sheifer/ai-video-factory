import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarClock,
  CreditCard,
  Film,
  Home,
  Link2,
  PlayCircle,
  Plus,
  Sparkles,
  Video,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type DashboardStats = {
  credits: number;
  plan: string;
  videosGenerated: number;
  scheduledPosts: number;
  projectsCreated: number;
  storageUsed: string;
};

type SchedulerStats = {
  scheduledPosts: unknown[];
  total: number;
  scheduled: number;
  drafts: number;
};

type ProjectApiItem = {
  id?: string;
  title?: string;
  idea?: string;
  status?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt?: string;
};

type ProjectsResponse = {
  provider?: string;
  mock?: boolean;
  projects?: ProjectApiItem[];
};

type PlatformId = "youtube" | "tiktok" | "instagram";

type PlatformApiItem = {
  id: PlatformId;
  name: string;
  connected: boolean;
  accountName: string;
  followers: number;
  videos: number;
};

const fallbackDashboardStats: DashboardStats = {
  credits: 200,
  plan: "Free",
  videosGenerated: 0,
  scheduledPosts: 0,
  projectsCreated: 0,
  storageUsed: "0 MB",
};

const fallbackSchedulerStats: SchedulerStats = {
  scheduledPosts: [],
  total: 0,
  scheduled: 0,
  drafts: 0,
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

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const [user, dashboardStats, schedulerStats, platforms, projects] =
    await Promise.all([
      currentUser(),
      getDashboardStats(),
      getSchedulerStats(),
      getPlatforms(),
      getProjects(),
    ]);

  const firstName = user?.firstName || "Creator";

  const connectedPlatformCount = platforms.filter(
    (platform) => platform.connected
  ).length;

  const scheduledPostsCount =
    Number(schedulerStats.scheduled) || Number(dashboardStats.scheduledPosts) || 0;

  const videosGeneratedCount =
    projects.filter((project) => Boolean(project.videoUrl)).length ||
    Number(dashboardStats.videosGenerated) ||
    0;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(0,183,255,0.10),transparent_34%),radial-gradient(circle_at_bottom,rgba(139,92,246,0.13),transparent_34%)]" />

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl lg:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-black">
              <Sparkles className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-lg font-black tracking-[-0.03em]">
                AI Video Factory
              </h1>
              <p className="text-xs font-semibold text-white/35">
                Creator Dashboard
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            <SidebarItem icon={Home} label="Home" href="/" />
            <SidebarItem icon={Video} label="Studio" href="/studio" />
            <SidebarItem icon={Film} label="Projects" href="/projects" />
            <SidebarItem icon={CalendarClock} label="Channels" href="/scheduler" />
          </nav>
        </aside>

        <section className="flex-1 px-6 py-6 lg:px-10">
          <header className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
                  Dashboard
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] md:text-5xl">
                  Welcome back, {firstName}
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/50">
                  Create videos, manage projects, build channels, and connect
                  publishing platforms from one place.
                </p>
              </div>

              <Link
                href="/"
                className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-6 text-sm font-black text-white shadow-[0_0_34px_rgba(0,212,255,0.22)] transition hover:scale-[1.015]"
              >
                <Plus className="h-5 w-5" />
                New Video
              </Link>
            </div>
          </header>

          <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={WalletCards}
              label="Credits"
              value={formatNumber(dashboardStats.credits)}
              note="Available generation credits"
            />
            <MetricCard
              icon={Film}
              label="Videos"
              value={formatNumber(videosGeneratedCount)}
              note="Generated projects"
            />
            <MetricCard
              icon={CreditCard}
              label="Plan"
              value={dashboardStats.plan}
              note="Current account plan"
            />
            <MetricCard
              icon={CalendarClock}
              label="Scheduled"
              value={formatNumber(scheduledPostsCount)}
              note="Publishing queue"
            />
          </div>

          <Panel
            title="Connected Platforms"
            subtitle={`${connectedPlatformCount} of ${platforms.length} platforms connected.`}
            icon={Link2}
          >
            <div className="grid gap-4 xl:grid-cols-3">
              {platforms.map((platform) => {
                const Icon = getPlatformIcon(platform.id);

                return (
                  <div
                    key={platform.id}
                    className="flex min-h-[190px] flex-col justify-between rounded-3xl border border-white/10 bg-black/25 p-5"
                  >
                    <div>
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]">
                          <Icon className="h-6 w-6 text-cyan-300" />
                        </div>

                        <p
                          className={`text-xs font-black uppercase tracking-[0.18em] ${
                            platform.connected ? "text-cyan-300" : "text-white/30"
                          }`}
                        >
                          {platform.connected ? "Connected" : "Not connected"}
                        </p>
                      </div>

                      <p className="font-black">{platform.name}</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/45">
                        {platform.connected
                          ? platform.accountName || "Connected account"
                          : getPlatformDescription(platform.id)}
                      </p>
                    </div>

                    <Link
                      href="/platforms"
                      className="mt-5 flex h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black text-white/70 transition hover:bg-white/[0.08]"
                    >
                      {platform.connected ? "Manage" : "Connect"}
                    </Link>
                  </div>
                );
              })}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const baseUrl = await getBaseUrl();

    const response = await fetch(`${baseUrl}/api/dashboard`, {
      cache: "no-store",
    });

    if (!response.ok) return fallbackDashboardStats;

    const data = (await response.json()) as DashboardStats;

    return {
      credits: Number(data.credits) || 0,
      plan: data.plan || "Free",
      videosGenerated: Number(data.videosGenerated) || 0,
      scheduledPosts: Number(data.scheduledPosts) || 0,
      projectsCreated: Number(data.projectsCreated) || 0,
      storageUsed: data.storageUsed || "0 MB",
    };
  } catch {
    return fallbackDashboardStats;
  }
}

async function getSchedulerStats(): Promise<SchedulerStats> {
  try {
    const baseUrl = await getBaseUrl();

    const response = await fetch(`${baseUrl}/api/scheduler`, {
      cache: "no-store",
    });

    if (!response.ok) return fallbackSchedulerStats;

    const data = (await response.json()) as SchedulerStats;

    return {
      scheduledPosts: Array.isArray(data.scheduledPosts)
        ? data.scheduledPosts
        : [],
      total: Number(data.total) || 0,
      scheduled: Number(data.scheduled) || 0,
      drafts: Number(data.drafts) || 0,
    };
  } catch {
    return fallbackSchedulerStats;
  }
}

async function getPlatforms(): Promise<PlatformApiItem[]> {
  try {
    const baseUrl = await getBaseUrl();

    const response = await fetch(`${baseUrl}/api/platforms`, {
      cache: "no-store",
    });

    if (!response.ok) return fallbackPlatforms;

    const data = (await response.json()) as PlatformApiItem[];

    if (!Array.isArray(data)) return fallbackPlatforms;

    return data.map((platform) => ({
      id: platform.id,
      name: platform.name,
      connected: Boolean(platform.connected),
      accountName: platform.accountName || "",
      followers: Number(platform.followers) || 0,
      videos: Number(platform.videos) || 0,
    }));
  } catch {
    return fallbackPlatforms;
  }
}

async function getProjects(): Promise<ProjectApiItem[]> {
  try {
    const baseUrl = await getBaseUrl();

    const response = await fetch(`${baseUrl}/api/projects`, {
      cache: "no-store",
    });

    if (!response.ok) return [];

    const data = (await response.json()) as ProjectsResponse;

    return Array.isArray(data.projects) ? data.projects : [];
  } catch {
    return [];
  }
}

async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  return `${protocol}://${host}`;
}

function SidebarItem({
  icon: Icon,
  label,
  href,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-white/45 transition hover:bg-white/[0.05] hover:text-white"
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-bold text-white/45">{label}</p>
        <Icon className="h-5 w-5 text-cyan-300" />
      </div>

      <p className="text-4xl font-black tracking-[-0.05em]">{value}</p>
      <p className="mt-2 text-xs font-semibold text-white/35">{note}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black tracking-[-0.04em]">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/45">
            {subtitle}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]">
          <Icon className="h-5 w-5 text-cyan-300" />
        </div>
      </div>

      {children}
    </section>
  );
}

function getPlatformIcon(platformId: PlatformApiItem["id"]) {
  if (platformId === "youtube") return Video;
  if (platformId === "tiktok") return PlayCircle;

  return Film;
}

function getPlatformDescription(platformId: PlatformApiItem["id"]) {
  if (platformId === "youtube") {
    return "Publish Shorts directly from AI Video Factory.";
  }

  if (platformId === "tiktok") {
    return "Connect TikTok for future auto-posting.";
  }

  return "Prepare Reels publishing and scheduling.";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}
