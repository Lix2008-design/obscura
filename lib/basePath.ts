/**
 * GitHub Pages serves a project site from a subfolder
 * (lix2008-design.github.io/obscura), not the domain root. Next rewrites its
 * own links for that, but not raw <img> sources or paths we build in
 * JavaScript, so those go through asset() instead.
 *
 * Unset locally, so `npm run dev` still serves everything from "/".
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${BASE_PATH}${path}`;
