import { Reveal } from "@/components/Reveal";

export function Cta() {
  return (
    <section
      id="cta"
      className="relative z-10 flex min-h-[100svh] flex-col justify-center px-6 py-24 md:px-12"
    >
      <Reveal>
        <p className="label mb-10">Reserve — First run</p>
        <h2 className="display text-[13vw] md:text-[7.5vw]">
          Four hundred pairs
        </h2>
        <a
          href="#signup"
          className="group mt-14 inline-flex items-baseline gap-5 border-b border-bone pb-3 transition-colors hover:border-accent"
        >
          <span className="display text-[7vw] md:text-[2.6vw]">Join the list</span>
          <span className="label transition-colors group-hover:!text-accent">
            &rarr;
          </span>
        </a>
      </Reveal>
    </section>
  );
}
