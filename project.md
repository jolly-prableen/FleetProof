# POD Desk: full project specification

Proof-of-delivery capture, AI check and billing for a full-truckload transporter.

- **Task:** Isocode take-home, Software Engineering Intern
- **Problem statement chosen:** Road transport fleet's proof-of-delivery capture and billing app
GitHub: https://github.com/jolly-prableen/FleetProof
- **Live app:** Not deployed or verified.

How to read this file: every requirement in the client's brief is listed here. **Implemented** means the feature is present in the repository; it does not imply a live deployment or end-to-end production verification. **Partially verified** means important implementation or tests exist, but the complete external or operational behavior has not been verified.

---

## 1. The client

Company A, Chhatrapati Sambhajinagar, Maharashtra. A full-truckload transporter for cement, steel and packaged goods firms.

- 140 own trucks and about 200 hired ones
- 210 staff
- Revenue ₹75 to ₹90 crore a year

## 2. The problem today

- Drivers bring the signed lorry receipt (LR), also called the proof of delivery (POD), back 10 to 20 days after the trip.
- Photos sent on WhatsApp get lost.
- Billing in Tally waits for the POD, because clients reject invoices without one.
- In the client's words: "I can't bill until a piece of paper comes back from 800 km away."

### The cost (the client's assumptions, checked)

| Item | Working | Result |
|---|---|---|
| Yearly freight | 2,200 trips a month × ₹32,000 × 12 | ₹84.48 crore |
| Working capital freed | ₹84.48 crore × 14 / 365 (POD-to-invoice from 18 days to 4) | ₹3.24 crore |
| Yearly interest on it | ₹3.24 crore × 12% | ₹38.9 lakh |
| Lost or disputed PODs | 1.5% of 26,400 trips = 396 trips × ₹16,000 (half the freight) | ₹63.36 lakh |
| **Total yearly cost** | ₹38.9 lakh + ₹63.36 lakh | **about ₹1.02 crore** |

## 3. What the client asked for

"I want the driver to take a photo at the consignee's gate and be done. The system should check the photo while the driver is still there."

## 4. Users

| Role | Device | Needs |
|---|---|---|
| **Driver** | Basic phone, low literacy | One big button, icons, voice prompts in Hindi or Marathi, no typing, no forms |
| **Hired driver** | Basic phone, will not install an app | A link by SMS, nothing to install or sign into |
| **Billing executive** | Laptop or tablet | Review doubtful PODs, create invoices, export to Tally |
| **Operations head** | Laptop | Dashboard of missing PODs and POD-to-invoice days by branch |
| **Managing Director** | Signs the deal | Sees the success numbers in section 5 |

The two signed-in roles in the app are **driver** and **billing executive**. The operations head uses the billing executive's dashboard.

## 5. Success measures (from the brief)

| Measure | Today | Target |
|---|---|---|
| PODs in the system within 24 hours of delivery | not tracked | 80% |
| POD-to-invoice time | 18 days | 4 days |
| Lost or disputed PODs | 1.5% | 0.5% |

Budget and time in the brief: ₹7.5 lakh, 6 weeks.

---

## 6. Scope: the "Must have" list

| # | Requirement from the brief | Status |
|---|---|---|
| 1 | Driver app with one big button to photograph the POD, stamped with GPS and time | **Implemented** |
| 2 | Hired-driver upload link; SMS delivery is mocked and the link is displayed | **Implemented** |
| 3 | AI POD check of LR number, consignee stamp, quantity, shortage or damage remarks, date and signature, asking for a retake if needed | **Implemented; partially verified with real providers** |
| 4 | Billing queue of verified trips by client and cycle, with Tally export and POD images attached to invoices | **Implemented; Tally not tested with a real installation** |
| 5 | Dashboard of trips without POD and POD-to-invoice days by branch | **Implemented** |
| 5b | Client link to view PODs | **Implemented** |
| 6 | Daily trip import with LR and e-way bill numbers | **Implemented** |

### The core build (what the brief says must work end to end)

