import { Reveal } from "@/components/Reveal";
import { framePath } from "@/lib/framePath";

/**
 * Stills pulled straight from the loaded sequence, so the gallery costs no
 * extra assets. Swapping in real photography means changing these four paths.
 */
// Angles chosen away from the edge-on part of the turn, where the lens reads
// as a sliver and makes a poor still.
const SHOTS = [
  { src: framePath(2), caption: "Head on", ratio: "aspect-[4/5]", span: "md:col-span-4 md:col-start-1" },
  { src: framePath(26), caption: "Quarter left", ratio: "aspect-[4/3]", span: "md:col-span-3 md:col-start-6 md:mt-28" },
  { src: framePath(154), caption: "Quarter right", ratio: "aspect-[16/10]", span: "md:col-span-5 md:col-start-3 md:mt-10" },
  { src: framePath(176), caption: "Closing", ratio: "aspect-[3/4]", span: "md:col-span-3 md:col-start-10 md:mt-4" },
];

export function Gallery() {
  return (
    <section id="gallery" className="relative z-10 px-6 py-32 md:px-12 md:py-48">
      <Reveal className="mb-20 md:mb-32">
        <p className="label">Gallery — Field</p>
      </Reveal>

      <div className="grid gap-16 md:grid-cols-12 md:gap-y-24">
        {SHOTS.map((shot, i) => (
          <Reveal key={shot.src} className={shot.span} distance={20}>
            <figure>
              <div
                className={`${shot.ratio} w-full overflow-hidden border border-hairline bg-ink-raised`}
              >
                <img
                  src={shot.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={1600}
                  height={900}
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="label mt-4 flex justify-between">
                <span>Fig. {String(i + 1).padStart(2, "0")}</span>
                <span>{shot.caption}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
