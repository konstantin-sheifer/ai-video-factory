import { PackageReferenceSchema, type PackageReference } from "./contract";

/** Both entry points pass only the server reference, never a rebuilt prompt. */
export function requireApprovedPackage(response: Response, data: {
  canGenerate?: unknown;
  generationBlocked?: unknown;
  productionPackage?: unknown;
  generationBlockReason?: string;
  error?: string;
}): PackageReference {
  if (!response.ok || data.canGenerate !== true || data.generationBlocked !== false) {
    throw new Error(data.generationBlockReason || data.error || "Production package was not approved.");
  }
  return PackageReferenceSchema.parse(data.productionPackage);
}

export async function generatePackageVideo(reference: PackageReference) {
  const response = await fetch("/api/video", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(PackageReferenceSchema.parse(reference)),
  });
  const data = await response.json();
  if (!response.ok || data.status !== "SUCCEEDED" || !data.videoUrl) {
    throw new Error(data.error || "Video generation failed.");
  }
  return data;
}
