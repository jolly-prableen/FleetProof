# POD Desk

Proof-of-delivery capture, AI check and billing queue for a full-truckload transporter.

## Quick start

```bash
cp .env.example .env          # then set NEXTAUTH_SECRET
docker compose up -d          # Postgres on :5432
npm install
npm run db:push && npm run db:seed
npm run dev                   # http://localhost:3000
npm test
```

Demo logins (password `demo1234`): `driver@demo.test`, `billing@demo.test`.

The default mock AI does not inspect arbitrary photographs and routes uploads to manual review. Controlled mock fixtures are available only for deterministic tests. Set `AI_PROVIDER=gemini` and provide the server-only `GEMINI_API_KEY` to enable real Gemini vision inspection; Gemini failures go to manual review and never fall back to mock.

## Checks

The GitHub Actions workflow in `.github/workflows/ci.yml` runs on every push and pull request. It installs the locked dependencies, runs the test suite, checks TypeScript, and builds the application with the mock AI provider.
