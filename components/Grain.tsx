/**
 * Film grain, as a repeating pre-rendered tile.
 *
 * This was an SVG feTurbulence filter composited with mix-blend-mode:
 * soft-light. Both are expensive: the blend mode forces the whole page beneath
 * it into a single compositing group, and the filter has to be re-evaluated
 * whenever that group changes. A plain repeating background on its own layer
 * costs the compositor nothing per frame.
 */
import { asset } from "@/lib/basePath";

export function Grain() {
  return (
    <div
      aria-hidden="true"
      className="layer-fixed z-40"
      style={{
        backgroundImage: `url(${asset("/noise.png")})`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
        opacity: 0.06,
        willChange: "transform",
      }}
    />
  );
}
