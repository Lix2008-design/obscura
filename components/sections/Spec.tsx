import { Reveal } from "@/components/Reveal";

const SPEC: [string, string][] = [
  ["Mass", "21 g"],
  ["Frame", "Grade 5 titanium"],
  ["Lens", "Single shield, 2.2 mm"],
  ["Tint range", "Category 1 – 3"],
  ["Transition", "0.4 s / 12 s return"],
  ["Base curve", "8.4"],
  ["Coating", "Iridium, hydrophobic"],
  ["Fit range", "58 – 74 mm IPD"],
];

export function Spec() {
  return (
    <section
      id="spec"
      className="relative z-10 flex min-h-[100svh] items-center px-6 py-24 md:px-12"
    >
      <Reveal className="ml-auto w-full max-w-xl">
        <p className="label mb-10">Specification — RS-1</p>
        <dl>
          {SPEC.map(([k, v]) => (
            <div
              key={k}
              className="flex items-baseline justify-between border-t border-hairline py-4"
            >
              <dt className="label !tracking-[0.18em]">{k}</dt>
              <dd className="pl-4 text-right font-mono text-[13px] text-bone md:text-sm">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="label mt-10 !text-accent">Measured at size M</p>
      </Reveal>
    </section>
  );
}
