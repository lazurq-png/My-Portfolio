import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const POSTS_DIR = join(process.cwd(), "src", "content", "blog");

export interface PostFacts {
  /** File name without `.md`: the post's content id, before `sanitizeSlug`. */
  id: string;
  title: string;
  description: string;
  pubDate: Date;
  /** `pubDate` as the blog renders it, e.g. "5 August 2026". */
  displayDate: string;
}

/** One `key: value` line of frontmatter, unquoted. Posts only use flat string/date fields. */
function field(frontmatter: string, key: string): string {
  const line = frontmatter.split(/\r?\n/).find((l) => l.startsWith(`${key}:`));
  if (!line) throw new Error(`frontmatter has no "${key}"`);
  return line
    .slice(key.length + 1)
    .trim()
    .replace(/^"(.*)"$/, "$1")
    .replace(/^'(.*)'$/, "$1");
}

function read(file: string): PostFacts {
  const text = readFileSync(join(POSTS_DIR, file), "utf8");
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
  if (!frontmatter) throw new Error(`${file} has no frontmatter`);

  // Same coercion as the content schema's `z.coerce.date()`, and the same local-time
  // formatting as the pages, so both sides agree whatever the machine's time zone.
  const pubDate = new Date(field(frontmatter, "pubDate"));

  return {
    id: file.replace(/\.md$/, ""),
    title: field(frontmatter, "title"),
    description: field(frontmatter, "description"),
    pubDate,
    displayDate: pubDate.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

/**
 * The post the blog index lists last: the one with the earliest `pubDate`.
 * Read from the Markdown at test time, so editing a post cannot break a spec
 * that only means "some post".
 */
export function oldestPost(): PostFacts {
  const posts = readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map(read)
    .sort((a, b) => a.pubDate.valueOf() - b.pubDate.valueOf());

  const [oldest, next] = posts;
  if (!oldest) throw new Error("no posts found in src/content/blog");
  if (next && next.pubDate.valueOf() === oldest.pubDate.valueOf()) {
    // The index order of equal dates is not defined, so "the last card" would be ambiguous.
    throw new Error(`${oldest.id} and ${next.id} share the oldest pubDate`);
  }
  return oldest;
}
