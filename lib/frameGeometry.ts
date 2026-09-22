/**
 * Shared frame geometry. The preloader and the canvas must agree on this, so it
 * lives in one server-safe module rather than being duplicated.
 */

/** Source frame dimensions, as produced by scripts/build-frames.mjs. */
export const FRAME_W = 1600;
export const FRAME_H = 900;

/**
 * The safe box inside a frame, in source pixels. The frame is scaled so this
 * box always fits: empty margin crops away, the product never does, and it
 * lands at the same fraction of the viewport on a phone as on a desktop.
 */
export const PRODUCT_W = 1900;
export const PRODUCT_H = 900;

/**
 * Backing-store scale. Source frames are 1600x900, so a 2x store on a retina
 * display asks the GPU to fill four times the pixels for detail that is not in
 * the source. Capped at 1, the drawn frame is ~1213 device px from a 1600px
 * source — still a downscale, so nothing is upscaled.
 */
export const canvasDpr = () => Math.min(window.devicePixelRatio || 1, 1);

export const fitScale = (cw: number, ch: number) =>
  Math.min(cw / PRODUCT_W, ch / PRODUCT_H);

/**
 * How wide each frame needs to be decoded for this viewport. Decoding 180
 * frames at full source size costs about a gigabyte of bitmap memory, which a
 * phone will not tolerate; a phone only ever displays them a few hundred
 * pixels wide, so we decode to roughly that and keep 15% headroom for a
 * resize. Never below 640 (a small window that is later maximised) and never
 * above the source.
 */
export const decodeWidth = (cw: number, ch: number, dpr: number) =>
  Math.min(
    FRAME_W,
    Math.max(640, Math.ceil(FRAME_W * fitScale(cw, ch) * dpr * 1.15)),
  );
