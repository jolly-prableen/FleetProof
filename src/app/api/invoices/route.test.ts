import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.fn();
const db = {
  $transaction: vi.fn(),
};

vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db }));

const { POST } = await import("./route");

function request(body: unknown) {
  return new Request("http://localhost/api/invoices", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}

describe("POST /api/invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a session and billing role", async () => {
    getServerSession.mockResolvedValueOnce(null);
    expect((await POST(request({ client: "Company B", cycle: "2026-W45" }))).status).toBe(401);

    getServerSession.mockResolvedValueOnce({ user: { role: "DRIVER" } });
    expect((await POST(request({ client: "Company B", cycle: "2026-W45" }))).status).toBe(403);
  });

  it("rejects malformed client and cycle values", async () => {
    getServerSession.mockResolvedValue({ user: { role: "BILLING" } });
    const response = await POST(request({ client: "", cycle: "November" }));
    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("creates an invoice through the transaction boundary", async () => {
    getServerSession.mockResolvedValue({ user: { role: "BILLING" } });
    db.$transaction.mockImplementation(async (callback: (tx: object) => unknown) => callback({
      trip: {
        findMany: vi.fn().mockResolvedValue([{ id: "TRP-66120" }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      invoice: { create: vi.fn().mockResolvedValue({ id: "invoice-1" }) },
    }));

    const response = await POST(request({ client: "Company B", cycle: "2026-W45" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "invoice-1" });
  });

  it("returns conflict when the transaction detects a concurrent invoice", async () => {
    getServerSession.mockResolvedValue({ user: { role: "BILLING" } });
    db.$transaction.mockImplementation(async (callback: (tx: object) => unknown) => callback({
      trip: {
        findMany: vi.fn().mockResolvedValue([{ id: "TRP-66120" }]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      invoice: { create: vi.fn().mockResolvedValue({ id: "invoice-1" }) },
    }));

    const response = await POST(request({ client: "Company B", cycle: "2026-W45" }));
    expect(response.status).toBe(409);
  });
});
