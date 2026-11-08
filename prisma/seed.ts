import { PrismaClient, PodStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Demo credentials (documented in deployment.md). Not real accounts.
const DEMO_PASSWORD = "demo1234";

const DAY = 86_400_000;
const now = new Date("2026-11-03T09:00:00+05:30").getTime();

// Small deterministic RNG so the seed is the same on every run.
let s = 42;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

const clients = ["Company B (cement)", "Company C (steel)", "Company D (packaged foods)", "Company E (cement)", "Company F (steel)"];
const places: [string, string][] = [
  ["Nagpur", "Chhatrapati Sambhajinagar"], ["Pune", "Chhatrapati Sambhajinagar"], ["Indore", "Nashik"],
  ["Mumbai", "Pune"], ["Hyderabad", "Nagpur"], ["Surat", "Nashik"], ["Raipur", "Nagpur"], ["Ahmedabad", "Nashik"],
];
const consignees = ["Sharma Traders", "Patil Constructions", "Verma Distributors", "Joshi Steel Depot", "Khan Logistics Hub"];
const states: PodStatus[] = ["PENDING", "PENDING", "PENDING", "VERIFIED", "VERIFIED", "VERIFIED", "NEEDS_REVIEW", "RETAKE_REQUESTED"];
const remarksFor: Partial<Record<PodStatus, string[]>> = {
  NEEDS_REVIEW: ["Short by 6 cartons", "3 bags damaged", "Low confidence on signature"],
  RETAKE_REQUESTED: ["Stamp not visible", "Photo blurred", "Signature missing"],
};

function cycleFor(ts: number) {
  // ISO week label, e.g. 2026-W45
  const d = new Date(ts);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / DAY + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}


/** Sample POD drawn as SVG so demo data has a viewable "photo" without binary files. */
function sampleSvg(opts: { lr: string; consignee: string; stamp: boolean; signature: boolean; remarks: string | null; qty: string }) {
  const stamp = opts.stamp
    ? `<g transform="rotate(-12 420 430)"><circle cx="420" cy="430" r="62" fill="none" stroke="#2B4C9B" stroke-width="4"/><text x="420" y="425" text-anchor="middle" font-size="16" font-family="Arial" fill="#2B4C9B">RECEIVED</text><text x="420" y="448" text-anchor="middle" font-size="13" font-family="Arial" fill="#2B4C9B">${opts.consignee}</text></g>`
    : "";
  const sig = opts.signature ? `<path d="M80 470 q30 -50 50 0 t50 -10 t60 10" fill="none" stroke="#222" stroke-width="3"/>` : "";
  const rem = opts.remarks ? `<text x="60" y="360" font-size="20" font-family="Comic Sans MS, cursive" fill="#1a3a8a">${opts.remarks}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 560"><rect width="600" height="560" fill="#FBFAF4"/><text x="40" y="60" font-size="26" font-family="Arial" font-weight="bold" fill="#222">LORRY RECEIPT / POD</text><text x="40" y="100" font-size="20" font-family="Arial" fill="#222">LR No: ${opts.lr}</text><text x="40" y="140" font-size="16" font-family="Arial" fill="#444">Consignee: ${opts.consignee}</text><line x1="40" y1="170" x2="560" y2="170" stroke="#999"/><text x="40" y="210" font-size="16" font-family="Arial" fill="#444">Qty received: ${opts.qty}</text><text x="40" y="250" font-size="16" font-family="Arial" fill="#444">Remarks:</text>${rem}<text x="60" y="520" font-size="13" font-family="Arial" fill="#777">Receiver signature</text>${sig}${stamp}</svg>`;
}

async function attachPods() {
  const trips = await db.trip.findMany({ where: { podStatus: { not: "PENDING" } } });
  for (const t of trips) {
    const shortage = !!t.remarks && /short|damag|broken/i.test(t.remarks);
    const stampOk = t.podStatus !== "RETAKE_REQUESTED" || t.remarks !== "Stamp not visible";
    const sigOk = !(t.podStatus === "RETAKE_REQUESTED" && t.remarks === "Signature missing");
    const ex = { readable: t.remarks !== "Photo blurred", lr: t.lrNumber, stamp: stampOk, signature: sigOk, qty: "As per LR", remarks: shortage ? t.remarks : null, date: (t.deliveredAt ?? new Date()).toISOString().slice(0, 10) };
    const reasons: string[] =
      t.podStatus === "VERIFIED" ? [] :
      t.podStatus === "RETAKE_REQUESTED" ? [!ex.readable ? "UNREADABLE" : !ex.stamp ? "STAMP_MISSING" : "SIGNATURE_MISSING"] :
      shortage ? ["SHORTAGE_OR_DAMAGE"] : ["LOW_CONFIDENCE"];
    const svg = Buffer.from(sampleSvg({ lr: t.lrNumber, consignee: t.consigneeName, stamp: ex.stamp, signature: ex.signature, remarks: ex.remarks, qty: "As per LR" }));
    await db.pod.create({
      data: {
        tripId: t.id, image: svg, mime: "image/svg+xml", sizeKb: Math.ceil(svg.length / 1024),
        lat: 19.87 + rnd() * 0.5, lng: 75.34 + rnd() * 0.5,
        capturedAt: t.deliveredAt ?? new Date(), extracted: ex,
        confidence: t.podStatus === "VERIFIED" ? 0.93 : shortage ? 0.9 : 0.62,
        reasons, outcome: t.podStatus,
      },
    });
  }
}

/** Invoice the older verified trips so POD-to-invoice days can be shown. Recent ones stay in the queue. */
async function backfillInvoices() {
  const old = await db.trip.findMany({ where: { podStatus: "VERIFIED", deliveredAt: { lt: new Date(now - 8 * DAY) } } });
  const groups = new Map<string, typeof old>();
  for (const t of old) {
    const k = `${t.client}|${t.clientCycle}`;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  for (const [k, ts] of groups) {
    const [client, cycle] = k.split("|");
    const lag = 4 + Math.floor(rnd() * 14);
    const last = Math.max(...ts.map((t) => t.deliveredAt!.getTime()));
    const createdAt = new Date(Math.min(now, last + lag * DAY));
    const inv = await db.invoice.create({ data: { client, cycle, createdAt, exportedAt: createdAt } });
    await db.trip.updateMany({ where: { id: { in: ts.map((t) => t.id) } }, data: { invoiceId: inv.id } });
  }
}

async function main() {
  await db.pod.deleteMany();
  await db.trip.deleteMany();
  await db.invoice.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const driver = await db.user.create({
    data: { name: "Ramesh Jadhav", email: "driver@demo.test", passwordHash, role: "DRIVER", branch: "Chhatrapati Sambhajinagar", language: "mr" },
  });
  const driver2 = await db.user.create({
    data: { name: "Suresh Yadav", email: "driver2@demo.test", passwordHash, role: "DRIVER", branch: "Nagpur", language: "hi" },
  });
  await db.user.create({
    data: { name: "Anita Deshmukh", email: "billing@demo.test", passwordHash, role: "BILLING", branch: "Chhatrapati Sambhajinagar", language: "hi" },
  });

  // The three trips from the brief, exactly as given.
  const fromBrief = [
    { id: "TRP-66120", client: "Company B (cement)", vehicle: "MH20 EL 4521", hired: false, destination: "Nagpur", freight: 38500, podStatus: "VERIFIED" as PodStatus, remarks: null, branch: "Chhatrapati Sambhajinagar" },
    { id: "TRP-66134", client: "Company C (steel)", vehicle: "MH20 GT 7718", hired: false, destination: "Pune", freight: 26000, podStatus: "RETAKE_REQUESTED" as PodStatus, remarks: "Stamp not visible", branch: "Chhatrapati Sambhajinagar" },
    { id: "TRP-66141", client: "Company D (packaged foods)", vehicle: "MH17 BY 3092 (hired)", hired: true, destination: "Indore", freight: 41200, podStatus: "NEEDS_REVIEW" as PodStatus, remarks: "Short by 6 cartons", branch: "Nashik" },
  ];
  let n = 0;
  for (const t of fromBrief) {
    const delivered = now - (2 + n) * DAY;
    await db.trip.create({
      data: {
        ...t,
        clientCycle: cycleFor(delivered),
        lrNumber: `LR-${8800 + n}`,
        ewayBill: `3910${String(20000000 + n * 7919).padStart(8, "0")}`,
        consigneeName: pick(consignees),
        consigneePhone: `98${String(10000000 + n * 12345).slice(0, 8)}`,
        deliveredAt: new Date(delivered),
        retakeCount: t.podStatus === "RETAKE_REQUESTED" ? 1 : 0,
        driverId: t.hired ? null : driver.id,
        uploadToken: t.hired ? "demo-hired-token-66141-9f7d2a4c6b8e1f03" : null,
        uploadTokenExpiresAt: t.hired ? new Date(now + 30 * DAY) : null,
      },
    });
    n++;
  }

  // About 40 more realistic trips spread over three weeks.
  for (let i = 0; i < 40; i++) {
    const [destination, branch] = pick(places);
    const status = pick(states);
    const hired = rnd() < 0.4;
    const delivered = now - Math.floor(rnd() * 21) * DAY - Math.floor(rnd() * 12) * 3_600_000;
    const own = !hired && (branch === "Chhatrapati Sambhajinagar" || branch === "Nagpur");
    await db.trip.create({
      data: {
        id: `TRP-${66142 + i}`,
        client: pick(clients),
        clientCycle: cycleFor(delivered),
        vehicle: hired ? `MH${pick(["17", "14", "12"])} ${pick(["AB", "BY", "CD"])} ${1000 + Math.floor(rnd() * 8999)} (hired)` : `MH20 ${pick(["EL", "GT", "FQ"])} ${1000 + Math.floor(rnd() * 8999)}`,
        hired,
        branch,
        destination,
        freight: 18000 + Math.floor(rnd() * 28) * 1000,
        lrNumber: `LR-${8810 + i}`,
        ewayBill: `3910${String(20100000 + i * 6173).padStart(8, "0")}`,
        consigneeName: pick(consignees),
        consigneePhone: `97${String(10000000 + i * 54321).slice(0, 8)}`,
        deliveredAt: new Date(delivered),
        podStatus: status,
        remarks: remarksFor[status] ? pick(remarksFor[status]!) : null,
        retakeCount: status === "RETAKE_REQUESTED" ? 1 : 0,
        driverId: own ? (branch === "Nagpur" ? driver2.id : driver.id) : null,
        uploadToken: hired ? `hired-token-${66142 + i}` : null,
      },
    });
  }

  await attachPods();
  await backfillInvoices();

  const count = await db.trip.count();
  console.log(`Seeded 3 users and ${count} trips. Demo password: ${DEMO_PASSWORD}`);
}

main().finally(() => db.$disconnect());
