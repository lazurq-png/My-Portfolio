import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  // Build output and tool caches. The tsconfig.json `exclude` list names the same
  // directories for the same reason: nothing generated should be linted.
  globalIgnores([
    "dist/",
    ".astro/",
    "coverage/",
    "test-results/",
    "playwright-report/",
    "blob-report/",
    "learning-notes/",
    "src/content/blog/",
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,
  // `recommended` plus the a11y rules for Astro templates -- the one thing a
  // formatter-and-frontmatter-only tool cannot see. Needs eslint-plugin-jsx-a11y-x.
  astro.configs["flat/jsx-a11y-recommended"],

  {
    rules: {
      // `const { a, ...rest } = obj` is how a field is left out of a copy.
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
    },
  },
  {
    files: ["**/*.astro"],
    rules: {
      // `<ul role="list">` is deliberate: with `list-style: none` Safari and VoiceOver
      // stop announcing the element as a list unless the role is spelled out.
      "astro/jsx-a11y/no-redundant-roles": ["error", { ul: ["list"], ol: ["list"] }],
    },
  },

  // The files in public/ run in the browser, as plain same-origin scripts.
  { files: ["public/**/*.js"], languageOptions: { globals: globals.browser } },
  { files: ["**/*.mjs", "**/*.config.*"], languageOptions: { globals: globals.node } },
]);