About 6 to 8 screens: driver POD capture, AI check with retake prompt, review queue, billing queue with export, and missing-POD dashboard. Roles: driver and billing executive. AI: POD photo check. The hard part: offline capture with compressed upload. Mock payments, messages and outside systems. Seed from the sample data. Everything else in the Must have list is optional depth.

| Core build item | Status |
|---|---|
| Driver POD capture | **Implemented** |
| AI check with retake prompt | **Implemented; real operational AI not verified** |
| Review queue | **Implemented** |
| Billing queue with export | **Implemented; Tally not tested with a real installation** |
| Missing-POD dashboard | **Implemented** |
| Offline capture with compressed upload (under 300 KB) | **Implemented**. IndexedDB queues failed uploads, retries on reconnection, and the service worker caches the app shell. A capture page still needs to have been visited before it can be reopened offline; API operations require connectivity. |
| Seed from the sample data | **Implemented** |

### Out of scope (from the brief)

Live GPS tracking. Trip planning. Fuel and driver expense accounting. None of these are built.

---

## 7. Screens

| # | Screen | Route | Role | Status |
|---|---|---|---|---|
| 1 | Sign in | `/login` | Everyone | Implemented |
| 2 | Driver home: PODs to photograph | `/driver` | Driver | Implemented |
| 3 | Capture and result (green tick, red retake, amber review) | `/driver/capture/[tripId]` | Driver | Implemented |
| 4 | Hired-driver upload page, no login | `/u/[token]` | Hired driver | Implemented; SMS delivery mocked |
| 5 | Billing overview | `/billing` | Billing | Implemented |
| 6 | Review queue | `/billing/review` | Billing | Implemented |
| 7 | Review detail: photo beside editable fields | `/billing/review/[tripId]` | Billing | Implemented |
| 8 | Billing queue by client and cycle | `/billing/queue` | Billing | Implemented |
| 9 | Invoice: Tally and CSV downloads, POD images | `/billing/invoices/[id]` | Billing | Implemented; Tally not tested with a real installation |
| 10 | Missing-POD dashboard | `/billing/dashboard` | Billing | Implemented |
| 11 | Trip import | `/billing/import` | Billing | Implemented |
| 12 | Client POD view, no login | `/c/[token]` | Client | Implemented |

---

## 8. How a POD moves through the system

```
Driver photographs the POD at the consignee's gate
        |
Compress to under 300 KB, stamp GPS and time on the phone
        |
   Signal?  --no-->  Save on the phone (IndexedDB), send when signal returns
        | yes
Upload  -->  AI reads the photo  -->  Decision rules
                                          |
        +---------------------+-----------+----------------+
        |                     |                            |
   VERIFIED             RETAKE_REQUESTED              NEEDS_REVIEW
 (ready to bill)     (driver asked again,           (billing executive
                      two retakes at most)           checks the photo)
                                                           |
                                                  Approve --> VERIFIED
                                                  Reject  --> driver retakes

VERIFIED trips --> Billing queue (by client and cycle) --> Invoice --> Tally XML or CSV
```

Invoices are **never sent automatically**. A billing executive creates each invoice and clicks Download.

### POD status values

`PENDING` (waiting for a photo), `VERIFIED`, `RETAKE_REQUESTED`, `NEEDS_REVIEW`, `REJECTED` (billing asked for a new photo).

---

## 9. Feature details

### 9.1 Driver app and offline capture (Implemented)

- One big camera button per trip. The phone's camera opens directly.
- The photo is stamped with the **time** on the phone at capture, and the **GPS** position when the phone allows it. A missing GPS fix never blocks the upload.
- Compression runs on the phone, trying larger sizes first, and stops at the first JPEG **under 300 KB**.
- Voice prompts in **Hindi** and **Marathi** (browser speech), with the same text always on screen. English is the fallback.
- No typing and no forms on the driver's screens.
- Results use colour and icons: green tick for verified, red arrow for retake, amber for "the office will check".
- **Offline:** if the upload fails for network reasons, the photo is saved on the phone and sent when the signal returns. Every upload carries a unique ID, so a retry never creates a duplicate.
- The service worker caches the driver shell, manifest and icon so the app can reopen inside a dead zone. The manifest and icon support Add to Home Screen.

