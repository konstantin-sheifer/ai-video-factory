import type { Generation, Prisma } from "@prisma/client";
import type { ProductionPackageStore } from "../../lib/repositories/production-package-repository";
import { buildProductionPlan } from "../../lib/ai-brain/production-plan";

export const idea = "A night janitor discovers moving mannequins in a closed mall.";

export async function approvedFixture() {
  const previous = process.env.AI_BRAIN_LIVE;
  process.env.AI_BRAIN_LIVE = "false";
  try {
    const plan = await buildProductionPlan(idea, 10);
    // A deliberately small provider-ready fixture, not a production fallback.
    // Production over-budget output is separately required to fail closed.
    plan.aiBrain.runwayPackage.promptText = "Approved fixture: same janitor, mall, moving mannequins, final hand on glass.";
    return plan;
  } finally {
    if (previous === undefined) delete process.env.AI_BRAIN_LIVE;
    else process.env.AI_BRAIN_LIVE = previous;
  }
}

export class MemoryPackageStore implements ProductionPackageStore {
  rows = new Map<string, Generation>();
  writes: string[] = [];
  failInsert = false;
  failClaim = false;
  failFinish = false;

  async insert(data: Prisma.GenerationUncheckedCreateInput) {
    if (this.failInsert) throw new Error("database unavailable");
    const row = structuredClone(data) as Generation;
    this.rows.set(row.id, row);
    this.writes.push("insert");
    return structuredClone(row);
  }
  async findOwned(id: string, owner: string) {
    const row = this.rows.get(id);
    return row?.userId === owner ? structuredClone(row) : null;
  }
  async claim(row: Generation) {
    if (this.failClaim) throw new Error("database unavailable");
    const current = this.rows.get(row.id)!;
    if (current.version !== row.version || current.status !== "queued") return false;
    current.version++;
    current.status = "generating_video";
    this.writes.push("claim");
    return true;
  }
  async finish(id: string, _owner: string, succeeded: boolean, videoUrl?: string) {
    if (this.failFinish) throw new Error("database unavailable");
    const row = this.rows.get(id)!;
    row.status = succeeded ? "processing" : "failed";
    row.version++;
    row.videoUrl = videoUrl || null;
    this.writes.push("finish");
  }
}
