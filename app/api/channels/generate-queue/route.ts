import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RequestSchema = z.object({
  channelName: z.string().min(1),
  category: z.string().min(1),
});

const IdeaSchema = z.object({
  title: z.string(),
  hook: z.string(),
  script: z.string(),
  visual: z.string(),
});

const ResponseSchema = z.object({
  ideas: z.array(IdeaSchema).min(1).max(10),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { channelName, category } = parsed.data;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `
You are an expert short-form video strategist for TikTok, YouTube Shorts, and Instagram Reels.

Return ONLY valid JSON in this exact shape:
{
  "ideas": [
    {
      "title": "string",
      "hook": "string",
      "script": "string",
      "visual": "string"
    }
  ]
}

Generate exactly 10 ideas.

Rules:
- Each title must be specific, not generic.
- Each hook must be short and curiosity-driven.
- Each script must be ready for a 20-45 second voiceover.
- Each script must be 4-7 short lines.
- Each visual must be a detailed vertical 9:16 video prompt.
- Avoid generic phrases like "a hidden detail", "this topic", "a surprising fact".
- Make every idea feel like a real viral short.
`,
        },
        {
          role: "user",
          content: `
Channel Name: ${channelName}
Content Category: ${category}

Create 10 highly viral short-form video concepts for this channel.
`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No OpenAI response content.");
    }

    const json = JSON.parse(content);
    const parsedIdeas = ResponseSchema.safeParse(json);

    if (!parsedIdeas.success) {
      console.error(parsedIdeas.error);
      throw new Error("OpenAI returned invalid queue format.");
    }

    return NextResponse.json(parsedIdeas.data);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to generate queue." },
      { status: 500 }
    );
  }
}