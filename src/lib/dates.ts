/**
 * Calendar dates: one way to parse them and one way to print them.
 *
 * A post's `pubDate` is a day, not an instant, and has to render as the same day
 * whatever time zone the build runs in. Parsing and printing each used to be
 * left to the platform, which only agreed by accident:
 *
 * - `"08-05-2026"` (how every post is written) parses as *local* midnight, so it
 *   printed correctly only because it was also printed in local time.
 * - `2026-08-05` (ISO) is turned into a Date at *UTC* midnight by the YAML
 *   parser, so printed in local time it shows the previous day anywhere west of
 *   UTC.
 *
 * Normalising both to UTC midnight here, and printing in UTC, makes every
 * combination of format and build time zone agree.
 */

const MDY = /^(\d{2})-(\d{2})-(\d{4})$/;
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Turn a frontmatter date into a Date at UTC midnight of that calendar day.
 *
 * Meant as a `z.preprocess` step in front of `z.coerce.date()`: a value it does
 * not recognise is passed through untouched, so the schema still decides what is
 * valid. A Date is passed through too -- YAML already made a date-only value UTC
 * midnight.
 */
export function toCalendarDate(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const text = value.trim();
  const mdy = MDY.exec(text);
  const ymd = YMD.exec(text);
  if (!mdy && !ymd) return value;

  const [year, month, day] = mdy
    ? [Number(mdy[3]), Number(mdy[1]), Number(mdy[2])]
    : [Number(ymd![1]), Number(ymd![2]), Number(ymd![3])];

  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC rolls over (13-40-2026 becomes a day in 2027) instead of failing.
  // Return the raw string so z.coerce.date() produces an Invalid Date and the
  // build fails on the bad post rather than publishing a wrong date.
  const roundTrips =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return roundTrips ? date : value;
}

/** A date as the site prints it, e.g. "5 August 2026". Always read in UTC. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
