export type PublishProviderInput = {
  videoUrl: string;
  platforms: string[];
  caption?: string;
  projectId?: string;
};

export type PublishedPlatform = {
  platform: string;
  status: "published" | "failed" | "pending";
  postUrl: string;
};

export type PublishProviderResult = {
  provider: "mock" | "real";
  mock: boolean;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  message: string;
  publishedTo: PublishedPlatform[];
};

export async function publishVideo(
  input: PublishProviderInput
): Promise<PublishProviderResult> {
  const provider = process.env.PUBLISH_PROVIDER || "mock";

  if (provider === "mock") {
    return mockPublish(input);
  }

  if (provider === "real") {
    return realPublishPlaceholder(input);
  }

  throw new Error(`Unsupported publish provider: ${provider}`);
}

async function mockPublish(
  input: PublishProviderInput
): Promise<PublishProviderResult> {
  await new Promise((resolve) => setTimeout(resolve, 2500));

  return {
    provider: "mock",
    mock: true,
    status: "SUCCEEDED",
    message: `Published to ${input.platforms.join(", ")}.`,
    publishedTo: input.platforms.map((platform) => ({
      platform,
      status: "published",
      postUrl: "#",
    })),
  };
}

async function realPublishPlaceholder(
  input: PublishProviderInput
): Promise<PublishProviderResult> {
  return {
    provider: "real",
    mock: true,
    status: "PENDING",
    message:
      "Real publishing providers are prepared but not connected yet.",
    publishedTo: input.platforms.map((platform) => ({
      platform,
      status: "pending",
      postUrl: "",
    })),
  };
}