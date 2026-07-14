import { NextResponse } from "next/server";

type Platform = "YouTube Shorts" | "TikTok" | "Instagram Reels";

type ScheduledPost = {
  id: string;
  projectTitle: string;
  platforms: Platform[];
  date: string;
  time: string;
  status: "Draft" | "Scheduled";
};

type CreateScheduleRequest = {
  projectTitle?: string;
  platforms?: Platform[];
  date?: string;
  time?: string;
};

let scheduledPosts: ScheduledPost[] = [];

export async function GET() {
  const scheduled = scheduledPosts.filter((post) => post.status === "Scheduled");
  const drafts = scheduledPosts.filter((post) => post.status === "Draft");

  return NextResponse.json({
    posts: scheduledPosts,
    stats: {
      total: scheduledPosts.length,
      scheduled: scheduled.length,
      drafts: drafts.length,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateScheduleRequest;

    const projectTitle = body.projectTitle?.trim();
    const platforms = Array.isArray(body.platforms) ? body.platforms : [];
    const date = body.date?.trim();
    const time = body.time?.trim();

    if (!projectTitle) {
      return NextResponse.json(
        { error: "Project title is required." },
        { status: 400 }
      );
    }

    if (!platforms.length) {
      return NextResponse.json(
        { error: "At least one platform is required." },
        { status: 400 }
      );
    }

    if (!date || !time) {
      return NextResponse.json(
        { error: "Date and time are required." },
        { status: 400 }
      );
    }

    const nextPost: ScheduledPost = {
      id: crypto.randomUUID(),
      projectTitle,
      platforms,
      date,
      time,
      status: "Scheduled",
    };

    scheduledPosts = [nextPost, ...scheduledPosts];

    return NextResponse.json({
      post: nextPost,
      posts: scheduledPosts,
      stats: {
        total: scheduledPosts.length,
        scheduled: scheduledPosts.filter((post) => post.status === "Scheduled").length,
        drafts: scheduledPosts.filter((post) => post.status === "Draft").length,
      },
    });
  } catch (error) {
    console.error("Scheduler create error:", error);

    return NextResponse.json(
      { error: "Failed to create scheduled post." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Schedule ID is required." },
        { status: 400 }
      );
    }

    scheduledPosts = scheduledPosts.filter((post) => post.id !== id);

    return NextResponse.json({
      posts: scheduledPosts,
      stats: {
        total: scheduledPosts.length,
        scheduled: scheduledPosts.filter((post) => post.status === "Scheduled").length,
        drafts: scheduledPosts.filter((post) => post.status === "Draft").length,
      },
    });
  } catch (error) {
    console.error("Scheduler delete error:", error);

    return NextResponse.json(
      { error: "Failed to delete scheduled post." },
      { status: 500 }
    );
  }
}