### 9.2 SMS upload link for hired drivers (Implemented; SMS mocked)

Hired drivers will not install an app or remember a password.

- Each hired trip has a one-use upload token that expires after seven days. The billing executive clicks **Send upload link** on the trip. The SMS is **mocked**: the link is shown on screen.
- The link opens `/u/[token]`, with no sign-in. The page shows two large language buttons (हिंदी, मराठी), because it cannot know the driver's language. Then it runs the same capture flow.
- The token is tied to **one trip**, expires after a set time, and can only upload for that trip. It cannot read anything.
- The upload endpoint for tokens applies the same checks and the same AI rules as the signed-in one.

### 9.3 Daily trip import (Implemented)

- Billing executive uploads a CSV at `/billing/import`.
- Columns: Trip ID, Client, Vehicle, Hired (yes or no), Branch, To, Freight, LR number, E-way bill number, Consignee name, Consignee phone.
- Every row is validated (formats, positive freight, E-way bill is 12 digits). Rows that fail are listed with the reason. Rows that pass are saved.
- A Trip ID that already exists is skipped, so importing the same file twice is safe.
- Each trip keeps its **LR number and e-way bill**, as the brief requires.

### 9.4 Client link to view PODs (Implemented)

- A billing executive creates a read-only link for one invoice.
- The client opens `/c/[token]` with no sign-in and sees only that invoice's trips and POD images.
- The link expires and can be switched off.
- Consignee phone numbers are never shown on it.

### 9.5 Review queue (Implemented)

- Lists PODs the AI could not clear, **oldest first**, with the reason as a chip.
- The detail screen shows the photo next to the fields the AI read: LR number, quantity, date, remarks, stamp present, signature present.
- The executive corrects anything that does not match the photo. **The image stays the source of truth.**
- **Approve** makes the trip ready to bill. **Reject** needs a short note and puts the trip back on the driver's list.
- Every correction is saved with the AI's original value next to it, as an audit trail, and with who made it.
- Only an open review can be decided, so two executives cannot overwrite each other.

### 9.6 Billing queue and export (Implemented; Tally not tested with a real installation)

- Verified trips that are not yet invoiced, grouped by **client and cycle**. A cycle is an ISO week such as `2026-W45` (assumption A6).
- **Create invoice** groups one client's trips for one cycle. Two people clicking at once cannot invoice the same trip twice.
- **Tally XML:** one Sales voucher per invoice. The client ledger is debited once. Freight income is credited once per trip. The narration lists each trip's ID, LR number, e-way bill and POD link.
- **CSV:** one row per trip.
- **POD images on the invoice:** the invoice page shows the photo of every trip.
- Export is refused if any trip on the invoice has no POD.

### 9.7 Missing-POD dashboard (Implemented)

- Trips without a usable POD, with the days each has been waiting. Red from 10 days, amber from 5.
- By branch: number without POD, oldest wait, and average POD-to-invoice days against the 4-day target.
- Tap a branch to filter the list.
- Verified freight not yet invoiced.

---

## 10. The AI check

A vision model reads each photo and returns a small JSON object:

| Field | Meaning |
|---|---|
| `readable` | false if the photo is too blurry, dark or cropped |
| `lr` | the LR number it can read |
| `stamp` | a consignee stamp is clearly visible |
| `signature` | a receiver's signature is visible |
| `qty` | quantity received, as written |
| `remarks` | any note about shortage, damage or leakage |
| `date` | delivery date |
| `confidence` | 0 to 1, how sure it is about all of the above |

A plain function then decides what happens. It makes no network calls and is fully tested.

| Situation | Result |
|---|---|
| Photo unreadable, LR missing or different from the trip's LR, stamp missing, or signature missing, and the driver still has retakes | **Retake** |
| Same problems after two retakes | **Review** |
| Shortage or damage remark (English, Hindi or Marathi) | **Review** |
| Confidence below 0.75 | **Review** |
| Everything present, confident, no remarks | **Verified** |
| AI provider fails or returns something unusable | **Review**. The driver is never blamed. |

