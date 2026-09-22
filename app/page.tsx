import fs from "node:fs";
import path from "node:path";

import { FramesProvider } from "@/lib/frames";
import { SmoothScroll } from "@/lib/SmoothScroll";
import { FrameCanvas } from "@/components/FrameCanvas";
import { Preloader } from "@/components/Preloader";
import { Grain } from "@/components/Grain";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/sections/Features";
import { Spec } from "@/components/sections/Spec";
import { Material } from "@/components/sections/Material";
import { Worn } from "@/components/sections/Worn";
import { Gallery } from "@/components/sections/Gallery";
import { Cta } from "@/components/sections/Cta";
import { Footer } from "@/components/Footer";

/**
 * Counts the sequence on the server at build time. Drop a different number of
 * frames into public/frames and everything downstream follows — no constant to
 * keep in sync.
 */
function countFrames() {
  const dir = path.join(process.cwd(), "public", "frames");
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).length;
}

export default function Page() {
  const frameCount = countFrames();

  return (
    <FramesProvider frameCount={frameCount}>
      <SmoothScroll>
        <Preloader />
        <FrameCanvas />
        <Grain />
        <Nav />

        <main className="relative">
          <Hero />
          <Features />
          <Spec />
          <Material />
          <Worn />
          <Gallery />
          <Cta />
        </main>

        <Footer />
      </SmoothScroll>
    </FramesProvider>
  );
}
