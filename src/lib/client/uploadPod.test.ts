import { afterEach, describe, expect, it, vi } from "vitest";
import { RejectedError, RetryableError, uploadPod } from "./uploadPod";

const item = {
  clientId: "client-id-1234",
  tripId: "TRP-66120",
  blob: new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }),
  lat: null,
  lng: null,
  capturedAt: "2026-11-03T00:00:00.000Z",
};

afterEach(() => vi.restoreAllMocks());

describe("POD upload client", () => {
  it("marks network failures and server failures as retryable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(uploadPod(item)).rejects.toBeInstanceOf(RetryableError);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("down", { status: 503 })));
    await expect(uploadPod(item)).rejects.toBeInstanceOf(RetryableError);
  });
  it("does not retry client-rejected uploads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Photo must be a JPEG" }), { status: 415 })));
    await expect(uploadPod(item)).rejects.toMatchObject({ constructor: RejectedError, message: "Photo must be a JPEG" });
  });
  it("returns the validated server result and uses token endpoint data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ uploaded: true, outcome: "NEEDS_REVIEW", reasons: ["AI_UNAVAILABLE"], retakesLeft: 2 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await uploadPod({ ...item, endpoint: "/api/pods/token", token: "secret-token" });
    expect(result.uploaded).toBe(true);
    expect(result.outcome).toBe("NEEDS_REVIEW");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pods/token");
    expect((fetchMock.mock.calls[0][1].body as FormData).get("token")).toBe("secret-token");
  });
});
