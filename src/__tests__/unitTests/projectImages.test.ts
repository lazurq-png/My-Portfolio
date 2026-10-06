import { describe, test, expect } from "vitest";
import { findProjectImage } from "../../lib/projectImages";

const images = {
  "../assets/projects/Questionable-candy.png": { default: "candy" },
  "../assets/projects/Xenocats.jpg": { default: "cats" },
};

describe("findProjectImage", () => {
  test("matches the file named after the repo", () => {
    expect(findProjectImage("lazurq-png/Xenocats", images)).toBe("cats");
  });

  test("is case-sensitive, as the Linux build on Cloudflare is", () => {
    expect(findProjectImage("lazurq-png/Questionable-candy", images)).toBe(
      "candy",
    );
    expect(findProjectImage("lazurq-png/xenocats", images)).toBeUndefined();
  });

  test("returns undefined for a repo with no image", () => {
    expect(findProjectImage("lazurq-png/My-Portfolio", images)).toBeUndefined();
  });

  test("does not match on a prefix", () => {
    expect(findProjectImage("lazurq-png/Xeno", images)).toBeUndefined();
  });
});
