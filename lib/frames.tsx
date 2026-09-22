"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Frame = ImageBitmap | HTMLImageElement;

type FramesValue = {
  /** Decoded frames, sparse until loading finishes. */
  images: (Frame | null)[];
  frameCount: number;
  /** 0 to 1. */
  progress: number;
  ready: boolean;
};

const FramesContext = createContext<FramesValue | null>(null);

import { framePath } from "@/lib/framePath";
import { canvasDpr, decodeWidth, FRAME_H, FRAME_W } from "@/lib/frameGeometry";

/**
 * Decodes the whole sequence up front and reports progress. The first frame is
 * fetched on its own and resolved before the rest so the canvas has something
 * to paint immediately — nothing ever flashes empty.
 */
export function FramesProvider({
  frameCount,
  children,
}: {
  frameCount: number;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const images = useRef<(Frame | null)[]>(new Array(frameCount).fill(null));

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;

    // Decode straight to the size this viewport will actually paint.
    const dpr = canvasDpr();
    const width = decodeWidth(window.innerWidth, window.innerHeight, dpr);
    const height = Math.round((width / FRAME_W) * FRAME_H);

    // An ImageBitmap is pinned memory: it never hitches, but it also never
    // gets evicted. A phone paints these a few hundred pixels wide, so the
    // whole sequence fits comfortably and bitmaps are the better trade. A
    // desktop wants them near source size, where the sequence would run to
    // roughly a gigabyte — there we hand the frames to the browser as images
    // and let its own cache decide what to keep decoded.
    const BITMAP_BUDGET = 256e6;
    const useBitmap =
      typeof createImageBitmap === "function" &&
      frameCount * width * height * 4 <= BITMAP_BUDGET;

    const viaImage = (i: number) =>
      new Promise<Frame | null>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.src = framePath(i);
        img
          .decode()
          .then(() => resolve(img))
          .catch(() => resolve(null));
      });

    const viaBitmap = async (i: number) => {
      const res = await fetch(framePath(i));
      const blob = await res.blob();
      return createImageBitmap(blob, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "high",
      });
    };

    const load = async (i: number) => {
      let frame: Frame | null = null;
      try {
        frame = useBitmap ? await viaBitmap(i) : await viaImage(i);
      } catch {
        // One unreadable file must not wedge the preloader.
        frame = await viaImage(i);
      }
      if (cancelled) return;
      images.current[i] = frame;
      loaded += 1;
      setProgress(loaded / frameCount);
    };

    (async () => {
      await load(0);
      if (cancelled) return;
      // Small concurrency pool: fast on a good connection, and it does not
      // open 180 sockets at once on a bad one.
      const queue = Array.from({ length: frameCount - 1 }, (_, i) => i + 1);
      const workers = Array.from({ length: 8 }, async () => {
        while (queue.length && !cancelled) await load(queue.shift()!);
      });
      await Promise.all(workers);
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [frameCount]);

  const value = useMemo(
    () => ({ images: images.current, frameCount, progress, ready }),
    [frameCount, progress, ready],
  );

  return (
    <FramesContext.Provider value={value}>{children}</FramesContext.Provider>
  );
}

export function useFrames() {
  const ctx = useContext(FramesContext);
  if (!ctx) throw new Error("useFrames must be used inside <FramesProvider>");
  return ctx;
}
