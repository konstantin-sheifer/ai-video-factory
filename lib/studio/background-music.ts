export const DEFAULT_BACKGROUND_MUSIC_VOLUME = 0.25;

export function normalizeBackgroundMusicVolume(
  value: unknown,
  fallback = DEFAULT_BACKGROUND_MUSIC_VOLUME
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return clamp(fallback);
  }

  return clamp(value);
}

export function backgroundMusicPercentToVolume(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return normalizeBackgroundMusicVolume(numericValue / 100);
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}
