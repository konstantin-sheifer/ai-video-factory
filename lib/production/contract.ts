import { z } from "zod";

export const PACKAGE_ARCHITECTURE = "production-package-v1";
export const PACKAGE_VERSION = 1;
export const PRODUCTION_CONTRACT_VERSION = "2026-09-11.1";

export const PlanRequestSchema = z.object({
  idea: z.string().trim().min(1).max(1000),
  duration: z.number().int().min(5).max(7200).default(10),
}).strict();

export const PackageReferenceSchema = z.object({
  packageId: z.string().min(1).max(100),
  version: z.number().int().positive(),
}).strict();
export type PackageReference = z.infer<typeof PackageReferenceSchema>;

const seconds = z.number().int().positive();
export const ProductionPackageSchema = z.object({
  id: z.string().min(1),
  version: z.literal(PACKAGE_VERSION),
  contractVersion: z.literal(PRODUCTION_CONTRACT_VERSION),
  owner: z.string().min(1),
  createdAt: z.string().datetime(),
  intent: z.object({
    originalIdea: z.string().min(1), productionIdea: z.string().min(1),
    hook: z.string().min(1), coreEvent: z.string().min(1),
    escalation: z.string().min(1), payoff: z.string().min(1),
  }).strict(),
  provenance: z.object({ mode: z.enum(["mock", "live"]), reason: z.string().min(1) }).strict(),
  provider: z.object({
    name: z.enum(["mock", "runway"]),
    model: z.enum(["fixture", "gen4.5"]),
    promptText: z.string().min(1),
    negativePrompt: z.string(),
    // The current video adapter accepts only promptText; negativePrompt is
    // preserved as planning evidence, not falsely advertised as submitted.
    negativePromptSubmitted: z.literal(false),
    aspectRatio: z.literal("720:1280"),
  }).strict(),
  duration: z.object({
    targetSeconds: seconds, storyboardSeconds: seconds,
    keyframeSeconds: seconds, cameraSeconds: seconds, providerSeconds: seconds,
    strategy: z.literal("single_clip"),
  }).strict(),
  gate: z.object({
    state: z.enum(["approved", "rejected"]),
    score: z.number().min(0).max(100),
    reasons: z.array(z.string().min(1)),
    checks: z.array(z.object({ id: z.string(), passed: z.boolean() }).strict()).min(1),
  }).strict(),
  // Full producer and downstream evidence; never accepted from the browser.
  evidence: z.record(z.string(), z.unknown()),
}).strict();
export type ProductionPackage = z.infer<typeof ProductionPackageSchema>;

export class ProductionContractError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
    this.name = "ProductionContractError";
  }
}

export function requireCompatibleDuration(duration: ProductionPackage["duration"]) {
  const values = [duration.targetSeconds, duration.storyboardSeconds,
    duration.keyframeSeconds, duration.cameraSeconds, duration.providerSeconds];
  // Capability of the existing video adapter, not a limit on creative planning.
  if (values.some((value) => value !== 10)) {
    throw new ProductionContractError("DURATION_INCOMPATIBLE",
      "The current video adapter supports a single 10-second clip; this package has incompatible timing.", 422);
  }
}
