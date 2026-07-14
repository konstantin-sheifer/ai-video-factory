import { NextResponse } from "next/server";

type SubtitleStyle = "cinematic" | "viral" | "kids" | "dramatic";

type SubtitleRequest = {
  text?: string;
  style?: SubtitleStyle;
  duration?: number;
};

type SubtitleItem = {
  id: number;
  start: number;
  end: number;
  text: string;
};

const DEFAULT_DURATION = 10;
const MAX_SUBTITLE_LINES = 12;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubtitleRequest;

    const text = body.text?.trim();
    const style = body.style || "viral";
    const duration = getSafeDuration(body.duration);

    if (!text) {
      return NextResponse.json(
        {
          error: "Subtitle text is required.",
        },
        {
          status: 400,
        }
      );
    }

    const provider = process.env.SUBTITLE_PROVIDER || "mock";
    const subtitles = createStyledSubtitles(text, style, duration);

    if (provider === "mock") {
      return NextResponse.json({
        provider: "local-viral-subtitles",
        mock: true,
        style,
        status: "SUCCEEDED",
        duration,
        subtitles,
      });
    }

    if (provider === "openai") {
      return NextResponse.json({
        provider: "openai-fallback-viral-subtitles",
        mock: true,
        style,
        status: "SUCCEEDED",
        duration,
        subtitles,
      });
    }

    return NextResponse.json(
      {
        error: `Unsupported subtitle provider: ${provider}`,
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error("Subtitles route error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate subtitles.",
      },
      {
        status: 500,
      }
    );
  }
}

function createStyledSubtitles(
  text: string,
  style: SubtitleStyle,
  duration: number
): SubtitleItem[] {
  const clean = normalizeText(text);
  const maxWords = getWordsPerLine(style);
  const lines = splitIntoReadableLines(clean, maxWords).slice(
    0,
    MAX_SUBTITLE_LINES
  );

  if (!lines.length) {
    return [];
  }

  const totalWords = lines.reduce((sum, line) => {
    return sum + line.split(" ").filter(Boolean).length;
  }, 0);

  let cursor = 0;

  return lines.map((line, index) => {
    const wordCount = Math.max(1, line.split(" ").filter(Boolean).length);
    const proportionalDuration = duration * (wordCount / totalWords);
    const segmentDuration = clamp(proportionalDuration, 0.9, 2.2);

    const start = roundTime(cursor);
    const end =
      index === lines.length - 1
        ? roundTime(duration)
        : roundTime(Math.min(duration, cursor + segmentDuration));

    cursor = end;

    return {
      id: index + 1,
      start,
      end,
      text: formatSubtitle(line, style),
    };
  });
}

function splitIntoReadableLines(text: string, maxWords: number): string[] {
  const sentenceParts = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const lines: string[] = [];

  for (const sentence of sentenceParts) {
    const words = sentence.split(" ").filter(Boolean);

    for (let i = 0; i < words.length; i += maxWords) {
      const chunk = words.slice(i, i + maxWords).join(" ");
      const line = cleanSubtitleLine(chunk);

      if (line) {
        lines.push(line);
      }
    }
  }

  return lines;
}

function getWordsPerLine(style: SubtitleStyle) {
  if (style === "viral") return 4;
  if (style === "dramatic") return 3;
  if (style === "kids") return 3;
  return 5;
}

function formatSubtitle(text: string, style: SubtitleStyle) {
  const clean = cleanSubtitleLine(text);

  if (style === "viral") {
    return clean.toUpperCase();
  }

  if (style === "dramatic") {
    return `${clean.toUpperCase()}...`;
  }

  if (style === "kids") {
    return `✨ ${clean.toUpperCase()}`;
  }

  return clean;
}

function normalizeText(text: string) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSubtitleLine(text: string) {
  return normalizeText(text)
    .replace(/^[,.:;!?\-–—\s]+/, "")
    .replace(/[,.:;!?\-–—\s]+$/, "")
    .trim();
}

function getSafeDuration(value?: number) {
  const duration = Number(value);

  if (!Number.isFinite(duration) || duration <= 0) {
    return DEFAULT_DURATION;
  }

  return Math.min(Math.max(duration, 3), 120);
}

function roundTime(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
