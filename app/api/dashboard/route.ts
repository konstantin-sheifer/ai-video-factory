import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    credits: 200,
    plan: "Free",
    videosGenerated: 0,
    scheduledPosts: 0,
    projectsCreated: 0,
    storageUsed: "0 MB",
  });
}