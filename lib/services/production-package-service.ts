import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { buildProductionPlan, type ProductionPlan } from "@/lib/ai-brain/production-plan";
import { createVideo, type VideoProviderResult } from "@/lib/providers/video";
import { ProductionPackageRepository, type ProductionPackageStore } from "@/lib/repositories/production-package-repository";
import {
  PACKAGE_ARCHITECTURE, PACKAGE_VERSION, PRODUCTION_CONTRACT_VERSION,
  PackageReferenceSchema, PlanRequestSchema, ProductionPackageSchema,
  ProductionContractError, requireCompatibleDuration, type ProductionPackage,
} from "@/lib/production/contract";

export function configuredVideoProvider(): "mock" | "runway" {
  const provider = process.env.VIDEO_PROVIDER || "mock";
  if (provider !== "mock" && provider !== "runway") {
    throw new ProductionContractError("PROVIDER_UNSUPPORTED", "Unsupported video provider configuration.", 503);
  }
  return provider;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function packageDigest(snapshot: ProductionPackage) {
  return createHash("sha256").update(canonicalJson(snapshot)).digest("hex");
}

export class ProductionPackageService {
  constructor(
    private readonly store: ProductionPackageStore = new ProductionPackageRepository(),
    private readonly build: (idea: string, duration: number) => Promise<ProductionPlan> = buildProductionPlan,
    private readonly video: (prompt: string) => Promise<VideoProviderResult> = createVideo,
    private readonly provider: () => "mock" | "runway" = configuredVideoProvider,
  ) {}

  async prepare(owner: string, input: unknown) {
    this.requireOwner(owner);
    const parsed = PlanRequestSchema.safeParse(input);
    if (!parsed.success) throw new ProductionContractError("INVALID_PLAN_REQUEST", "Invalid idea or duration.", 400);
    const { idea, duration } = parsed.data;
    const provider = this.provider();
    const plan = await this.build(idea, duration);
    const { creativeProducer: producer, creativeBrief: brief, emotionDirector, qualityReview: quality,
      storyboard, keyframes, cameraPlan, runwayPackage } = plan.aiBrain;
    const durationContract: ProductionPackage["duration"] = {
      targetSeconds: duration, storyboardSeconds: storyboard.duration,
      keyframeSeconds: keyframes.duration, cameraSeconds: cameraPlan.duration,
      providerSeconds: runwayPackage.duration, strategy: "single_clip",
    };
    const checks = [
      { id: "producer", passed: producer.recommendation.shouldGenerate === true },
      { id: "producer_checks", passed: producer.stageChecks.length > 0 && producer.stageChecks.every(c => c.passed === true) },
      { id: "brief", passed: brief.finalGate.canGenerate === true },
      { id: "emotion", passed: emotionDirector.status === "approved" && emotionDirector.checks.length > 0 && emotionDirector.checks.every(c => c.passed === true) },
      { id: "quality", passed: quality.approved === true && quality.canGenerate === true && quality.overallScore >= 75 && quality.requiredFixes.length === 0 },
      { id: "provenance", passed: provider === "mock" || producer.provenance.mode === "live" },
      { id: "duration", passed: Object.values(durationContract).filter(v => typeof v === "number").every(v => v === 10) && brief.duration === duration && plan.aiBrain.bible.source.duration === duration },
      { id: "provider_prompt", passed: runwayPackage.promptText.trim().length > 0 && runwayPackage.promptText.length <= 2500 },
    ];
    const reasons = checks.filter(c => !c.passed).map(c => c.id);
    const snapshot = ProductionPackageSchema.parse({
      id: randomUUID(), version: PACKAGE_VERSION, contractVersion: PRODUCTION_CONTRACT_VERSION,
      owner, createdAt: new Date().toISOString(),
      intent: { originalIdea: idea, productionIdea: producer.productionIdea,
        hook: producer.hook, coreEvent: producer.coreEvent, escalation: producer.escalation, payoff: producer.payoff },
      provenance: producer.provenance,
      provider: { name: provider, model: provider === "runway" ? "gen4.5" : "fixture",
        promptText: runwayPackage.promptText, negativePrompt: runwayPackage.negativePrompt,
        negativePromptSubmitted: false, aspectRatio: "720:1280" },
      duration: durationContract,
      gate: { state: reasons.length ? "rejected" : "approved", score: quality.overallScore, reasons, checks },
      evidence: JSON.parse(JSON.stringify(plan.aiBrain)),
    });
    await this.store.insert({
      id: snapshot.id, userId: owner, idea, prompt: snapshot.provider.promptText,
      status: snapshot.gate.state === "approved" ? "queued" : "failed",
      currentStage: "planning", progress: 0, version: PACKAGE_VERSION,
      architectureVersion: PACKAGE_ARCHITECTURE, schemaVersion: PACKAGE_VERSION,
      mode: producer.provenance.mode === "mock" && provider === "mock" ? "mock" : producer.provenance.mode === "live" && provider === "runway" ? "live" : "mixed",
      videoProvider: provider,
      productionPackageJson: snapshot as unknown as Prisma.InputJsonValue,
      promptVersionJson: { digest: packageDigest(snapshot), contractVersion: PRODUCTION_CONTRACT_VERSION },
      qualitySummaryJson: snapshot.gate,
      scriptJson: plan.script,
      failureCode: snapshot.gate.state === "rejected" ? "production_package_rejected" : undefined,
    });
    return {
      provider: "ai-brain", mock: producer.provenance.mode === "mock",
      productionPackage: { packageId: snapshot.id, version: snapshot.version },
      canGenerate: snapshot.gate.state === "approved",
      generationBlocked: snapshot.gate.state !== "approved",
      generationBlockReason: reasons.length ? `Production blocked: ${reasons.join(", ")}.` : "",
      script: plan.script, aiBrain: plan.aiBrain,
    };
  }

  async generate(owner: string, input: unknown) {
    this.requireOwner(owner);
    const parsed = PackageReferenceSchema.safeParse(input);
    if (!parsed.success) throw new ProductionContractError("INVALID_PACKAGE_REFERENCE", "Only a production package ID and version are accepted.", 400);
    const { packageId, version } = parsed.data;
    const row = await this.store.findOwned(packageId, owner);
    if (!row) throw new ProductionContractError("PACKAGE_NOT_FOUND", "Production package not found for this user.", 404);
    const parsedPackage = ProductionPackageSchema.safeParse(row.productionPackageJson);
    if (!parsedPackage.success) throw new ProductionContractError("PACKAGE_INVALID", "Invalid or obsolete production package.", 409);
    const snapshot = parsedPackage.data;
    const metadata = row.promptVersionJson as { digest?: string } | null;
    if (snapshot.owner !== owner || snapshot.id !== row.id || row.architectureVersion !== PACKAGE_ARCHITECTURE ||
        metadata?.digest !== packageDigest(snapshot)) {
      throw new ProductionContractError("PACKAGE_INVALID", "Production package integrity check failed.", 409);
    }
    if (version !== snapshot.version || row.schemaVersion !== PACKAGE_VERSION) {
      throw new ProductionContractError("PACKAGE_VERSION_STALE", "Production package version is outdated.", 409);
    }
    requireCompatibleDuration(snapshot.duration);
    if (snapshot.gate.state !== "approved" || snapshot.gate.reasons.length ||
        snapshot.gate.checks.some(c => !c.passed) || snapshot.gate.score < 75) {
      throw new ProductionContractError("PACKAGE_NOT_APPROVED", "Production package was not approved.", 422);
    }
    const provider = this.provider();
    if (snapshot.provider.name !== provider || snapshot.provider.model !== (provider === "runway" ? "gen4.5" : "fixture") ||
        (provider === "runway" && snapshot.provenance.mode !== "live")) {
      throw new ProductionContractError("PROVIDER_INCOMPATIBLE", "Provider configuration changed or planning provenance is incompatible.", 409);
    }
    if (snapshot.provider.promptText.length > 2500) {
      throw new ProductionContractError("PROVIDER_PROMPT_INCOMPATIBLE", "Approved prompt exceeds the video adapter budget.", 422);
    }
    if (row.version !== snapshot.version || row.status !== "queued" || !await this.store.claim(row)) {
      throw new ProductionContractError("PACKAGE_CONSUMED", "This package is no longer available for video submission.", 409);
    }
    // A crash or ambiguous provider failure leaves this snapshot consumed.
    // No automatic resubmission of a potentially billable request.
    try {
      const result = await this.video(snapshot.provider.promptText);
      if (result.status !== "SUCCEEDED" || !result.videoUrl || result.provider !== provider || result.mock !== (provider === "mock")) {
        throw new Error("Video provider returned an incompatible outcome.");
      }
      await this.store.finish(row.id, owner, true, result.videoUrl);
      return result;
    } catch {
      await this.store.finish(row.id, owner, false).catch(() => undefined);
      throw new ProductionContractError("VIDEO_SUBMISSION_FAILED", "Video submission failed or its outcome could not be saved. This package will not be submitted again.", 502);
    }
  }

  private requireOwner(owner: string) {
    if (!owner.trim()) throw new ProductionContractError("UNAUTHENTICATED", "Authentication required.", 401);
  }
}
