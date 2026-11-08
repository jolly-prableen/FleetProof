import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.fn();
const db = {
  trip: { findUnique: vi.fn(), update: vi.fn() },
  pod: { update: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db }));

const { PATCH } = await import("./route");

const fields = { lr: "LR-8800", qty: "As per LR", remarks: "", date: "2026-11-03", stamp: true, signature: true };
const context = { params: Promise.resolve({ id: "TRP-66141" }) };

function request(body: unknown) {
  return new Request("http://localhost/api/trips/TRP-66141/review", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}

describe("PATCH /api/trips/[id]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires billing access", async () => {
    getServerSession.mockResolvedValueOnce(null);
    expect((await PATCH(request({ action: "approve", fields }), context)).status).toBe(401);
    getServerSession.mockResolvedValueOnce({ user: { role: "DRIVER" } });
    expect((await PATCH(request({ action: "approve", fields }), context)).status).toBe(403);
  });

  it("requires a note when rejecting", async () => {
    getServerSession.mockResolvedValue({ user: { role: "BILLING" } });
    const response = await PATCH(request({ action: "reject", fields }), context);
    expect(response.status).toBe(400);
    expect(db.trip.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a review that was already decided", async () => {
    getServerSession.mockResolvedValue({ user: { id: "billing-1", role: "BILLING" } });
    db.trip.findUnique.mockResolvedValue({ id: "TRP-66141", podStatus: "VERIFIED", pods: [{ id: "pod-1", extracted: {} }] });
    const response = await PATCH(request({ action: "approve", fields }), context);
    expect(response.status).toBe(409);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("approves an open review and persists the transaction", async () => {
    getServerSession.mockResolvedValue({ user: { id: "billing-1", role: "BILLING" } });
    db.trip.findUnique.mockResolvedValue({ id: "TRP-66141", podStatus: "NEEDS_REVIEW", pods: [{ id: "pod-1", extracted: { lr: "LR-8800" } }] });
    db.$transaction.mockResolvedValue([]);

    const response = await PATCH(request({ action: "approve", fields }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: "VERIFIED" });
    expect(db.$transaction).toHaveBeenCalledOnce();
  });
});
