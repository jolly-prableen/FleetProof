# FleetProof

Proof-of-delivery capture, AI-assisted checking, and billing queue for a full-truckload transporter.

Repository: <https://github.com/jolly-prableen/FleetProof>

No live deployment has been completed or verified.

## Quick start

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

Open `http://localhost:3000`. `npm run db:reset` deletes all data in the configured database and is for development databases only.

Demo logins use password `demo1234`:

- `driver@demo.test` — Driver, Marathi prompts
- `driver2@demo.test` — Driver, Hindi prompts
- `billing@demo.test` — Billing executive

## AI providers

The supported providers are:

- `mock`: deterministic and conservative. It does not inspect arbitrary photographs; by default it routes uploads to manual review. Controlled fixtures are available for tests only.
- `anthropic`: sends the JPEG to Anthropic when `ANTHROPIC_API_KEY` is configured.
- `gemini`: sends the JPEG to Gemini when the server-only `GEMINI_API_KEY` is configured.

Provider responses are validated before the POD decision rules run. Provider failures or unusable responses route the POD to manual review and never silently fall back to the mock provider. Real provider behavior has not been validated against operational POD documents.

## Checks

The repository includes Vitest tests for decision rules, AI response parsing and provider failures, upload retry behavior, exports, dashboard calculations, CSV import validation, share access, rate limiting, and selected route authorization/transaction behavior.

The GitHub Actions workflow in [.github/workflows/ci.yml](https://github.com/jolly-prableen/FleetProof/blob/main/.github/workflows/ci.yml) runs `npm ci`, `npm test`, `npx tsc --noEmit`, and `npm run build`.
