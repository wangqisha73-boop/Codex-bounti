# Migration to Codex

## 1) Create a new repo (e.g., Codex/bounti) and push this bundle
```
git init && git add . && git commit -m "Bounti Codex handoff"
gh repo create Codex/bounti --private --source=. --remote=origin --push
# or add remote manually and push
```

## 2) Seed Codex chat with context
Copy the contents of `PROMPT_seed.md` into Codex as the **first message**. It includes:
- Project summary and constraints
- Current features & endpoints
- Pending TODOs
- A short **persona/instructions** for Codex to act as your dev copilot

## 3) Start services in Codex (or Codespaces)
- Ensure environment variables (.env) are set
- Run `npm run dev` to bring up APIs and workers

## 4) Next steps
- Replace naive keywording with **embeddings (pgvector)** for better suggestions
- Add OAuth (Google/email) to pass real `currentUserId` to APIs
- Add rate limits to `/ai/*` routes
- Deploy with Docker (Render/Fly/Railway) and Vercel for the front-end
