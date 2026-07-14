"use client";

import { useMemo, useState } from "react";

type BrainResponse = {
  provider?: string;
  mock?: boolean;
  canGenerate?: boolean;
  generationBlocked?: boolean;
  generationBlockReason?: string;
  script?: {
    title?: string;
    hook?: string;
    runwayPrompt?: string;
    scenes?: Array<{
      voiceover?: string;
      subtitle?: string;
      visual?: string;
    }>;
  };
  aiBrain?: Record<string, unknown>;
};

const DEFAULT_IDEA =
  "A night janitor discovers that every mannequin in a closed shopping mall moves when nobody is looking.";

const STAGE_ORDER = [
  "creativeProducer",
  "bible",
  "storyboard",
  "keyframes",
  "cameraPlan",
  "providerPrompt",
  "runwayPackage",
  "qualityReview",
];

export default function AIBrainInspectorPage() {
  const [idea, setIdea] = useState(DEFAULT_IDEA);
  const [duration, setDuration] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrainResponse | null>(null);
  const [error, setError] = useState("");
  const [openStage, setOpenStage] = useState<string>("creativeProducer");

  const aiBrain = result?.aiBrain || {};

  const stages = useMemo(() => {
    return STAGE_ORDER.map((key) => ({
      key,
      label: getStageLabel(key),
      status: aiBrain[key] ? "ready" : "missing",
      value: aiBrain[key],
    }));
  }, [aiBrain]);

  async function inspectBrain() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idea,
          duration,
        }),
      });

      const data = (await response.json()) as BrainResponse;

      if (!response.ok) {
        throw new Error("Failed to inspect AI Brain.");
      }

      setResult(data);
      setOpenStage("creativeProducer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
            AI Video Factory
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            AI Brain Inspector
          </h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Inspect the full AI Movie Studio pipeline before spending video
            credits. This runs the brain only — no Runway generation.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl">
          <div className="grid gap-4 lg:grid-cols-[1fr_140px_160px]">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">
                User idea
              </span>
              <textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                className="min-h-28 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">
                Duration
              </span>
              <input
                type="number"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"
              />
            </label>

            <button
              onClick={inspectBrain}
              disabled={loading || !idea.trim()}
              className="self-end rounded-xl bg-cyan-400 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Inspecting..." : "Inspect AI Brain"}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </section>

        {result ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <StatusCard label="Provider" value={result.provider || "unknown"} />
              <StatusCard
                label="Can Generate"
                value={result.canGenerate ? "Yes" : "No"}
                tone={result.canGenerate ? "good" : "bad"}
              />
              <StatusCard
                label="Blocked"
                value={result.generationBlocked ? "Yes" : "No"}
                tone={result.generationBlocked ? "bad" : "good"}
              />
              <StatusCard label="Title" value={result.script?.title || "Untitled"} />
            </section>

            {result.generationBlockReason ? (
              <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                {result.generationBlockReason}
              </section>
            ) : null}

            <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <h2 className="mb-4 text-lg font-semibold">Pipeline</h2>
                <div className="flex flex-col gap-2">
                  {stages.map((stage, index) => (
                    <button
                      key={stage.key}
                      onClick={() => setOpenStage(stage.key)}
                      className={`rounded-xl border p-4 text-left transition ${
                        openStage === stage.key
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-slate-800 bg-slate-950/60 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-500">
                            Stage {index + 1}
                          </div>
                          <div className="font-medium">{stage.label}</div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            stage.status === "ready"
                              ? "bg-emerald-400/15 text-emerald-300"
                              : "bg-red-400/15 text-red-300"
                          }`}
                        >
                          {stage.status === "ready" ? "✓" : "!"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    {getStageLabel(openStage)}
                  </h2>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    JSON
                  </span>
                </div>

                <pre className="max-h-[620px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
                  {JSON.stringify(aiBrain[openStage] || null, null, 2)}
                </pre>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <TextPanel
                title="Narration"
                text={result.script?.scenes?.[0]?.voiceover || ""}
              />
              <TextPanel
                title="Runway Prompt"
                text={result.script?.runwayPrompt || ""}
              />
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function StatusCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
        ? "text-red-300"
        : "text-white";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className={`mt-2 truncate text-lg font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function TextPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
        {text || "No data."}
      </pre>
    </div>
  );
}

function getStageLabel(key: string) {
  const labels: Record<string, string> = {
    creativeProducer: "Creative Producer",
    bible: "Production Bible",
    storyboard: "Storyboard",
    keyframes: "Keyframes",
    cameraPlan: "Camera Plan",
    providerPrompt: "Provider Prompt",
    runwayPackage: "Runway Adapter",
    qualityReview: "Quality Review",
  };

  return labels[key] || key;
}
