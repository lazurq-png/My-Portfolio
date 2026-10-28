import { afterEach, describe, expect, test } from "vitest";
import { formatDate, toCalendarDate } from "../../lib/dates";

/**
 * The point of lib/dates is that a post's date does not depend on the time zone
 * of the machine running the build. So the zone-sensitive cases run under zones
 * on both sides of UTC, including one 14 hours ahead.
 */
const ORIGINAL_TZ = process.env.TZ;
const ZONES = ["UTC", "Europe/Stockholm", "America/Los_Angeles", "Pacific/Kiritimati"];

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe("toCalendarDate", () => {
  test("reads MM-DD-YYYY, the format every post uses, as UTC midnight", () => {
    expect(toCalendarDate("08-05-2026")).toEqual(new Date("2026-08-05T00:00:00Z"));
  });

  test("reads ISO YYYY-MM-DD as UTC midnight too", () => {
    expect(toCalendarDate("2026-08-05")).toEqual(new Date("2026-08-05T00:00:00Z"));
  });

  test("ignores surrounding whitespace", () => {
    expect(toCalendarDate(" 08-05-2026 ")).toEqual(new Date("2026-08-05T00:00:00Z"));
  });

  test("passes an impossible date through, so the schema rejects it", () => {
    // Date.UTC would silently roll 13-40-2026 over into 2027.
    expect(toCalendarDate("13-40-2026")).toBe("13-40-2026");
    expect(toCalendarDate("02-30-2026")).toBe("02-30-2026");
  });

  test("passes through what it does not recognise", () => {
    const date = new Date("2026-08-05T00:00:00Z");

    expect(toCalendarDate(date)).toBe(date);
    expect(toCalendarDate("August 5, 2026")).toBe("August 5, 2026");
    expect(toCalendarDate(undefined)).toBeUndefined();
  });
});

describe("formatDate", () => {
  test.each(ZONES)("prints the same calendar day in %s", (zone) => {
    process.env.TZ = zone;

    expect(formatDate(toCalendarDate("08-05-2026") as Date)).toBe("5 August 2026");
    expect(formatDate(toCalendarDate("2026-08-05") as Date)).toBe("5 August 2026");
  });

  test("prints a timestamp's UTC day", () => {
    // pushedAt from GitHub is an instant; the site shows the day it was in UTC.
    expect(formatDate(new Date("2026-09-01T23:30:00Z"))).toBe("1 September 2026");
  });
});
