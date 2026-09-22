import { Reveal } from "@/components/Reveal";

const FEATURES = [
  {
    index: "01",
    title: "Tint in four tenths of a second",
    body: "A photochromic stack bonded inside the lens, not sprayed on it. Cresting a ridge into full sun, the glass has already caught up with your eyes.",
  },
  {
    index: "02",
    title: "Twenty-one grams, forgotten",
    body: "Titanium temples, a single moulded shield, no metal hinge screws. Light enough that the only thing you feel after six hours is the wind.",
  },
  {
    index: "03",
    title: "One piece of glass",
    body: "No seam across the bridge, no frame cutting the lower field. The horizon stays whole from one temple to the other.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative z-10">
      {FEATURES.map((f) => (
        <div
          key={f.index}
          className="flex min-h-[100svh] items-center px-6 py-24 md:px-12"
        >
          <Reveal className="max-w-4xl">
            <p className="label mb-8">{f.index} — Optics</p>
            <h2 className="display text-[10vw] md:text-[5.4vw]">{f.title}</h2>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-bone-dim md:text-lg">
              {f.body}
            </p>
          </Reveal>
        </div>
      ))}
    </section>
  );
}
