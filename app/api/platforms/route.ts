import { NextResponse } from "next/server";

type PlatformId = "youtube" | "tiktok" | "instagram";

type PlatformApiItem = {
  id: PlatformId;
  name: string;
  connected: boolean;
  accountName: string;
  followers: number;
  videos: number;
};

let platforms: PlatformApiItem[] = [
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

type UpdateRequest = {
  platformId?: PlatformId;
  connected?: boolean;
};

export async function GET() {
  return NextResponse.json(platforms);
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as UpdateRequest;

    if (!body.platformId) {
      return NextResponse.json(
        { error: "Platform ID is required." },
        { status: 400 }
      );
    }

    platforms = platforms.map((platform) => {
      if (platform.id !== body.platformId) return platform;

      const connected = Boolean(body.connected);

      return {
        ...platform,
        connected,
        accountName: connected ? getDemoAccountName(platform.id) : "",
        followers: connected ? getDemoFollowers(platform.id) : 0,
        videos: connected ? getDemoVideos(platform.id) : 0,
      };
    });

    return NextResponse.json(platforms);
  } catch (error) {
    console.error("Platforms update error:", error);

    return NextResponse.json(
      { error: "Failed to update platform." },
      { status: 500 }
    );
  }
}

function getDemoAccountName(platformId: PlatformId) {
  if (platformId === "youtube") return "Demo YouTube Channel";
  if (platformId === "tiktok") return "@demo_tiktok_account";
  return "@demo_instagram_account";
}

function getDemoFollowers(platformId: PlatformId) {
  if (platformId === "youtube") return 12450;
  if (platformId === "tiktok") return 28600;
  return 8400;
}

function getDemoVideos(platformId: PlatformId) {
  if (platformId === "youtube") return 38;
  if (platformId === "tiktok") return 112;
  return 24;
}