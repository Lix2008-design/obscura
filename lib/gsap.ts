"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Registering is idempotent; keeping it here means every component imports the
// same configured instance.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Exposed in development only, so scroll behaviour can be instrumented from
// the console or a driver script. Stripped from production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).ScrollTrigger = ScrollTrigger;
  (window as unknown as Record<string, unknown>).gsap = gsap;
}

export { gsap, ScrollTrigger };
