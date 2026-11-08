import { afterEach, describe, expect, it } from "vitest";
import { clearRateLimits, rateLimit } from "./rateLimit";

afterEach(clearRateLimits);

describe("rateLimit", () => {
  it("allows up to the configured limit and returns a retry period after it", () => {
    expect(rateLimit("upload:ip", 2, 1_000).allowed).toBe(true);
    expect(rateLimit("upload:ip", 2, 1_001).allowed).toBe(true);
    const blocked = rateLimit("upload:ip", 2, 1_002);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("resets a bucket after its minute window", () => {
    expect(rateLimit("share:ip", 1, 1_000).allowed).toBe(true);
    expect(rateLimit("share:ip", 1, 62_000).allowed).toBe(true);
  });
});
