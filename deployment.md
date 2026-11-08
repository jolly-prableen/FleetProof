# FleetProof deployment

Repository: <https://github.com/jolly-prableen/FleetProof>

No live deployment has been completed or verified. The instructions below describe the intended local and deployment setup; they are not evidence of a production deployment.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer, or a hosted PostgreSQL database such as Neon
- HTTPS for any deployed environment

The application uses Next.js, Prisma, PostgreSQL, and role-based NextAuth credentials. It supports a conservative mock AI provider and optional Anthropic or Gemini vision providers.

## Local setup

From the repository root:

```powershell
copy .env.example .env
npm install
docker compose up -d
npm run db:push
npm run db:seed
npm test
npx tsc --noEmit
npm run build
npm run dev
```

Open `http://localhost:3000`.

If Docker is unavailable, set `DATABASE_URL` to an accessible PostgreSQL database and skip `docker compose up -d`.

To recreate development data:

```powershell
npm run db:reset
```

`db:reset` deletes all data in the configured database. Never run it against a shared or production database.

## Environment variables

Set these variable names in `.env` locally or in the hosting provider. Do not commit their values:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `NEXTAUTH_URL` | Canonical application URL |
| `NEXTAUTH_SECRET` | Secret used to sign sessions |
| `AI_PROVIDER` | `mock`, `anthropic`, or `gemini` |
| `MOCK_AI_FIXTURE` | Optional controlled mock fixture for tests; leave empty for the conservative default |
| `ANTHROPIC_API_KEY` | Server-only Anthropic key when `AI_PROVIDER=anthropic` |
| `GEMINI_API_KEY` | Server-only Google Gemini key when `AI_PROVIDER=gemini` |
| `GEMINI_MODEL` | Optional Gemini model; the code defaults to `gemini-2.5-flash` |
| `TALLY_COMPANY` | Company name written into Tally XML exports |

The mock provider is deterministic and does not inspect arbitrary photographs. Real provider responses are validated before decision rules run. Provider failures or unusable responses route uploads to manual review and never silently fall back to mock.

Real Anthropic and Gemini responses have not been validated against real operational POD documents. The mock provider is the safe no-key option for local demonstrations.

## Deployment outline

The intended deployment is a Next.js host such as Vercel with PostgreSQL such as Neon:

1. Push the repository to the public GitHub repository above.
2. Import the repository into the hosting provider.
3. Configure the environment variable names listed above with deployment-specific values.
4. Set `NEXTAUTH_URL` to the deployed HTTPS URL.
5. Choose `AI_PROVIDER=mock` for a deterministic demonstration, or configure the selected real provider's server-only API key.
6. Build with `npm run build`.
7. Initialize the database with `npx prisma db push`.
8. Seed only a dedicated demonstration database with `npm run db:seed`.

This project currently uses Prisma `db push`; no reviewed Prisma migration history is included.

## Demo accounts

All demo accounts use password `demo1234`:

| Email | Role | Language |
|---|---|---|
| `driver@demo.test` | Driver | Marathi |
| `driver2@demo.test` | Driver | Hindi |
| `billing@demo.test` | Billing executive | Hindi |

These are demonstration accounts only.

## Implemented workflow notes

- Driver photos are compressed to under 300 KB before upload.
- GPS is captured when the device permits it; missing GPS does not block upload.
- Photos that fail because of network conditions are held in an IndexedDB queue and retried when connectivity returns.
- A service worker caches the application shell, manifest, and icon. A specific capture page must have been visited before it can be reopened offline, and API operations still require connectivity.
- Hired-driver SMS delivery is mocked: the billing user receives a displayed upload link rather than an actual SMS.
- Tally XML follows a common import shape but has not been tested with a real Tally installation.
- Invoices are never sent automatically. A billing user explicitly creates and downloads an invoice.
- Live GPS tracking, trip planning, fuel accounting, and driver-expense accounting are outside the selected brief scope.

## Smoke-test checklist

When a deployment is available, verify:

1. Driver and billing sign-in with the demo accounts.
2. Driver trip visibility and role restrictions.
3. JPEG upload, image preservation, AI result, retake, and manual-review paths.
4. Hired-driver link expiry and upload behavior.
5. Billing review, correction, approval, and rejection.
6. Invoice creation, CSV export, and Tally XML download.
7. Client share-link expiry and revocation.
8. Trip import validation and duplicate handling.
9. Invalid or unauthorized image and token requests.