**Retakes are capped at two.** A driver can send up to three photos in all. After that the POD goes to a person.

**When the AI is wrong:** the image stays the source of truth. Any POD with a shortage or damage remark, or low confidence, goes to a billing executive, who can correct fields. Invoices are never sent automatically.

**Safety against hostile photos:** text inside a photo is treated as data and never as instructions. Replies are validated against a strict schema, and long text is clipped.

**Providers:** `AI_PROVIDER=mock` (deterministic and conservative), `AI_PROVIDER=anthropic` with `ANTHROPIC_API_KEY`, or `AI_PROVIDER=gemini` with the server-only `GEMINI_API_KEY`. Mock AI does not inspect arbitrary photographs and routes them to manual review; controlled fixtures are for tests only. Anthropic and Gemini responses are validated before decision rules run. Provider failures or unusable responses route to manual review and never silently fall back to mock. Real providers have not been validated against operational POD documents.

---

## 11. Constraints from the brief, and how each is met

| Constraint | How |
|---|---|
| Each trip links to its e-way bill | `ewayBill` on every trip, shown on review and invoice screens, written into the Tally narration and CSV |
| Drivers need icons and Hindi or Marathi voice prompts, not typing | Icons, large buttons, browser speech in `hi-IN` and `mr-IN`, no forms on driver screens |
| Highways have dead zones, so capture works offline | IndexedDB queue, retry on reconnection, image compression, and service-worker app-shell caching are implemented. A capture page must have been visited before it can be reopened offline; API operations require connectivity. |
| Images compressed under 300 KB | Compression on the phone. The server also rejects anything larger. |
| Consignee names and phones are personal data (DPDP Act 2023) | Phones are masked on screen. Photos are served only to authorized signed-in users or a valid invoice client link. Client links never show phones. |

## 12. Design

The client values minimal design: clean layouts, white space, a restrained palette, clear type, and nothing on screen that lacks a purpose.

- **One typeface:** Mukta, which covers Latin and Devanagari in one family, so Hindi and Marathi text matches English.
- **Palette:** white, ink, one grey scale and one brand teal. Three status colours that each carry meaning: green is verified, red is retake, amber is a person is looking.
- **Driver screens:** one action per screen, very large touch targets, icon and voice first.
- **Billing screens:** plain lists and tables with clear empty states.
- **Quality floor:** visible keyboard focus, reduced-motion respected, layouts that work at phone width.

The phone-width pass keeps tables scrollable, long links and identifiers wrapped, and primary actions reachable on small screens. Every billing page now has a loading state.

---

## 13. Architecture and tech stack

```
Phone / laptop browser
   |  Next.js pages (React 19, Tailwind)
   v
Next.js route handlers (API)  -->  AI provider (mock, Anthropic, or Gemini)
   |
   v
PostgreSQL via Prisma  (Neon in production)
```

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 15 App Router, TypeScript | One repository for pages and API, easy to deploy |
| Styling | Tailwind CSS | Fast, consistent design tokens |
| Database | PostgreSQL with Prisma | Real relational data for trips, PODs and invoices |
| Sign-in | next-auth credentials, JWT session, bcrypt | Simple, role-aware |
| Validation | zod | Every API input |
| Offline | IndexedDB (`idb`) and canvas compression | The brief's "hard part" |
| Tests | Vitest | Fast tests of the key logic |

## 14. Data model

- **User:** name, email, password hash, role (`DRIVER` or `BILLING`), branch, language (`hi` or `mr`).
- **Trip:** client, cycle, vehicle, hired or own, branch, destination, freight, LR number, e-way bill, consignee name and phone, delivered time, POD status, remarks, retake count, optional upload token, driver, invoice.
- **Pod:** compressed image (stored in the database), mime type, size, GPS, capture time, upload time, AI result, confidence, reasons, outcome, correction and who made it, and a unique device `clientId` for safe retries.
- **Invoice:** number (`INV-0001`), client, cycle, created time, exported time, its trips.
- **Planned additions:** a record of "SMS sent".

