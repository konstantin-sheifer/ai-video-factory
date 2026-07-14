-- AlterTable
ALTER TABLE "Generation" ADD COLUMN     "scriptJson" JSONB,
ADD COLUMN     "settingsJson" JSONB,
ADD COLUMN     "subtitlesJson" JSONB,
ADD COLUMN     "timelineJson" JSONB;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "scriptJson" JSONB,
ADD COLUMN     "settingsJson" JSONB,
ADD COLUMN     "subtitlesJson" JSONB,
ADD COLUMN     "timelineJson" JSONB;
