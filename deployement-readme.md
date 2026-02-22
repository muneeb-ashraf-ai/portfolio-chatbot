# RAG CV — Deployment Guide

## Project Structure (Flat)

```
RAG_CV/
├── pages/                  ← Next.js pages + API route
│   ├── index.js            ← Chat UI
│   ├── _document.js
│   └── api/
│       └── chat.js         ← Serverless API (Groq + RAG)
├── public/
│   ├── vector_store.json   ← Pre-built embeddings (commit this!)
│   └── assets/             ← CV PDF, favicon, profile image
├── lib/
│   └── vectorSearch.js
├── data/                   ← CV source text files
│   ├── cv.txt
│   ├── about.txt
│   ├── bot.txt
│   └── journey.txt
├── scripts/
│   └── build_json_store.py ← Run locally to rebuild embeddings
├── package.json
├── next.config.js
├── vercel.json
├── requirements.txt        ← Python deps for build script
└── .env.local              ← Local secrets (never committed)
```

---

## First-Time Deploy on Vercel

### Step 1 — Set up Git and push to GitHub

```bash
cd C:\Users\Muneeb\Desktop\RAG_CV

git init                    # skip if already initialized
git add .
git commit -m "initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2 — Import to Vercel

1. Go to **https://vercel.com/new**
2. Click **Import Git Repository** → select your repo
3. **Root Directory** — leave it as `/` (deploy from root, no subdirectory needed)
4. Under **Environment Variables**, add:
   - `GROQ_API_KEY` → your Groq API key
5. Click **Deploy**

> Vercel reads `vercel.json` at the root automatically.
> No Python runs on Vercel — `vector_store.json` is a static pre-built file served from `public/`.

---

## Local Development

```bash
cd C:\Users\Muneeb\Desktop\RAG_CV

# Install Node dependencies
npm install

# Add your Groq API key to .env.local
# GROQ_API_KEY=your_key_here

# Run dev server
npm run dev
# → http://localhost:3000
```

---

## Updating CV Data

Whenever you edit any file in `data/`, rebuild the vector store then push:

```bash
cd C:\Users\Muneeb\Desktop\RAG_CV

# 1. Edit data/*.txt files as needed

# 2. Activate Python environment and rebuild embeddings
.venv\Scripts\activate
npm run build-vector-store
# → regenerates public/vector_store.json

# 3. Commit and push — Vercel auto-deploys
git add public/vector_store.json
git commit -m "update: rebuild vector store"
git push
```

---

## Environment Variables Reference

| Variable       | Where to set                       | Description       |
|----------------|------------------------------------|-------------------|
| `GROQ_API_KEY` | Vercel dashboard + `.env.local`    | Groq LLM API key  |

---

## Available npm Scripts

| Command                      | What it does                        |
|------------------------------|-------------------------------------|
| `npm run dev`                | Start local dev server              |
| `npm run build`              | Build for production (used by Vercel) |
| `npm run start`              | Start production build locally      |
| `npm run build-vector-store` | Rebuild `public/vector_store.json`  |