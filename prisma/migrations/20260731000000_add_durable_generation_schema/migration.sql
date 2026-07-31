-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM (
    'queued',
    'planning',
    'processing',
    'generating_video',
    'generating_voice',
    'creating_subtitles',
    'rendering',
    'finalizing',
    'completed',
    'retrying',
    'cancelling',
    'cancelled',
    'failed'
);

-- CreateEnum
CREATE TYPE "GenerationStage" AS ENUM (
    'intake',
    'planning',
    'script',
    'timeline',
    'video',
    'voice',
    'transcription',
    'subtitles',
    'render',
    'finalization',
    'completed'
);

-- CreateEnum
CREATE TYPE "GenerationJobType" AS ENUM (
    'planning',
    'script',
    'timeline',
    'video_submit',
    'video_poll',
    'media_ingest',
    'voice',
    'transcription',
    'subtitles',
    'render',
    'finalize'
);

-- CreateEnum
CREATE TYPE "GenerationJobStatus" AS ENUM (
    'queued',
    'claimed',
    'running',
    'waiting_provider',
    'retry_scheduled',
    'succeeded',
    'failed',
    'dead_letter',
    'cancelling',
    'cancelled'
);

-- CreateEnum
CREATE TYPE "ExecutionMode" AS ENUM ('mock', 'live', 'mixed', 'legacy');

-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM (
    'video',
    'audio',
    'subtitles',
    'image',
    'thumbnail',
    'other'
);

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM (
    'pending',
    'available',
    'failed',
    'deleted'
);

-- AlterTable
ALTER TABLE "Generation"
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" TYPE "GenerationStatus"
        USING ("status"::"GenerationStatus"),
    ALTER COLUMN "status" SET DEFAULT 'completed',
    ADD COLUMN "currentStage" "GenerationStage",
    ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN "idempotencyKey" TEXT,
    ADD COLUMN "inputJson" JSONB,
    ADD COLUMN "productionPackageJson" JSONB,
    ADD COLUMN "aiBrainVersionJson" JSONB,
    ADD COLUMN "promptVersionJson" JSONB,
    ADD COLUMN "decisionSummaryJson" JSONB,
    ADD COLUMN "qualitySummaryJson" JSONB,
    ADD COLUMN "revisionMetadataJson" JSONB,
    ADD COLUMN "providerConfigJson" JSONB,
    ADD COLUMN "mode" "ExecutionMode" NOT NULL DEFAULT 'legacy',
    ADD COLUMN "architectureVersion" TEXT NOT NULL DEFAULT 'backend-v1',
    ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "failureCode" TEXT,
    ADD COLUMN "cancelRequestedAt" TIMESTAMP(3),
    ADD COLUMN "startedAt" TIMESTAMP(3),
    ADD COLUMN "completedAt" TIMESTAMP(3),
    ADD COLUMN "failedAt" TIMESTAMP(3),
    ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Existing rows represent terminal generations created by the legacy synchronous flow.
UPDATE "Generation"
SET
    "currentStage" = 'completed',
    "startedAt" = "createdAt",
    "completedAt" = "updatedAt"
WHERE "status" = 'completed';

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "GenerationJobType" NOT NULL,
    "stageKey" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'queued',
    "dependsOnJobIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "provider" TEXT,
    "providerOperationId" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "inputJson" JSONB,
    "outputJson" JSONB,
    "mode" "ExecutionMode" NOT NULL DEFAULT 'legacy',
    "version" INTEGER NOT NULL DEFAULT 0,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generationId" TEXT,
    "projectId" TEXT,
    "jobId" TEXT,
    "type" "MediaAssetType" NOT NULL,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'pending',
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "authoritativeUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "byteSize" BIGINT,
    "durationMs" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" TEXT,
    "provider" TEXT,
    "mode" "ExecutionMode" NOT NULL DEFAULT 'legacy',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Generation_userId_idempotencyKey_key"
ON "Generation"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Generation_userId_createdAt_idx"
ON "Generation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Generation_projectId_createdAt_idx"
ON "Generation"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Generation_status_updatedAt_idx"
ON "Generation"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_idempotencyKey_key"
ON "GenerationJob"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_generationId_stageKey_revision_key"
ON "GenerationJob"("generationId", "stageKey", "revision");

-- CreateIndex
CREATE INDEX "GenerationJob_status_nextRetryAt_queuedAt_idx"
ON "GenerationJob"("status", "nextRetryAt", "queuedAt");

-- CreateIndex
CREATE INDEX "GenerationJob_generationId_createdAt_idx"
ON "GenerationJob"("generationId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_userId_createdAt_idx"
ON "GenerationJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_provider_providerOperationId_idx"
ON "GenerationJob"("provider", "providerOperationId");

-- CreateIndex
CREATE INDEX "GenerationJob_leaseExpiresAt_idx"
ON "GenerationJob"("leaseExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageProvider_storageKey_key"
ON "MediaAsset"("storageProvider", "storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_userId_createdAt_idx"
ON "MediaAsset"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_generationId_type_idx"
ON "MediaAsset"("generationId", "type");

-- CreateIndex
CREATE INDEX "MediaAsset_projectId_createdAt_idx"
ON "MediaAsset"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_jobId_idx"
ON "MediaAsset"("jobId");

-- CreateIndex
CREATE INDEX "MediaAsset_status_updatedAt_idx"
ON "MediaAsset"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "GenerationJob"
ADD CONSTRAINT "GenerationJob_generationId_fkey"
FOREIGN KEY ("generationId") REFERENCES "Generation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob"
ADD CONSTRAINT "GenerationJob_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_generationId_fkey"
FOREIGN KEY ("generationId") REFERENCES "Generation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
