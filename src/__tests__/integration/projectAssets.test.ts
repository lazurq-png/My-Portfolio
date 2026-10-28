import { describe, test, expect } from "vitest";
import { PROJECT_PICKS } from "../../content.config";
import { projectImage } from "../../lib/projectImages";

/**
 * Every curated project has a picture in src/assets/projects/.
 *
 * The pictures are self-hosted (ADR 0018), so a pick added to PROJECT_PICKS
 * without a file would ship a blank panel instead of an image -- and nothing
 * else would notice, because ProjectImage renders nothing for a missing file.
 * The file must be named exactly after the repo, case included.
 */
describe("project images", () => {
  test.each(PROJECT_PICKS.map((pick) => pick.repo))(
    "%s has an image in src/assets/projects",
    (repo) => {
      expect(projectImage(repo)).toBeDefined();
    },
  );
});
