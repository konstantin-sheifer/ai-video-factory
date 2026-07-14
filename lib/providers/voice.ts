export type VoiceProviderResult = {
  provider: "mock" | "openai" | "elevenlabs";
  mock: boolean;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  audioUrl: string;
};

const MOCK_AUDIO_URL =
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

type VoiceStyle =
  | "cinematic"
  | "male"
  | "female"
  | "narrator"
  | "storyteller"
  | "energetic"
  | "calm";

export async function createVoice(
  text: string,
  voiceStyle?: string
): Promise<VoiceProviderResult> {
  const provider = process.env.VOICE_PROVIDER || "mock";
  const normalizedVoiceStyle = normalizeVoiceStyle(voiceStyle);

  if (provider === "mock") {
    return {
      provider: "mock",
      mock: true,
      status: "SUCCEEDED",
      audioUrl: MOCK_AUDIO_URL,
    };
  }

  if (provider === "openai") {
    return createOpenAIVoice(text, normalizedVoiceStyle);
  }

  if (provider === "elevenlabs") {
    return createElevenLabsVoice(text, normalizedVoiceStyle);
  }

  throw new Error(`Unsupported voice provider: ${provider}`);
}

async function createOpenAIVoice(
  text: string,
  voiceStyle: VoiceStyle
): Promise<VoiceProviderResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE || mapVoiceStyleToOpenAI(voiceStyle),
      input: text,
      format: "mp3",
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI voice generation failed.");
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const audioBase64 = audioBuffer.toString("base64");

  return {
    provider: "openai",
    mock: false,
    status: "SUCCEEDED",
    audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
  };
}

async function createElevenLabsVoice(
  text: string,
  voiceStyle: VoiceStyle
): Promise<VoiceProviderResult> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is missing.");
  }

  const voiceId = getElevenLabsVoiceId(voiceStyle);
  const modelId =
    process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: getElevenLabsVoiceSettings(voiceStyle),
      }),
    }
  );

  if (!response.ok) {
    throw new Error("ElevenLabs voice generation failed.");
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const audioBase64 = audioBuffer.toString("base64");

  return {
    provider: "elevenlabs",
    mock: false,
    status: "SUCCEEDED",
    audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
  };
}

function normalizeVoiceStyle(style?: string): VoiceStyle {
  const value = style?.toLowerCase().trim();

  if (
    value === "male" ||
    value === "female" ||
    value === "narrator" ||
    value === "storyteller" ||
    value === "energetic" ||
    value === "calm" ||
    value === "cinematic"
  ) {
    return value;
  }

  return "cinematic";
}

function mapVoiceStyleToOpenAI(style: VoiceStyle) {
  switch (style) {
    case "female":
      return "nova";

    case "male":
      return "onyx";

    case "narrator":
      return "echo";

    case "storyteller":
      return "fable";

    case "energetic":
      return "shimmer";

    case "calm":
      return "alloy";

    case "cinematic":
    default:
      return "onyx";
  }
}

function getElevenLabsVoiceId(style: VoiceStyle) {
  switch (style) {
    case "female":
      return (
        process.env.ELEVENLABS_FEMALE_VOICE_ID ||
        process.env.ELEVENLABS_VOICE_ID ||
        "JBFqnCBsd6RMkjVDRZzb"
      );

    case "male":
      return (
        process.env.ELEVENLABS_MALE_VOICE_ID ||
        process.env.ELEVENLABS_VOICE_ID ||
        "JBFqnCBsd6RMkjVDRZzb"
      );

    case "narrator":
      return (
        process.env.ELEVENLABS_NARRATOR_VOICE_ID ||
        process.env.ELEVENLABS_VOICE_ID ||
        "JBFqnCBsd6RMkjVDRZzb"
      );

    case "storyteller":
      return (
        process.env.ELEVENLABS_STORYTELLER_VOICE_ID ||
        process.env.ELEVENLABS_VOICE_ID ||
        "JBFqnCBsd6RMkjVDRZzb"
      );

    case "energetic":
      return (
        process.env.ELEVENLABS_ENERGETIC_VOICE_ID ||
        process.env.ELEVENLABS_VOICE_ID ||
        "JBFqnCBsd6RMkjVDRZzb"
      );

    case "calm":
      return (
        process.env.ELEVENLABS_CALM_VOICE_ID ||
        process.env.ELEVENLABS_VOICE_ID ||
        "JBFqnCBsd6RMkjVDRZzb"
      );

    case "cinematic":
    default:
      return process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
  }
}

function getElevenLabsVoiceSettings(style: VoiceStyle) {
  switch (style) {
    case "energetic":
      return {
        stability: 0.36,
        similarity_boost: 0.78,
        style: 0.7,
        use_speaker_boost: true,
      };

    case "calm":
      return {
        stability: 0.65,
        similarity_boost: 0.82,
        style: 0.2,
        use_speaker_boost: true,
      };

    case "storyteller":
      return {
        stability: 0.48,
        similarity_boost: 0.84,
        style: 0.55,
        use_speaker_boost: true,
      };

    case "narrator":
      return {
        stability: 0.58,
        similarity_boost: 0.86,
        style: 0.35,
        use_speaker_boost: true,
      };

    case "female":
    case "male":
    case "cinematic":
    default:
      return {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      };
  }
}
