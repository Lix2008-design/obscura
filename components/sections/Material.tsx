import { Reveal } from "@/components/Reveal";

export function Material() {
  return (
    <section
      id="material"
      className="relative z-10 flex min-h-[100svh] items-center px-6 py-24 md:px-12"
    >
      <div className="grid w-full gap-14 md:grid-cols-12 md:gap-8">
        <Reveal className="md:col-span-7">
          <p className="label mb-8">Material — Origin</p>
          <h2 className="display text-[10vw] md:text-[4.6vw]">
            Made the slow way
          </h2>
          <div className="mt-8 max-w-xl space-y-6 text-base leading-relaxed text-bone-dim md:text-lg">
            <p>
              The shield starts as a single billet of optical polymer, cured for
              nine hours and cut on a lathe that removes four microns a pass.
              Anything faster leaves stress in the glass, and stress is what you
              see at the edge of your vision on a long descent.
            </p>
            <p>
              Temples are drawn from grade 5 titanium and annealed twice. They
              take a set to your head in about a week and hold it for years.
              Nothing is glued. Every part comes apart with one tool.
            </p>
            <p>
              Assembled in a room kept at nineteen degrees, by six people, at a
              rate of forty pairs a day.
            </p>
          </div>
        </Reveal>

        <Reveal className="md:col-span-4 md:col-start-9" distance={18}>
          <dl className="space-y-8">
            {[
              ["Origin", "Biel / Switzerland"],
              ["Cure time", "9 hours"],
              ["Tolerance", "±4 microns"],
              ["Output", "40 pairs / day"],
              ["Serviceable", "Fully, one tool"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="label mb-2">{k}</dt>
                <dd className="font-mono text-sm text-bone">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
