import type { ProductionBible } from "./movie-bible";

export type ProductionMemory = {
  universeId: string;
  createdAt: string;
  updatedAt: string;

  recurringCharacters: Array<{
    id: string;
    name: string;
    description: string;
    identityLock: string[];
  }>;

  recurringLocations: Array<{
    id: string;
    name: string;
    description: string;
  }>;

  visualIdentity: {
    preferredStyle: string;
    preferredPalette: string;
    cameraLanguage: string;
  };

  channelKnowledge: {
    niche: string;
    targetAudience: string;
    successfulPatterns: string[];
    avoidPatterns: string[];
  };
};

export function attachProductionMemory(
  bible: ProductionBible,
  memory?: Partial<ProductionMemory>
) {
  return {
    ...bible,
    productionMemory: {
      universeId: memory?.universeId ?? "default-universe",
      createdAt: memory?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recurringCharacters: memory?.recurringCharacters ?? [],
      recurringLocations: memory?.recurringLocations ?? [],
      visualIdentity: {
        preferredStyle:
          memory?.visualIdentity?.preferredStyle ??
          bible.visualLanguage.style,
        preferredPalette:
          memory?.visualIdentity?.preferredPalette ??
          bible.visualLanguage.colorPalette,
        cameraLanguage:
          memory?.visualIdentity?.cameraLanguage ??
          bible.visualLanguage.camera,
      },
      channelKnowledge: {
        niche: memory?.channelKnowledge?.niche ?? "",
        targetAudience:
          memory?.channelKnowledge?.targetAudience ??
          bible.creative.audience,
        successfulPatterns:
          memory?.channelKnowledge?.successfulPatterns ?? [],
        avoidPatterns:
          memory?.channelKnowledge?.avoidPatterns ?? [],
      },
    },
  };
}
