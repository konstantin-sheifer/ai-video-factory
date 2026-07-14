export type SubtitleItem = {
  id: number;
  start: number;
  end: number;
  text: string;
};

export type SubtitleProviderResult = {
  provider: "mock" | "openai";
  mock: boolean;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  subtitles: SubtitleItem[];
};

export async function createSubtitles(
  text: string,
  style?: "cinematic" | "viral" | "kids" | "dramatic"
): Promise<SubtitleProviderResult> {
  const provider = process.env.SUBTITLE_PROVIDER || "mock";

  if (provider === "mock") {
    return {
      provider: "mock",
      mock: true,
      status: "SUCCEEDED",
      subtitles: createStyledSubtitles(text, style || "viral"),
    };
  }

  if (provider === "openai") {
    return {
      provider: "openai",
      mock: true,
      status: "PENDING",
      subtitles: createStyledSubtitles(text, style || "viral"),
    };
  }

  throw new Error(`Unsupported subtitle provider: ${provider}`);
}

function createStyledSubtitles(
  text: string,
  style: "cinematic" | "viral" | "kids" | "dramatic"
): SubtitleItem[] {
  const clean = text.replace(/\s+/g, " ").trim();

  let chunkSize = 38;

  if (style === "viral") chunkSize = 24;
  if (style === "kids") chunkSize = 20;
  if (style === "cinematic") chunkSize = 42;
  if (style === "dramatic") chunkSize = 18;

  const chunks = clean.match(new RegExp(`.{1,${chunkSize}}(\\s|$)`, "g")) || [
    clean,
  ];

  return chunks.slice(0, 12).map((chunk, index) => {
    const start = index * 2.4;
    const end = start + 2.2;

    return {
      id: index + 1,
      start,
      end,
      text: formatSubtitle(chunk.trim(), style),
    };
  });
}

function formatSubtitle(
  text: string,
  style: "cinematic" | "viral" | "kids" | "dramatic"
) {
  if (style === "viral") return text.toUpperCase();
  if (style === "dramatic") return `${text}...`;
  if (style === "kids") return `✨ ${text}`;

  return text;
}