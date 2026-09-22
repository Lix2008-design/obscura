"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { canvasDpr, decodeWidth, FRAME_H, FRAME_W } from "@/lib/frameGeometry";
import { asset } from "@/lib/basePath";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * A second scrubbed sequence, scoped to its own section. Unlike the product
 * canvas this one cover-fits: the head is centred, so cropping the sides keeps
 * it large on a phone instead of shrinking it into the middle of the screen.
 *
 * Frames load lazily, a viewport ahead of time, so they never compete with the
 * main preload for bandwidth.
 */
export function WornSequence({
  frameCount,
  sectionId,
}: {
  frameCount: number;
  sectionId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef<(ImageBitmap | HTMLImageElement | null)[]>(
    new Array(frameCount).fill(null),
  );
  const target = useRef(0);
  const painted = useRef(Number.NaN);
  const fit = useRef({ dw: 0, dh: 0, dx: 0, dy: 0 });
  // Only paint while the section is actually on screen.
  const onScreen = useRef(false);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  // ---- lazy load ---------------------------------------------------------
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || frameCount === 0) return;

    let cancelled = false;
    let started = false;

    const start = async () => {
      if (started) return;
      started = true;

      const dpr = canvasDpr();
      const width = decodeWidth(window.innerWidth, window.innerHeight, dpr);
      const height = Math.round((width / FRAME_W) * FRAME_H);
      const useBitmap = typeof createImageBitmap === "function";

      const load = async (i: number) => {
        const src = asset(`/worn/frame-${String(i + 1).padStart(4, "0")}.webp`);
        try {
          if (useBitmap) {
            const blob = await (await fetch(src)).blob();
            return await createImageBitmap(blob, {
              resizeWidth: width,
              resizeHeight: height,
              resizeQuality: "high",
            });
          }
        } catch {
          // fall through to the plain image path
        }
        return new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.src = src;
          img.decode().then(() => resolve(img)).catch(() => resolve(null));
        });
      };

      const queue = Array.from({ length: frameCount }, (_, i) => i);
      await Promise.all(
        Array.from({ length: 6 }, async () => {
          while (queue.length && !cancelled) {
            const i = queue.shift()!;
            images.current[i] = await load(i);
          }
        }),
      );
      if (!cancelled) setReady(true);
    };

    // Generous lead time so a fast scroll does not outrun the decode.
    const preload = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && start(),
      { rootMargin: "150% 0px" },
    );
    preload.observe(el);

    const visibility = new IntersectionObserver((entries) => {
      onScreen.current = entries.some((e) => e.isIntersecting);
    });
    visibility.observe(el);

    return () => {
      cancelled = true;
      preload.disconnect();
      visibility.disconnect();
    };
  }, [frameCount]);

  // ---- sizing and painting ----------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const dpr = canvasDpr();
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;

      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Cover: the head is centred, so cropping the sides is safe and keeps
      // it large on a narrow screen.
      const scale = Math.max(cw / FRAME_W, ch / FRAME_H);
      const dw = FRAME_W * scale;
      const dh = FRAME_H * scale;
      fit.current = { dw, dh, dx: (cw - dw) / 2, dy: (ch - dh) / 2 };
      painted.current = Number.NaN;
    };

    const paint = () => {
      if (!onScreen.current) return;
      const t = Math.min(frameCount - 1, Math.max(0, target.current));
      if (Math.abs(t - painted.current) < 0.004) return;

      const i0 = Math.floor(t);
      const a = images.current[i0];
      if (!a) return;

      const { dw, dh, dx, dy } = fit.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.drawImage(a, dx, dy, dw, dh);

      const b = images.current[Math.min(frameCount - 1, i0 + 1)];
      const f = t - i0;
      if (f > 0.01 && b && b !== a) {
        ctx.globalAlpha = f;
        ctx.drawImage(b, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }
      painted.current = t;
    };

    resize();
    paint();
    window.addEventListener("resize", resize, { passive: true });
    gsap.ticker.add(paint);

    return () => {
      window.removeEventListener("resize", resize);
      gsap.ticker.remove(paint);
    };
  }, [ready, frameCount]);

  // ---- scroll binding ----------------------------------------------------
  useEffect(() => {
    if (!ready) return;

    if (reduced) {
      // Show them already off the face, which is the point of the section.
      target.current = frameCount - 1;
      painted.current = Number.NaN;
      return;
    }

    const proxy = { i: 0 };
    const tween = gsap.to(proxy, {
      i: frameCount - 1,
      ease: "none",
      scrollTrigger: {
        trigger: `#${sectionId}`,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
      },
      onUpdate: () => {
        target.current = proxy.i;
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [ready, reduced, frameCount, sectionId]);

  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />;
}
