import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import {
  AppAuthenticationError,
  requireAppUser,
} from "@/lib/auth/require-app-user";
import {
  getMockStarterConcepts,
  shouldUseMockStarterQueue,
  type StarterConcept,
} from "@/lib/channels/starter-concepts";
import {
  ensureChannelForUser,
  getChannelConceptsForUser,
  getChannelQueueByUser,
  saveStarterConceptsForUser,
} from "@/lib/storage/channel-queue";

const RequestSchema = z.object({
  channelId: z.string().min(1),
  channelName: z.string().min(1),
  category: z.string().min(1),
});

const IdeaSchema = z.object({
  title: z.string(),
  hook: z.string(),
  script: z.string(),
  visual: z.string(),
});

const ResponseSchema = z.object({ ideas: z.array(IdeaSchema).min(1).max(10) });

export async function GET() {
  try {
    const { internalUserId } = await requireAppUser();
    const concepts = await getChannelQueueByUser(internalUserId);

    return NextResponse.json({
      concepts: concepts.map((item) => ({
        id: item.id,
        channelId: item.channelId,
        channelName: item.channel.name,
        title: item.title,
        hook: item.hook,
        visual: item.visual,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { internalUserId } = await requireAppUser();
    const parsed = RequestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { channelId, channelName, category } = parsed.data;
    const channel = await ensureChannelForUser({
      id: channelId,
      userId: internalUserId,
      name: channelName,
      category,
    });

    if (channel.status === "forbidden") {
      return NextResponse.json(
        { error: "You do not have permission to modify this channel." },
        { status: 403 }
      );
    }

    const mock = shouldUseMockStarterQueue(process.env);
    const existingConcepts = await getChannelConceptsForUser(
      channelId,
      internalUserId
    );
    if (existingConcepts.length) {
      return createQueueResponse(existingConcepts, mock);
    }

    const ideas = mock
      ? getMockStarterConcepts(category)
      : await generateLiveConcepts(channelName, category);
    const concepts = await saveStarterConceptsForUser(
      channelId,
      internalUserId,
      ideas
    );

    if (!concepts) {
      return NextResponse.json(
        { error: "You do not have permission to modify this channel." },
        { status: 403 }
      );
    }

    return createQueueResponse(concepts, mock);
  } catch (error) {
    return handleError(error);
  }
}

function createQueueResponse(
  concepts: Array<StarterConcept & { id: string; createdAt: Date }>,
  mock: boolean
) {
  return NextResponse.json({
    ideas: concepts.map(({ id, title, hook, script, visual, createdAt }) => ({
      id,
      title,
      hook,
      script,
      visual,
      createdAt: createdAt.toISOString(),
    })),
    mock,
  });
}

async function generateLiveConcepts(
  channelName: string,
  category: string
): Promise<StarterConcept[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert short-form video strategist. Return only JSON with an ideas array containing exactly 10 objects with title, hook, script, and visual string fields. Make every idea specific, coherent, family-friendly, and suitable for a cinematic vertical 9:16 video.`,
      },
      {
        role: "user",
        content: `Channel Name: ${channelName}\nContent Category: ${category}\nCreate 10 highly viral short-form video concepts.`,
      },
    ],
    response_format: { type: "json_object" },
  });
  const content = completion.choices[0]?.message?.content;
  const parsed = content ? ResponseSchema.safeParse(JSON.parse(content)) : null;

  if (!parsed?.success) throw new Error("Invalid provider response.");
  return parsed.data.ideas;
}

function handleError(error: unknown) {
  if (error instanceof AppAuthenticationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Channel queue generation failed.", error);
  return NextResponse.json(
    { error: "Failed to generate queue." },
    { status: 500 }
  );
}