## 15. API

| Endpoint | Purpose | Status |
|---|---|---|
| `POST /api/pods` | Driver upload: validate, AI check, rules, save | Implemented |
| `GET /api/pods/[id]/image` | POD image. Billing sees all. A driver sees only their own. | Implemented |
| `PATCH /api/trips/[id]/review` | Approve or reject, with field corrections | Implemented |
| `POST /api/invoices` | Create an invoice from one client's cycle | Implemented |
| `GET /api/invoices/[id]/export?format=tally\|csv` | Download the invoice file | Implemented; Tally not tested with a real installation |
| `POST /api/pods/token` | Hired-driver upload with a token | Implemented |
| `POST /api/trips/[id]/upload-token` | Billing creates a seven-day hired-driver upload link | Implemented |
| `POST /api/trips/import` | CSV trip import | Implemented |
| `POST /api/invoices/[id]/share` | Create the client link | Implemented |
| `POST /api/invoices/[id]/share/revoke` | Revoke the client link | Implemented |

## 16. Security and privacy

- No secrets in the repository. `.env` is ignored, and `.env.example` holds names only.
- Every API input is validated with zod. Uploads must be a JPEG under 300 KB with a believable capture time.
- Access control on every route: a driver reaches only their own trips and photos. Only billing can review, invoice and export.
- Passwords are bcrypt hashes. Sessions last 12 hours.
- Consignee phone numbers are masked on screen.
- Exports refuse trips without a POD. CSV cells starting with `=`, `+`, `-` or `@` are escaped against spreadsheet formula injection.
- Retried uploads are idempotent.
- Token links expire after seven days and are bound to one hired trip. Public hired uploads and client POD image requests are throttled per application instance; a shared production rate-limit store is still recommended for multi-instance deployments.

## 17. Sample data

The seed creates 3 users and 43 trips.

- **The three trips from the brief, exactly as given:**
  - TRP-66120, Company B (cement), MH20 EL 4521, Nagpur, ₹38,500, Verified
  - TRP-66134, Company C (steel), MH20 GT 7718, Pune, ₹26,000, Retake requested, "Stamp not visible"
  - TRP-66141, Company D (packaged foods), MH17 BY 3092 (hired), Indore, ₹41,200, Needs review, "Short by 6 cartons"
- 40 more trips across three weeks, with a mix of statuses, own and hired vehicles, and several branches.
- Older verified trips are invoiced so the dashboard shows real POD-to-invoice days. Recent ones wait in the billing queue.
- Every checked trip has a sample POD document (drawn as an image), so every screen has something to show.

### Demo logins

Password for all: `demo1234`

| Email | Role | Notes |
|---|---|---|
| `driver@demo.test` | Driver | Marathi prompts |
| `driver2@demo.test` | Driver | Hindi prompts |
| `billing@demo.test` | Billing executive | Sees everything |

Demo accounts only. No real personal data is in the repository.

---

## 18. Assumptions (label each one in the TDD)

| # | Assumption |
|---|---|
| A1 | Photos are stored in the database (about 300 KB each) so the app deploys without file storage. |
| A2 | SMS is mocked. A hired driver's link is shown on screen, not sent. |
| A3 | Tally cannot take images through an XML import, so each voucher's narration carries a link to the POD, and the invoice page acts as the image pack. |
| A4 | GST, ledger names and company setup in Tally are out of scope. The XML is built from the common import format and has not been tested on a real Tally install. |
| A5 | The three sample trips are used as given. All other trips, clients (E and F), branches and consignee names are invented for realistic demo data. |
| A6 | A billing "cycle" is an ISO week such as `2026-W45`. The brief does not define cycles. |
| A7 | The mock AI is a demo stand-in. The real provider is wired in but has not been tried on real POD photos. |
| A8 | The confidence threshold of 0.75 is a starting value, to be tuned on real photos. |
| A9 | "Within 24 hours of delivery" is measured from the photo's capture time. Delivery time is not separately known. |
| A10 | A web app that installs to the home screen is a reasonable delivery of the "driver app" within the time given. A native app is not built. |

