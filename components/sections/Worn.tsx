import fs from "node:fs";
import path from "node:path";

import { WornSequence } from "@/components/WornSequence";

/**
 * Renders only if public/worn holds a sequence, so dropping in real footage
 * turns it on and an empty folder leaves no trace in the page.
 */
function countWorn() {
  const dir = path.join(process.cwd(), "public", "worn");
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).length;
}

export function Worn() {
  const frameCount = countWorn();
  if (frameCount === 0) return null;

  return (
    <section id="worn" className="relative z-10 h-[260vh]">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <WornSequence frameCount={frameCount} sectionId="worn" />

        {/* Not wrapped in <Reveal>: its scrub reads the sticky child's box,
            which never moves, so the copy would fade out mid-section. The
            whole sticky block enters and leaves with the section instead. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 py-24 md:px-12 md:py-28">
          <p className="label">Worn — Off the face</p>
          <div className="max-w-md">
            <h2 className="display text-[9vw] md:text-[3.4vw]">
              You stop noticing them
            </h2>
            <p className="mt-6 text-base leading-relaxed text-bone-dim">
              Twenty-one grams sits below the threshold where your skin keeps
              reporting back. You take them off at dusk and realise you last
              thought about them at noon.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
