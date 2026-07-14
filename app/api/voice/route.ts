import { NextResponse } from "next/server";
import { createVoice } from "@/lib/providers/voice";

type VoiceRequest = {
  text?: string;
  voiceStyle?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VoiceRequest;
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "Voiceover text is required." },
        { status: 400 }
      );
    }

    const result = await createVoice(text, body.voiceStyle);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Voice route error:", error);

    return NextResponse.json(
      { error: "Failed to create voiceover." },
      { status: 500 }
    );
  }
}