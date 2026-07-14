import { NextResponse } from "next/server";

type TranscribeRequest = {
  audioUrl?: string;
  wordsPerSubtitle?: number;
};

type WhisperSegment = {
  id?: number;
  start: number;
  end: number;
  text: string;
};

type SubtitleItem = {
  id: number;
  start: number;
  end: number;
  text: string;
};

const DEFAULT_WORDS_PER_SUBTITLE = 4;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranscribeRequest;
    const audioUrl = String(body.audioUrl || "").trim();

    if (!audioUrl) {
      return NextResponse.json(
        { error: "Audio URL is required." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing." },
        { status: 500 }
      );
    }

    const audioFile = await audioUrlToFile(audioUrl);

    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || "Whisper transcription failed.",
        },
        { status: 500 }
      );
    }

    const segments = Array.isArray(data.segments)
      ? (data.segments as WhisperSegment[])
      : [];

    const subtitles = createSubtitlesFromSegments(
      segments,
      body.wordsPerSubtitle || DEFAULT_WORDS_PER_SUBTITLE
    );

    return NextResponse.json({
      provider: "openai-whisper",
      mock: false,
      status: "SUCCEEDED",
      subtitles,
      text: data.text || "",
    });
  } catch (error) {
    console.error("Transcribe route error:", error);

    return NextResponse.json(
      { error: "Failed to transcribe audio." },
      { status: 500 }
    );
  }
}

async function audioUrlToFile(audioUrl: string) {
  if (audioUrl.startsWith("data:")) {
    return dataUrlToFile(audioUrl);
  }

  const response = await fetch(audioUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load audio. Status: ${response.status}`);
  }

  const blob = await response.blob();

  return new File([blob], "voiceover.mp3", {
    type: blob.type || "audio/mpeg",
  });
}

function dataUrlToFile(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid audio data URL.");
  }

  const mimeType = match[1] || "audio/mpeg";
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");

  return new File([buffer], "voiceover.mp3", {
    type: mimeType,
  });
}

function createSubtitlesFromSegments(
  segments: WhisperSegment[],
  wordsPerSubtitle: number
): SubtitleItem[] {
  const subtitles: SubtitleItem[] = [];
  const maxWords = Math.min(Math.max(Number(wordsPerSubtitle) || 4, 2), 6);

  for (const segment of segments) {
    const words = normalizeText(segment.text).split(" ").filter(Boolean);

    if (!words.length) continue;

    const segmentDuration = Math.max(0.5, segment.end - segment.start);
    const secondsPerWord = segmentDuration / words.length;

    for (let index = 0; index < words.length; index += maxWords) {
      const chunkWords = words.slice(index, index + maxWords);
      const start = segment.start + index * secondsPerWord;
      const end = segment.start + (index + chunkWords.length) * secondsPerWord;

      subtitles.push({
        id: subtitles.length + 1,
        start: roundTime(start),
        end: roundTime(end),
        text: chunkWords.join(" ").toUpperCase(),
      });
    }
  }

  return subtitles;
}

function normalizeText(text: string) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function roundTime(value: number) {
  return Math.round(value * 10) / 10;
}
