import { NextResponse } from "next/server";
import {
  AppAuthenticationError,
  requireAppUser,
} from "@/lib/auth/require-app-user";

const fallbackIdeas = [
  "A penguin accidentally becomes the captain of a spaceship full of chickens.",
  "A tiny dragon opens a sushi restaurant and must impress a grumpy food critic wizard.",
  "A grandma joins an underground robot boxing league and becomes the champion.",
  "A nervous cloud tries to become a famous DJ but keeps accidentally making rain.",
  "A cat finds a magic elevator that opens into different historical eras.",
  "A pirate ship lands in a modern shopping mall and the crew tries to find treasure.",
  "A baby elephant becomes a ballet dancer and saves a royal performance.",
  "A lonely moon starts texting Earth because it wants a friend.",
  "A school lunch sandwich comes alive and runs for class president.",
  "A raccoon becomes a luxury hotel manager for one chaotic night.",
];

const categories = [
  "animals",
  "space",
  "fantasy",
  "food characters",
  "kids adventure",
  "robots",
  "magic objects",
  "superheroes",
  "school comedy",
  "tiny monsters",
  "ocean adventure",
  "time travel",
];

const genres = [
  "comedy",
  "cinematic adventure",
  "cute emotional story",
  "absurd meme story",
  "mini fantasy epic",
  "family-friendly chaos",
  "unexpected hero story",
  "magical realism",
];

const locations = [
  "airport",
  "school cafeteria",
  "moon base",
  "underwater city",
  "medieval castle",
  "shopping mall",
  "tiny village",
  "zoo after midnight",
  "spaceship kitchen",
  "subway station",
  "cloud kingdom",
  "enchanted forest",
];

export async function POST() {
  try {
    await requireAppUser();

    const category = pickRandom(categories);
    const genre = pickRandom(genres);
    const location = pickRandom(locations);
    const randomSeed = crypto.randomUUID();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        idea: getFallbackIdea(),
        mock: true,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 1.25,
        presence_penalty: 1.2,
        frequency_penalty: 1.1,
        messages: [
          {
            role: "system",
            content:
              "You create highly varied viral short-video ideas for TikTok, YouTube Shorts, and Instagram Reels. Each idea must be visual, funny or emotional, family-friendly, surprising, and easy to turn into a 15-30 second AI video. Never repeat robots, toasters, bread, mugs, or generic AI transformation concepts unless specifically requested. Return only one idea. No quotes. No explanation.",
          },
          {
            role: "user",
            content: `Generate ONE fresh short-video idea using this random creative seed:

Category: ${category}
Genre: ${genre}
Location: ${location}
Random seed: ${randomSeed}

Rules:
- Make it feel like a mini story, not a marketing concept.
- Use a clear main character.
- Add one unexpected twist.
- Avoid corporate, tech-demo, or generic AI showcase ideas.
- Avoid repeating common objects like robots, mugs, bread, and toasters.
- Keep it under 24 words.`,
          },
        ],
      }),
    });

    const data = await response.json();

    const idea =
      data.choices?.[0]?.message?.content?.trim() || getFallbackIdea();

    return NextResponse.json({
      idea,
      mock: false,
      seed: {
        category,
        genre,
        location,
      },
    });
  } catch (error) {
    if (error instanceof AppAuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error(error);

    return NextResponse.json({
      idea: getFallbackIdea(),
      mock: true,
    });
  }
}

function pickRandom(items: string[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getFallbackIdea() {
  return fallbackIdeas[Math.floor(Math.random() * fallbackIdeas.length)];
}
