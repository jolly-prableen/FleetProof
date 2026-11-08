import { describe, expect, it } from "vitest";
import { isShareActive } from "./shareAccess";

describe("client share access", () => {
  const now = new Date("2026-11-03T00:00:00Z");
  it("allows an unexpired, non-revoked matching token", () => {
    expect(isShareActive("token", "token", new Date("2026-11-04T00:00:00Z"), null, now)).toBe(true);
  });
  it("rejects mismatched, expired, revoked, or missing expiry links", () => {
    expect(isShareActive("other", "token", new Date("2026-11-04T00:00:00Z"), null, now)).toBe(false);
    expect(isShareActive("token", "token", now, null, now)).toBe(false);
    expect(isShareActive("token", "token", new Date("2026-11-04T00:00:00Z"), now, now)).toBe(false);
    expect(isShareActive("token", "token", null, null, now)).toBe(false);
  });
});
