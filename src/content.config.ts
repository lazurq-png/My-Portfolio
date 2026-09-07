import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { fetchRepo, repoUrl, toRepoMeta } from './lib/github';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});

interface ProjectPick {
	/** `owner/name`, exactly as it appears in the repository URL. */
	repo: string;
	title: string;
	summary: string;
	stack: string[];
}

/**
 * The projects the site shows, and the only part of a project written by hand.
 *
 * Curated rather than pulled from `GET /users/{user}/repos` on purpose: the
 * summary and the stack tags are framing, and GitHub's one-line description and
 * language stats are not a substitute for them. Everything GitHub *does* know
 * better -- stars, topics, when it was last touched -- is fetched below instead
 * of being copied here to go stale.
 */
const PROJECT_PICKS: ProjectPick[] = [
	{
		repo: 'lazurq-png/My-Portfolio',
		title: 'Portfolio Site',
		summary:
			'A polished Astro-based portfolio experience with a lightweight, modern presentation.',
		stack: ['Astro', 'TypeScript', 'CSS'],
	},
	{
		repo: 'lazurq-png/next.js-dashboard',
		title: 'Next.js Dashboard Template',
		summary:
			'Learning how to use Next.js to build interactive web applications.',
		stack: ['Next.js', 'React', 'TypeScript', 'PostgreSQL'],
	},
];

const projects = defineCollection({
	// An object loader rather than the shorter inline-async-function form: that
	// one has no access to `logger`, and a build-time network call that fails
	// silently is worse than one that says so in the build log.
	loader: {
		name: 'github-projects',
		load: async ({ store, logger, parseData }) => {
			// The store persists in `.astro/data-store.json` between runs, so
			// without this a project removed from PROJECT_PICKS would keep
			// rendering. PROJECT_PICKS is the authority on every run.
			store.clear();

			// Unauthenticated is 60 requests/hour per IP and Cloudflare's build
			// IPs are shared. Optional by design -- see fetchRepo.
			const token = process.env.GITHUB_TOKEN;

			for (const pick of PROJECT_PICKS) {
				const raw = await fetchRepo(pick.repo, { token }).catch(
					(error: unknown) => {
						logger.warn(
							`Could not reach GitHub for ${pick.repo}: ${String(error)}`,
						);
						return null;
					},
				);

				const meta = toRepoMeta(raw);

				// Deliberately fail soft. `build:deploy` is the production deploy
				// gate (see CLAUDE.md), so a GitHub outage or a rate limit must not
				// be able to block an unrelated deploy. Every GitHub-derived field
				// is optional in the schema below and the card renders without
				// them; the cost of a failure is this line in the build log.
				if (!meta) {
					logger.warn(
						`No GitHub metadata for ${pick.repo}; rendering curated fields only.`,
					);
				}

				const data = await parseData({
					id: pick.repo,
					data: { ...pick, link: repoUrl(pick.repo), ...(meta ?? {}) },
				});

				store.set({ id: pick.repo, data });
			}
		},
	},
	schema: z.object({
		// Curated: always present, because PROJECT_PICKS supplies them.
		repo: z.string(),
		title: z.string(),
		summary: z.string(),
		stack: z.array(z.string()),
		// Not .url(): that overload is deprecated in the bundled zod, and the
		// value is built by repoUrl() rather than typed by hand, so there is
		// nothing here for a URL check to catch.
		link: z.string(),

		// From GitHub: every one optional, which is what makes the loader's
		// fail-soft path render rather than throw.
		githubDescription: z.string().optional(),
		homepage: z.string().optional(),
		language: z.string().optional(),
		topics: z.array(z.string()).default([]),
		stars: z.number().optional(),
		forks: z.number().optional(),
		// Coerced here rather than in `toRepoMeta` so date parsing lives in the
		// schema, the same way `pubDate` does for the blog.
		pushedAt: z.coerce.date().optional(),
	}),
});

export const collections = { blog, projects };
