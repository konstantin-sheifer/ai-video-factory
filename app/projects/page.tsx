"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  title: string;
  idea: string;
  videoUrl: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  status: "draft" | "rendering" | "completed" | "published";
  platforms?: string[];
  createdAt: string;
  updatedAt?: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);

      const response = await fetch("/api/projects", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(0,183,255,0.10),transparent_35%),radial-gradient(circle_at_bottom,rgba(139,92,246,0.12),transparent_35%)]" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col px-8 py-6">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.38em] text-cyan-300">
              AI Video Factory
            </p>

            <h1 className="mt-1 text-[34px] font-black leading-none tracking-[-0.05em]">
              Projects
            </h1>

            <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-white/50">
              All your generated videos in one place.
              <br />
              Open any project to edit, preview, download, or publish it.
            </p>
          </div>

          <Link
            href="/"
            className="shrink-0 rounded-[18px] bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 px-6 py-3 text-sm font-black shadow-[0_0_35px_rgba(0,212,255,0.22)] transition hover:scale-[1.02]"
          >
            New Video
          </Link>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm font-bold text-white/50">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <h2 className="text-3xl font-black">No projects yet</h2>
              <p className="mt-3 text-sm text-white/50">
                Generate your first video and it will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 gap-5 pb-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <article
                key={project.id}
                className="flex min-h-[420px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] shadow-[0_0_60px_rgba(0,0,0,0.25)] backdrop-blur-xl"
              >
                <PreviewBlock project={project} />

                <div className="flex flex-1 flex-col p-5">
                  {project.status !== "completed" ? (
                    <div className="mb-3 inline-flex w-fit rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                      {project.status}
                    </div>
                  ) : null}

                  <h2 className="line-clamp-2 text-xl font-black leading-tight tracking-[-0.03em]">
                    {getProjectDisplayTitle(project)}
                  </h2>

                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/50">
                    {project.idea || "No description available."}
                  </p>

                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/30">
                    {formatDate(project.createdAt)}
                  </p>

                  <Link
                    href={`/studio?projectId=${project.id}`}
                    className="mt-auto flex h-[48px] items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] text-sm font-black transition hover:bg-white/[0.08]"
                  >
                    Open in Studio
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PreviewBlock({ project }: { project: Project }) {
  const previewUrl = project.videoUrl || project.thumbnailUrl || "";
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(previewUrl);

  if (!previewUrl) {
    return (
      <div className="flex h-[210px] items-center justify-center bg-black/40 text-xs font-bold uppercase tracking-[0.22em] text-white/25">
        No Preview
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="h-[210px] overflow-hidden bg-black">
        <img
          src={previewUrl}
          alt={project.title || "Project preview"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="h-[210px] overflow-hidden bg-black">
      <video
        src={previewUrl}
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function getProjectDisplayTitle(project: Project) {
  const rawTitle = project.title?.trim();

  if (
    rawTitle &&
    rawTitle.toLowerCase() !== "ai generated video" &&
    rawTitle.toLowerCase() !== "untitled ai video"
  ) {
    return rawTitle;
  }

  const idea = project.idea.trim();

  if (!idea) {
    return "Untitled Video";
  }

  const words = idea
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["a", "an", "the"].includes(word.toLowerCase()))
    .slice(0, 4);

  const title = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return title || "Untitled Video";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
