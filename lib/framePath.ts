import { asset } from "@/lib/basePath";

/**
 * Where a frame lives, given its zero-based index. Deliberately free of
 * "use client" so server components (the gallery) can call it too.
 */
export const framePath = (i: number) =>
  asset(`/frames/frame-${String(i + 1).padStart(4, "0")}.webp`);
