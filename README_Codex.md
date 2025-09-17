# Bounti — Codex Handoff

This bundle contains the core code and docs so you can continue in **Codex** with the same context.

## What’s included
- Floating AI chatbot (Underlord-style) with global **BlacklistProvider**.
- Redis-backed **user blocking API** and client UIs.
- AI matching: extract **keywords**, **notify top 20 approved hunters** (ranked by bounty).
- AI learning: ingest **approved solutions** and **suggest** future answers.
- Feed/Search components that respect the blacklist.
- Workers (BullMQ) for notifications and ingestion.

## Run locally
```bash
npm i
docker run -p 6379:6379 -d --name redis redis:7
docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 -d --name pg postgres:16
# create DB and set DATABASE_URL in .env
cp .env.example .env
npm run dev
```

## Services
- `server/blocksApi.ts` — POST/DELETE/GET /blocks (+ `isBlocked()` helper)
- `server/ai/matching.ts` — `/ai/keywords`, `/ai/notify-hunters`, `/ai/ingest-solved`
- `server/ai/suggest.ts` — `/ai/suggest-solution`
- Workers: `worker/notifyHunters.ts`, `worker/ingestSolved.ts`

## Front-end
- `client/ai/UnderlordishBot.tsx` — chat UI, slash commands:
  - `/notify-hunters post:<POST_ID>`
  - `/suggest post:<POST_ID>` or `/suggest <free text>`
- Settings page: `client/settings/BlockedUsersPage.tsx`
- Feeds/Search with block menus.

See **MIGRATION.md** for instructions to seed Codex with context and prompts.
