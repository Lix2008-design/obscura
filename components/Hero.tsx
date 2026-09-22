"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useFrames } from "@/lib/frames";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { asset } from "@/lib/basePath";

const LINES = ["Nothing", "Between You", "And The Light"];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const { ready } = useFrames();
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = root.current;
    if (!el || !ready) return;

    if (reduced) {
      gsap.set(el.querySelectorAll("[data-line], [data-meta]"), { y: 0, opacity: 1 });
      return;
    }

    const tl = gsap.timeline({ delay: 0.75 });

    tl.fromTo(
      el.querySelectorAll("[data-line]"),
      { yPercent: 115 },
      { yPercent: 0, duration: 1.15, ease: "expo.out", stagger: 0.09 },
    )
      .fromTo(
        el.querySelectorAll("[data-meta]"),
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", stagger: 0.08 },
        "-=0.7",
      )
      .fromTo(
        el.querySelector("[data-hero-img]"),
        { scale: 1.12 },
        { scale: 1, duration: 2.2, ease: "power2.out" },
        0,
      );

    return () => {
      tl.kill();
    };
  }, [ready, reduced]);

  return (
    <section id="hero" ref={root} className="relative h-[100svh] w-full overflow-hidden">
      <img
        data-hero-img
        src={asset("/hero.jpg")}
        alt=""
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Grounds the headline without a generic gradient wash. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_15%,transparent_25%,#08080a_88%)]" />

      <div className="relative flex h-full flex-col justify-end px-6 pb-10 md:px-12 md:pb-14">
        <h1 className="display text-[10.2vw] md:text-[9.2vw]">
          {LINES.map((line) => (
            <span key={line} className="line-mask">
              <span data-line className="block">
                {line}
              </span>
            </span>
          ))}
        </h1>

        <div className="mt-10 flex flex-col gap-5 border-t border-hairline pt-5 md:flex-row md:items-baseline md:justify-between">
          <p data-meta className="label opacity-0">
            Obscura RS-1 — Photochromic
          </p>
          <p data-meta className="label opacity-0">
            Titanium / 21g / Cat. 1–3
          </p>
          <p data-meta className="label opacity-0 !text-accent">
            Scroll
          </p>
        </div>
      </div>
    </section>
  );
}
