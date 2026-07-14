import { createProductionPlan, type StudioMode, type TargetPlatform } from "./executive-producer";
import { analyzeTrend } from "./agents/trend-strategist";
import { createStoryArchitecture } from "./agents/story-architect";
import { designCharacter } from "./agents/character-designer";
import { designEnvironment } from "./agents/environment-designer";
import { reviewProduction } from "./agents/quality-controller";

export type AIBrainPipelineInput = {
  idea: string;
  duration?: number;
  mode?: StudioMode;
  platform?: TargetPlatform;
};

export type AIBrainPipelineResult = {
  production: ReturnType<typeof createProductionPlan>;
  trend: ReturnType<typeof analyzeTrend>;
  storyArchitecture: ReturnType<typeof createStoryArchitecture>;
  character: ReturnType<typeof designCharacter>;
  environment: ReturnType<typeof designEnvironment>;
  quality: ReturnType<typeof reviewProduction>;
  approved: boolean;
};

export function runAIBrainPipeline(
  input: AIBrainPipelineInput
): AIBrainPipelineResult {
  const production = createProductionPlan({
    idea: input.idea,
    duration: input.duration,
    mode: input.mode,
    platform: input.platform,
  });

  const trend = analyzeTrend({
    originalIdea: production.intent.idea,
    platform: production.intent.platform,
  });

  const quality = reviewProduction({
    idea: trend.improvedIdea,
    duration: production.intent.duration,
  });

  const storyArchitecture = createStoryArchitecture({
    idea: trend.improvedIdea,
    duration: production.intent.duration,
  });

  const character = designCharacter({
    idea: trend.improvedIdea,
    genre: production.intent.mode,
  });

  const environment = designEnvironment({
    idea: trend.improvedIdea,
    genre: production.intent.mode,
  });

  return {
    production,
    trend,
    storyArchitecture,
    character,
    environment,
    quality,
    approved: quality.approved,
  };
}