## 19. Known limits

- The offline queue can reopen cached pages after a signal drop, but a specific capture page must have been visited before it is available offline. API calls still require connectivity.
- Voice prompts need a Hindi or Marathi voice on the phone. The text is always on screen as well.
- The real AI provider and the Tally XML have not been tested against real documents or a real Tally.
- Tests cover the rules, AI reply parsing, export and dashboard maths, upload-client retry behavior, client-link access policy, and route-level invoice/review authorization and transaction behavior. Full disposable-database route runs are still planned.
- Not built: live GPS tracking, trip planning, and fuel or driver expenses (all out of scope in the brief).

---

## 20. Run it locally

```bash
cp .env.example .env     # on Windows: copy .env.example .env
npm install
npm run db:push
npm run db:seed
npm test
npm run dev              # http://localhost:3000
```

Environment variable names: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AI_PROVIDER`, `MOCK_AI_FIXTURE`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `TALLY_COMPANY`.

## 21. Tests

`npm test` covers 67 tests across the provider, upload, rules, export, dashboard, import, sharing, rate-limit, and selected authorization/transaction test files. Coverage includes:

- **Decision rules:** verified, retake, review, retake limit, Hindi remarks, low confidence.
- **AI reply parsing:** valid, fenced, garbage, wrong type, out-of-range confidence, over-long text.
- **Gemini provider:** structured response parsing, invalid JSON, missing fields, shortage/damage flags, API failures, and missing keys.
- **Mock provider and upload behavior:** conservative arbitrary-photo handling, controlled fixtures, provider failure, image-preserving review outcomes, and upload-versus-verification results.
- **Tally and CSV export:** totals, XML escaping, India-time dates, formula-injection guard.
- **Dashboard maths:** days waiting, branch counts, averages.

Full disposable-database route runs and a live Gemini request with an operational POD remain unverified.

---

## 22. Build plan

| Step | Content | Status |
|---|---|---|
| 1 | Scaffold, schema, seed, sign-in | Implemented |
| 2 | Driver capture, compression, AI check, retake, offline queue | Implemented |
| 3 | Review queue and review detail | Implemented |
| 4 | Billing queue, invoices, Tally and CSV export, dashboard | Implemented; Tally not tested with a real installation |
| 5 | Hired-driver upload-link page | Implemented; SMS delivery mocked |
| 6 | Service worker, home-screen install, loading states, phone-width check | Implemented; offline/API limitations remain as documented |
| 7 | Trip import, client link | Implemented |
| 8 | API tests, real-photo test of the AI provider | Partially verified (automated provider and selected route tests exist; live Gemini and full disposable-database runs remain unverified) |
| 9 | Deploy to Vercel and Neon, public GitHub repository | Partially complete (repository URL documented; live deployment not completed or verified) |
| 10 | TDD and `deployment.md`, then submit | Partially complete (`deployment.md` exists; final TDD and exact two-file ZIP remain) |

## 23. Submission checklist (from the task)

The upload is **one ZIP, up to 25 MB, with exactly two files**:

1. **Technical Design Document** (PDF or Word), with the GitHub URL at the top and the live link if deployed. It covers:
   - The architecture and why it was chosen
   - The data model, the main flows and how the AI part works
   - UI and design decisions: the key screens and why they look the way they do
   - What was cut, and what comes next
   - Every assumption, labelled
2. **`deployment.md`:**
   - How to run it locally, step by step
   - How it is deployed, and the environment variable names (never the values)
   - Demo login details for the reviewer

Rules to keep:

- Use only the information in the brief, and label every assumption.
- Keep the commit history. Commit after every step.
- No secrets and no real personal data in the repository.
- Keep the repository public until review is finished.
- Resubmitting is allowed until the deadline, **9 Nov 2026, 11:59 pm IST**.

Scoring: Quality of work 50%, Problem solving 30%, Communication 20%.
