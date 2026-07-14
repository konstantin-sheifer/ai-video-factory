import { runAIBrainPipeline, type AIBrainPipelineInput } from "./pipeline";

export type OrchestratorStatus =
  | "approved"
  | "rejected"
  | "needs_revision";

export type OrchestratorResult = {
  status: OrchestratorStatus;
  score: number;
  reason: string;
  pipeline: ReturnType<typeof runAIBrainPipeline>;
  nextAction:
    | "continue_to_creative_pipeline"
    | "revise_user_idea"
    | "improve_trend_strategy"
    | "stop";
};

export function runAIStudioOrchestrator(
  input: AIBrainPipelineInput
): OrchestratorResult {
  const pipeline = runAIBrainPipeline(input);
  const quality = pipeline.quality;

  if (!pipeline.approved) {
    return {
      status: "rejected",
      score: quality.score,
      reason:
        quality.issues[0]?.message ||
        "The idea is not strong enough for production.",
      pipeline,
      nextAction: "revise_user_idea",
    };
  }

  if (quality.score < 85) {
    return {
      status: "needs_revision",
      score: quality.score,
      reason:
        quality.recommendations[0] ||
        "The concept is acceptable, but it should be improved before production.",
      pipeline,
      nextAction: "improve_trend_strategy",
    };
  }

  return {
    status: "approved",
    score: quality.score,
    reason:
      "The idea is strong enough to continue into the creative production pipeline.",
    pipeline,
    nextAction: "continue_to_creative_pipeline",
  };
}