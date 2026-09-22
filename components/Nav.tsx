"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/useReducedMotion";

const LINKS = [
  { label: "Optics", href: "#features", phone: false },
  { label: "Spec", href: "#spec", phone: false },
  { label: "Material", href: "#material", phone: false },
  { label: "Reserve", href: "#cta", phone: true },
];

export function Nav() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const show = gsap.quickTo(el, "yPercent", { duration: 0.45, ease: "power3.out" });

    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        // Never hide at the very top, where the nav belongs to the hero.
        if (self.scroll() < 120) return show(0);
        show(self.direction === 1 ? -120 : 0);
      },
    });

    return () => st.kill();
  }, [reduced]);

  return (
    <nav
      ref={ref}
      // No mix-blend-difference: it promotes the nav into a compositing group
      // with everything beneath it. The page is near-black throughout, so a
      // solid off-white reads the same.
      className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 md:px-12 md:py-7"
    >
      <a href="#hero" className="label !text-bone !tracking-[0.3em]">
        Obscura
      </a>

      <ul className="flex items-center gap-5 md:gap-10">
        {LINKS.map((l) => (
          <li key={l.href} className={l.phone ? "" : "hidden md:block"}>
            <a
              href={l.href}
              className="label !text-bone transition-opacity hover:opacity-50"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
