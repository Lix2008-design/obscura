"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useFrames } from "@/lib/frames";
import { canvasDpr, fitScale, FRAME_H, FRAME_W } from "@/lib/frameGeometry";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Sections where the product steps back, and how far. */
const DIM_OVER: [string, number][] = [
  ["#spec", 0.3],
  ["#material", 0.3],
  ["#worn", 0],
  ["#gallery", 0.1],
];

/** Frame shown when motion is reduced — a three-quarter view. */
const STATIC_FRAME = 0.12;

export function FrameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { images, frameCount, ready } = useFrames();
  const reduced = useReducedMotion();

  // Scroll writes here, the ticker reads it. Nothing else crosses the boundary.
  const target = useRef(0);
  const fit = useRef({ dw: 0, dh: 0, dx: 0, dy: 0 });
  // True once the canvas has faded fully out, so the ticker can skip it.
  const hidden = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // ---- sizing ---------------------------------------------------------
    // Measured only on resize and cached. The draw loop never reads layout.
    const resize = () => {
      const dpr = canvasDpr();
      const cw = window.innerWidth;
      const ch = window.innerHeight;

      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Cover-fit the product's safe box rather than the whole frame: the
      // empty margins crop away, the product itself never does. Frames are
      // decoded smaller than source, so fit from the geometry, not the bitmap.
      const scale = fitScale(cw, ch);
      const dw = FRAME_W * scale;
      const dh = FRAME_H * scale;
      fit.current = { dw, dh, dx: (cw - dw) / 2, dy: (ch - dh) / 2 };
      paintedKey = ""; // force a repaint at the new size
    };

    // ---- painting -------------------------------------------------------
    // The crossfade costs a second full-frame draw, which is only worth paying
    // while the sequence is moving fast enough for the step between frames to
    // be visible. Slow or stationary, a single frame is drawn. The painted
    // state is compared as index + quantised blend, so an unchanged view never
    // repaints at all.
    const BLEND_ABOVE = 0.35; // frames of movement per tick
    const MIN_BLEND = 0.05;

    let prevTarget = target.current;
    let paintedKey = "";

    const paint = () => {
      if (hidden.current) return;

      const t = Math.min(frameCount - 1, Math.max(0, target.current));
      const speed = Math.abs(t - prevTarget);
      prevTarget = t;

      const i0 = Math.floor(t);
      const i1 = Math.min(frameCount - 1, i0 + 1);
      const f = t - i0;

      // Quantised so tiny sub-pixel drift does not force a redraw.
      const blend = speed > BLEND_ABOVE && f > MIN_BLEND && i1 !== i0 ? Math.round(f * 10) / 10 : 0;
      const key = `${blend > 0 ? i0 : Math.round(t)}:${blend}`;
      if (key === paintedKey) return;

      const base = images[blend > 0 ? i0 : Math.min(frameCount - 1, Math.round(t))];
      if (!base) return;

      const { dw, dh, dx, dy } = fit.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.drawImage(base, dx, dy, dw, dh);

      if (blend > 0) {
        const next = images[i1];
        if (next && next !== base) {
          ctx.globalAlpha = blend;
          ctx.drawImage(next, dx, dy, dw, dh);
          ctx.globalAlpha = 1;
        }
      }

      paintedKey = key;
    };

    resize();
    paint();

    window.addEventListener("resize", resize, { passive: true });
    // GSAP's ticker is the page's single rAF loop.
    gsap.ticker.add(paint);

    return () => {
      window.removeEventListener("resize", resize);
      gsap.ticker.remove(paint);
    };
  }, [images, frameCount, ready]);

  // ---- scroll binding ---------------------------------------------------
  useEffect(() => {
    if (!ready) return;

    if (reduced) {
      target.current = Math.floor(frameCount * STATIC_FRAME);
      return;
    }

    const proxy = { i: 0 };
    const tween = gsap.to(proxy, {
      i: frameCount - 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6, // slight smoothing so the rotation never snaps
      },
      onUpdate: () => {
        target.current = proxy.i;
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [ready, reduced, frameCount]);

  // Fades in once the hero has been scrolled past.
  useEffect(() => {
    if (!ready || reduced) return;
    const el = wrapRef.current;
    if (!el) return;

    const tween = gsap.fromTo(
      el,
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        ease: "none",
        scrollTrigger: {
          trigger: "#hero",
          start: "bottom 90%",
          end: "bottom 35%",
          scrub: true,
        },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [ready, reduced]);

  // Steps the product back while long-form text is on screen.
  //
  // These ranges overlap — one section's end sits past the next one's start —
  // so a trigger must never tween opacity on its own. Two independent tweens
  // on the same property race, and the one that happens to land last wins,
  // which left the canvas fully visible behind the worn sequence. Instead each
  // trigger only records whether it is active, and the strongest dim currently
  // asked for is what gets animated.
  useEffect(() => {
    if (!ready || reduced) return;
    const el = canvasRef.current;
    if (!el) return;

    const active = new Set<string>();
    const desired = () =>
      DIM_OVER.reduce((min, [sel, to]) => (active.has(sel) ? Math.min(min, to) : min), 1);

    const apply = () => {
      const next = desired();
      if (next > 0) hidden.current = false;
      gsap.to(el, {
        opacity: next,
        duration: 0.55,
        ease: "power2.out",
        overwrite: true,
        // Stop painting only once it is genuinely invisible, and only if
        // nothing has asked for it back in the meantime.
        onComplete: () => {
          hidden.current = desired() === 0;
        },
      });
    };

    const triggers = DIM_OVER.map(([sel]) =>
      ScrollTrigger.create({
        trigger: sel,
        start: "top 70%",
        end: "bottom 30%",
        onToggle: (self) => {
          if (self.isActive) active.add(sel);
          else active.delete(sel);
          apply();
        },
      }),
    );

    return () => triggers.forEach((t) => t.kill());
  }, [ready, reduced]);

  return (
    <div
      ref={wrapRef}
      className="layer-fixed z-0"
      style={{ opacity: reduced ? 1 : 0, visibility: reduced ? "visible" : "hidden" }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />
    </div>
  );
}
