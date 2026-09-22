"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { useFrames } from "@/lib/frames";

/**
 * Holds the page until every frame is decoded. Counts in whole percent so the
 * number never jitters, and lifts on a single clean wipe.
 */
export function Preloader() {
  const { progress, ready } = useFrames();
  const [gone, setGone] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bar.current) return;
    gsap.to(bar.current, { scaleX: progress, duration: 0.4, ease: "power2.out" });
  }, [progress]);

  useEffect(() => {
    if (!ready || !root.current) return;
    const tl = gsap.timeline({ onComplete: () => setGone(true) });
    tl.to(root.current.querySelectorAll("[data-fade]"), {
      opacity: 0,
      duration: 0.35,
      ease: "power2.in",
    }).to(root.current, {
      yPercent: -100,
      duration: 0.9,
      ease: "expo.inOut",
    });
    return () => {
      tl.kill();
    };
  }, [ready]);

  useEffect(() => {
    document.documentElement.style.overflow = gone ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [gone]);

  if (gone) return null;

  return (
    <div
      ref={root}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-ink px-6 py-8 md:px-12 md:py-10"
    >
      <div data-fade className="label">
        Obscura
      </div>

      <div data-fade className="flex items-end justify-between gap-6">
        <span className="display text-[18vw] leading-none md:text-[9vw]">
          {String(Math.round(progress * 100)).padStart(3, "0")}
        </span>
        <span className="label mb-2 hidden md:block">Loading sequence</span>
      </div>

      <div data-fade className="h-px w-full bg-hairline">
        <div ref={bar} className="h-px w-full origin-left scale-x-0 bg-accent" />
      </div>
    </div>
  );
}
