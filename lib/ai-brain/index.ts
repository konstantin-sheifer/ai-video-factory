import {
  createProductionPlan,
  type ProductionPlan,
  type StudioMode,
  type TargetPlatform,
} from "./executive-producer";

export type BrainRequest = {
  idea: string;
  duration?: number;
  mode?: StudioMode;
  platform?: TargetPlatform;
};

export type BrainResult = {
  production: ProductionPlan;
};

export function runAIBrain(request: BrainRequest): BrainResult {
  const production = createProductionPlan({
    idea: request.idea,
    duration: request.duration,
    mode: request.mode,
    platform: request.platform,
  });

  return {
    production,
  };
}