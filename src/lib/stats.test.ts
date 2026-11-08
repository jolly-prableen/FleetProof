import { describe, it, expect } from "vitest";
import { daysBetween, lagByBranch, mean, missingByBranch } from "./stats";

const now = new Date("2026-11-03T10:00:00Z");
const d = (s: string) => new Date(s);

describe("daysBetween", () => {
  it("counts whole days", () => expect(daysBetween(d("2026-10-24T10:00:00Z"), now)).toBe(10));
  it("never goes negative", () => expect(daysBetween(d("2026-11-10T00:00:00Z"), now)).toBe(0));
});

describe("mean", () => {
  it("returns null for nothing", () => expect(mean([])).toBeNull());
  it("rounds to one decimal", () => expect(mean([4, 5, 5])).toBe(4.7));
});

describe("missingByBranch", () => {
  it("counts per branch, tracks the oldest, and sorts worst first", () => {
    const r = missingByBranch(
      [
        { branch: "Pune", deliveredAt: d("2026-11-01T10:00:00Z") },
        { branch: "Nagpur", deliveredAt: d("2026-10-20T10:00:00Z") },
        { branch: "Nagpur", deliveredAt: d("2026-10-30T10:00:00Z") },
      ],
      now,
    );
    expect(r[0]).toEqual({ branch: "Nagpur", missing: 2, oldestDays: 14 });
    expect(r[1]).toEqual({ branch: "Pune", missing: 1, oldestDays: 2 });
  });
  it("treats a missing delivery date as zero days", () => {
    expect(missingByBranch([{ branch: "X", deliveredAt: null }], now)[0].oldestDays).toBe(0);
  });
});

describe("lagByBranch", () => {
  it("averages per branch", () => {
    expect(lagByBranch([{ branch: "A", lagDays: 4 }, { branch: "A", lagDays: 6 }, { branch: "B", lagDays: 10 }])).toEqual({ A: 5, B: 10 });
  });
});
