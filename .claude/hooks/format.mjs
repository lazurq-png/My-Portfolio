// PostToolUse hook for Edit|Write: format the file Claude just touched with the project's own
// Prettier, so a change never lands unformatted and `pnpm lint` doesn't fail on whitespace.
// Prettier's .prettierignore applies (--ignore-unknown skips files it has no parser for), so
// Markdown, YAML and the lockfile are left alone. Never blocks: a failure only prints a note.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

let input = "";
for await (const chunk of process.stdin) input += chunk;

const file = JSON.parse(input || "{}").tool_input?.file_path;
if (!file || !/\.(ts|mjs|js|json|astro|css)$/.test(file) || !existsSync(file)) process.exit(0);

try {
  execFileSync(
    process.execPath,
    ["node_modules/prettier/bin/prettier.cjs", "--write", "--ignore-unknown", file],
    { stdio: "ignore" },
  );
} catch {
  console.error(`format hook: prettier failed on ${file}`);
}
