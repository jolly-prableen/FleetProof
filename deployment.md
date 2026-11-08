# POD Desk deployment

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer, or a hosted PostgreSQL database such as Neon
- A public HTTPS URL for production

The application uses Next.js, Prisma, PostgreSQL, and a conservative mock AI provider by default. Gemini is available for real POD vision inspection.

## Run locally

From the repository root:

```powershell
copy .env.example .env
npm install
docker compose up -d
npm run db:push
npm run db:seed
npm test
npm run dev
```

Open `http://localhost:3000`.

If Docker is not available, set `DATABASE_URL` in `.env` to an accessible PostgreSQL database and skip `docker compose up -d`.

To reset the local database and recreate the demo data:

```powershell
npm run db:reset
```

`db:reset` deletes existing data in the configured database. Use it only with a development database.

## Environment variables

Set these variables in `.env` locally or in the hosting provider:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `NEXTAUTH_URL` | Canonical application URL |
| `NEXTAUTH_SECRET` | Long random secret used to sign sessions |
| `AI_PROVIDER` | `mock`, `anthropic`, or `gemini` |
| `MOCK_AI_FIXTURE` | Optional controlled test fixture; leave empty for the safe manual-review default |
| `ANTHROPIC_API_KEY` | Anthropic API key when `AI_PROVIDER=anthropic`; leave empty for `mock` |
| `GEMINI_API_KEY` | Server-only Google Gemini API key when `AI_PROVIDER=gemini` |
| `GEMINI_MODEL` | Optional Gemini model name; defaults to `gemini-2.5-flash` |
| `TALLY_COMPANY` | Company name written into Tally XML exports |

Never commit `.env`, production secrets, database credentials, or API keys. The repository contains only the variable names in `.env.example`.

For a local secret, generate a random value with a password generator or:

```powershell
openssl rand -base64 32
```

## Deploy to Neon and Vercel

### 1. Create the production database

1. Create a PostgreSQL project in Neon.
2. Copy the pooled or direct connection string.
3. Keep the connection string private.

### 2. Deploy the application

1. Push the repository to a GitHub repository.
2. Import the repository into Vercel.
3. Set the production environment variables listed above.
4. Set `NEXTAUTH_URL` to the final HTTPS Vercel URL.
5. Use `AI_PROVIDER=mock` for a conservative no-key demonstration, or configure the server-only `GEMINI_API_KEY` before selecting `gemini`.
6. Deploy.

The build command is:

```text
npm run build
```

The build generates the Prisma client and builds the Next.js application.

Every push and pull request is also checked by `.github/workflows/ci.yml`. The CI job runs `npm ci`, `npm test`, `npx tsc --noEmit`, and `npm run build` with the mock AI provider and non-production placeholder values.

### 3. Initialize the production database

Run the schema command against the production `DATABASE_URL`:

```powershell
npx prisma db push
```

For a demo deployment, seed the database:

```powershell
npm run db:seed
```

Do not run `npm run db:reset` against production.

For a production system with ongoing schema evolution, replace `db push` with reviewed Prisma migrations before deploying.

## Demo accounts

All demo accounts use the password `demo1234`.

| Email | Role | Language |
|---|---|---|
| `driver@demo.test` | Driver | Marathi |
| `driver2@demo.test` | Driver | Hindi |
| `billing@demo.test` | Billing executive | Hindi |

These are demo accounts only. Change or remove them before using real operational data.

## Smoke test after deployment

1. Open the production URL and sign in as the billing user.
2. Open the billing dashboard, review queue, billing queue, and trip import page.
3. Create an invoice from a verified trip group and download the CSV and Tally XML.
4. Create a client link and open it in a private window.
5. Generate a hired-driver upload link and open it in a private window.
6. Sign in as a driver and verify that only that driver's trips are visible.
7. Upload a small JPEG POD and confirm the AI result appears.
8. Confirm the service worker is registered from the browser Application panel.
9. Check that invalid, expired, or revoked public links do not display data.

## Operational notes

- The mock provider is deterministic and does not read real documents.
- The mock provider never verifies arbitrary uploaded photos. It routes them to manual review; controlled fixtures are for tests only.
- Real Anthropic calls require `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`.
- Gemini sends the uploaded JPEG to Google for vision extraction when `AI_PROVIDER=gemini`. Its structured response is validated before decision rules run. Provider errors never fall back to mock and route the upload to manual review.
- Tally XML follows the documented common import shape but has not been tested against a real Tally installation.
- POD images are stored in PostgreSQL as compressed image bytes.
- Public client and hired-driver links are temporary and should be treated as sensitive.
- Public-link throttling is in-memory per application instance. For a multi-instance production deployment, add a shared rate-limit store such as Redis or an edge-provider rate limiter.
- Live GPS tracking, trip planning, fuel accounting, and driver-expense accounting are not part of this application.
