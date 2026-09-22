"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * Scrubbed enter and leave: text focuses in as it arrives and defocuses as it
 * goes, tied to scroll position rather than a one-shot trigger.
 *
 * Blur is the expensive part, so it is kept to a minimum:
 *   - 4px, not 12px
 *   - applied only across the entering and leaving arcs. In between the filter
 *     is removed outright rather than animated to blur(0px), which would still
 *     allocate a filter layer for the compositor on every frame it is on
 *     screen.
 *   - will-change is set while the element is inside its scroll range and
 *     cleared the moment it leaves, so idle sections promote nothing.
 *
 * Reduced motion gets the resting state with no transform and no filter.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  distance = 26,
  blur = 4,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  distance?: number;
  blur?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced) {
      gsap.set(el, { opacity: 1, y: 0, filter: "none", willChange: "auto" });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.5,
        onToggle: (self) => {
          el.style.willChange = self.isActive ? "opacity, transform" : "auto";
          if (!self.isActive) el.style.filter = "none";
        },
      },
    });

    tl.fromTo(
      el,
      { opacity: 0, y: distance, filter: `blur(${blur}px)` },
      { opacity: 1, y: 0, filter: "blur(0px)", ease: "power2.out", duration: 0.34 },
    )
      // Fully in view: drop the filter entirely, not merely to zero.
      .set(el, { filter: "none" })
      .to(el, { duration: 0.32 })
      .set(el, { filter: "blur(0px)" })
      .to(el, {
        opacity: 0,
        y: -distance,
        filter: `blur(${blur}px)`,
        ease: "power2.in",
        duration: 0.34,
      });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      el.style.willChange = "auto";
    };
  }, [reduced, distance, blur]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
