import type { ImageMetadata } from "astro";

/**
 * Hand-made preview images for projects, by convention rather than config:
 * drop `src/assets/projects/<repo-name>.png` in and that project's dialog uses
 * it instead of GitHub's generated social card. No file, no change.
 *
 * Bundled through astro:assets, so they ship from the site's own origin as
 * optimised WebP -- no CSP change, no network call at build time.
 */
const IMAGES = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/projects/*.{png,jpg,jpeg,webp}",
  { eager: true },
);

/**
 * The image whose file name is exactly the repo's name -- case included, so
 * `Questionable-candy` needs `Questionable-candy.png`. Windows forgives a case
 * mismatch locally and the Linux build on Cloudflare does not; matching exactly
 * here makes the local build fail the same way the deployed one would.
 * Pure over `images` so it can be tested without the glob.
 */
export function findProjectImage<T>(
  nameWithOwner: string,
  images: Record<string, { default: T }>,
): T | undefined {
  const name = nameWithOwner.split("/").pop();
  if (!name) return undefined;

  for (const [path, mod] of Object.entries(images)) {
    const base = path.split("/").pop()?.replace(/\.[^.]+$/, "");
    if (base === name) return mod.default;
  }
  return undefined;
}

/** The local preview image for `owner/name`, if one was added. */
export function projectImage(nameWithOwner: string): ImageMetadata | undefined {
  return findProjectImage(nameWithOwner, IMAGES);
}
