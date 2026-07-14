"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STUDIO_SESSION_KEY = "ai-video-factory-studio-session";

export default function Home() {
  const router = useRouter();

  const [idea, setIdea] = useState("");
  const [ideaLoading, setIdeaLoading] = useState(false);

  async function surpriseMe() {
    if (ideaLoading) return;

    setIdeaLoading(true);

    try {
      const response = await fetch("/api/surprise", {
        method: "POST",
      });

      const data = await response.json();

      setIdea(
        data.idea ||
          "A lonely robot travels across a frozen ocean to return a lost star to the sky."
      );
    } catch (error) {
      console.error(error);

      setIdea(
        "A tiny dragon becomes a chef and saves a magical village restaurant."
      );
    } finally {
      setIdeaLoading(false);
    }
  }

  function generateVideo() {
    if (!idea.trim() || ideaLoading) return;

    localStorage.setItem("ai-video-factory-idea", idea.trim());
    localStorage.removeItem(STUDIO_SESSION_KEY);

    router.push("/loading");
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,183,255,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(139,92,246,0.16),transparent_34%),linear-gradient(180deg,#050816_0%,#070a18_55%,#06071a_100%)]" />

      <header className="relative z-50 px-8 py-6">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <div>
            <div className="text-[28px] font-black leading-none tracking-[-0.04em]">
              <span className="bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                AI
              </span>{" "}
              Video Factory
            </div>

            <div className="mt-2 text-[14px] font-medium text-white/30">
              Generate. Render. Publish.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-[14px] font-black text-white/75 transition hover:bg-white/[0.08] hover:text-white"
            >
              Sign in
            </Link>

            <Link
              href="/sign-up"
              className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-7 py-3 text-[14px] font-black text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.12)] transition hover:bg-cyan-400/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-[920px] flex-col items-center px-6 pt-0 text-center">
        <div className="mb-6 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-6 py-2 text-[12px] font-black tracking-[0.2em] text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
          AI SHORT VIDEO GENERATOR
        </div>

        <h1 className="max-w-[860px] text-[48px] font-black leading-[0.95] tracking-[-0.055em] md:text-[76px]">
          One idea. One click.
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500 bg-clip-text text-transparent">
            One video.
          </span>
        </h1>

        <p className="mt-5 max-w-[790px] text-[17px] font-medium leading-[1.45] text-white/70">
          Generate ready-to-post videos with visuals, voiceover, subtitles,
          music, and instant export for TikTok, Instagram Reels, and YouTube
          Shorts in minutes.
        </p>

        <div className="mt-9 w-full max-w-[720px]">
          <div className="rounded-[24px] border border-white/12 bg-[#0b1228]/80 p-0 shadow-[0_0_45px_rgba(59,130,246,0.12)] backdrop-blur-xl">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your cinematic video idea..."
              className="h-[110px] w-full resize-none rounded-[24px] border border-white/10 bg-[#0d142c]/90 px-7 py-6 text-[18px] font-medium leading-relaxed text-white outline-none placeholder:text-white/35"
            />
          </div>

          <div className="mt-3 rounded-[24px] border border-white/10 bg-[#0b1228]/70 p-3 backdrop-blur-xl">
            <div className="grid gap-3 md:grid-cols-[1.25fr_1fr]">
              <button
                onClick={generateVideo}
                disabled={!idea.trim() || ideaLoading}
                className="h-[62px] rounded-[18px] bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 text-[20px] font-black text-white shadow-[0_0_30px_rgba(0,212,255,0.28)] transition hover:scale-[1.012] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate Video
              </button>

              <button
                onClick={surpriseMe}
                disabled={ideaLoading}
                className="h-[62px] rounded-[18px] border border-white/12 bg-white/[0.035] text-[20px] font-black text-white transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ideaLoading ? "Thinking..." : "Random Idea"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}