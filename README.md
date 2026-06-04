# SEO Page Analyzer

**Repository:** [github.com/aftab-alam-devops/seo-analyzer](https://github.com/aftab-alam-devops/seo-analyzer)

Full-stack SEO analysis tool: enter a URL, watch a live scan progress UI, and get detailed technical/content/performance metrics plus **Gemini AI** recommendations via OpenRouter.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React, Vite, Tailwind CSS, Framer Motion, Recharts |
| Backend | FastAPI, SQLAlchemy, httpx, BeautifulSoup |
| Database | PostgreSQL |
| Cache / progress | Redis |
| AI | OpenRouter → Gemini (`google/gemini-2.0-flash-001`) |

## Architecture

Simple diagrams (system view + scan flow) are in **[DEPLOYMENT.md § Architecture](./DEPLOYMENT.md#architecture)** — Mermaid charts render on GitHub and most Markdown viewers.

## Where to put credentials

### Backend — `backend/.env`

Copy the example file and edit:

```bash
cp backend/.env.example backend/.env
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `OPENROUTER_API_KEY` | Your [OpenRouter](https://openrouter.ai/) API key |
| `OPENROUTER_MODEL` | Gemini model id (default: `google/gemini-2.0-flash-001`) |
| `CORS_ORIGINS` | Frontend URL(s), comma-separated |

**Default local values** (match `docker-compose.yml`):

```
DATABASE_URL=postgresql://seo_user:seo_password@localhost:5432/seo_analyzer
REDIS_URL=redis://localhost:6379/0
OPENROUTER_API_KEY=sk-or-v1-...
CORS_ORIGINS=http://localhost:5173
```

### Frontend — `frontend/.env` (optional)

```bash
cp frontend/.env.example frontend/.env
```

```
VITE_API_URL=http://localhost:8000
```

If unset, Vite proxies `/api` to the backend during `npm run dev`.

## Quick start

### 1. Start PostgreSQL & Redis

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then add OPENROUTER_API_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Tables are created automatically on startup.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## User flow

1. **Home** — Large centered URL input → **Scan Page**
2. **Progress** (`/scan/:jobId`) — Rolling status text, step checklist, progress bar (polled from Redis)
3. **Results** (`/results/:id`) — SEO score ring, critical issues, AI recommendations, charts
4. **Reports** — List of saved scans from PostgreSQL

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/scan` | Start scan `{ "url": "..." }` → `{ job_id }` |
| GET | `/api/scan/{job_id}/progress` | Live progress (Redis) |
| GET | `/api/reports` | List completed reports |
| GET | `/api/reports/{id}` | Full report + AI analysis |
| GET | `/api/health` | Health check |

## What gets scanned

**Technical SEO:** page title, meta description, H1/H2 counts, image alt tags, canonical, Open Graph, robots meta, internal/external links.

**Content SEO:** word count, Flesch readability, keyword density, basic grammar/content checks.

**Performance:** HTTP response time, page size (KB).

**AI layer:** Collected data is sent to Gemini via OpenRouter. Response shape:

```json
{
  "seo_score": 78,
  "critical_issues": ["Missing meta description", "5 images missing alt text"],
  "recommendations": ["Add a 150-160 character meta description", "Add descriptive alt text"]
}
```

Without `OPENROUTER_API_KEY`, a rule-based fallback still produces scores and suggestions.

## Project structure

```
SEOPageAnalyzer/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py          # reads backend/.env
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── redis_client.py
│   │   ├── routers/
│   │   └── services/
│   │       ├── seo_scanner.py
│   │       ├── ai_analyzer.py
│   │       └── scan_worker.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/             # Home, ScanProgress, Results, Reports
│       └── components/
├── docker-compose.yml
└── README.md
```

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full production walkthrough (VPS, Docker, split hosting), environment variables, Nginx, and troubleshooting.

## License

MIT
