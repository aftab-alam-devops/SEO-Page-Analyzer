# SEO Page Analyzer — Deployment Guide

**GitHub repository:** [aftab-alam-devops/seo-analyzer](https://github.com/aftab-alam-devops/seo-analyzer)

This document walks you through deploying the full stack: **React frontend**, **FastAPI backend**, **PostgreSQL**, **Redis**, and **OpenRouter (Gemini)** for AI analysis.

---

## Table of contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Environment variables](#environment-variables)
4. [Local deployment (development)](#local-deployment-development)
5. [Production deployment overview](#production-deployment-overview)
6. [Option A: VPS with Nginx + systemd](#option-a-vps-with-nginx--systemd)
7. [Option B: Docker Compose (full stack)](#option-b-docker-compose-full-stack)
8. [Option C: Split hosting (frontend + backend)](#option-c-split-hosting-frontend--backend)
9. [Post-deployment checklist](#post-deployment-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

### High-level system diagram

```mermaid
flowchart TB
    subgraph Client["User browser"]
        UI["React SPA<br/>Vite + Tailwind"]
    end

    subgraph Hosting["Your infrastructure"]
        API["FastAPI backend<br/>uvicorn :8000"]
        PG[("PostgreSQL<br/>saved reports")]
        RD[("Redis<br/>scan progress")]
    end

    subgraph External["External services"]
        TARGET["Target website<br/>URL to analyze"]
        OR["OpenRouter API<br/>Gemini model"]
    end

    UI -->|"HTTPS REST<br/>VITE_API_URL"| API
    API -->|"read / write reports"| PG
    API -->|"job progress TTL"| RD
    API -->|"fetch HTML"| TARGET
    API -->|"SEO JSON → AI audit"| OR
```

### Scan flow (sequence)

```mermaid
sequenceDiagram
    actor User
    participant FE as React frontend
    participant API as FastAPI
    participant RD as Redis
    participant PG as PostgreSQL
    participant Web as Target URL
    participant AI as OpenRouter / Gemini

    User->>FE: Enter URL, click Scan
    FE->>API: POST /api/scan
    API->>RD: Init progress (job_id)
    API-->>FE: job_id

    loop Poll every ~800ms
        FE->>API: GET /api/scan/{job_id}/progress
        API->>RD: Read progress
        API-->>FE: steps + %
    end

    par Background worker
        API->>Web: HTTP GET page
        API->>API: Parse SEO (technical, content, perf)
        API->>AI: Send scan data
        AI-->>API: Score + audit JSON
        API->>PG: Save report
        API->>RD: status = completed
    end

    FE->>API: GET /api/reports/{id}
    API->>PG: Load report
    API-->>FE: Full results
    FE->>User: Results + Reports pages
```

### ASCII overview (plain text)

```
                    ┌──────────────────────────────────────┐
                    │           User Browser               │
                    │  Home → Progress → Results/Reports   │
                    │         (React SPA)                  │
                    └─────────────────┬────────────────────┘
                                      │  REST /api/*
                                      ▼
                    ┌──────────────────────────────────────┐
                    │         FastAPI Backend              │
                    │  scan · reports · health             │
                    │  seo_scanner · AI · report_builder   │
                    └─┬──────────────┬──────────────┬──────┘
                      │              │              │
          save report │   progress   │         fetch│ AI audit
                      ▼              ▼              ▼
               ┌──────────┐   ┌──────────┐   ┌─────────────┐
               │PostgreSQL│   │  Redis   │   │ OpenRouter  │
               │ reports  │   │ live job │   │  (Gemini)   │
               └──────────┘   └──────────┘   └──────┬──────┘
                                                      │
                      ┌──────────┐                    │
                      │ Target   │◄───────────────────┘
                      │ website  │   (HTML fetch only)
                      └──────────┘
```

### Component roles

| Component | Role |
|-----------|------|
| **Frontend** | Static SPA (Vite build). Talks to backend via `VITE_API_URL`. |
| **Backend** | REST API, HTML fetching, SEO parsing, background scans, AI calls. |
| **PostgreSQL** | Persists completed SEO reports (`seo_reports` table). |
| **Redis** | Stores live scan job progress (TTL ~1 hour). |
| **OpenRouter** | Sends scan JSON to Gemini; returns structured audit JSON. |
| **Target website** | Any public URL the user submits; fetched once per scan. |

---

## Prerequisites

| Tool | Version (recommended) |
|------|------------------------|
| Python | 3.11 or 3.12 |
| Node.js | 18+ |
| Docker & Docker Compose | Latest (for Postgres/Redis or full stack) |
| PostgreSQL | 14+ (if not using Docker) |
| Redis | 6+ (if not using Docker) |

**Accounts / keys**

- [OpenRouter](https://openrouter.ai/) API key (for Gemini AI analysis)
- Optional: managed Postgres (Neon, Supabase, RDS) and managed Redis (Upstash, ElastiCache)

---

## Environment variables

### Backend — `backend/.env`

Create from the example file:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | SQLAlchemy Postgres URL | `postgresql://user:pass@host:5432/seo_analyzer` |
| `REDIS_URL` | Yes | Redis connection URL | `redis://localhost:6379/0` |
| `OPENROUTER_API_KEY` | Recommended | OpenRouter API key | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | No | Gemini model id | `google/gemini-2.0-flash-001` |
| `CORS_ORIGINS` | Yes (prod) | Allowed frontend origins, comma-separated | `https://yourdomain.com` |
| `APP_NAME` | No | App title in API docs | `SEO Page Analyzer` |

**Notes**

- Never commit `backend/.env` to git (it is in `.gitignore`).
- `CORS_ORIGINS` must include the **exact** scheme + host + port of your frontend (no trailing slash).
- Without `OPENROUTER_API_KEY`, scans still work using the built-in rule-based audit.

### Frontend — `frontend/.env`

Required for **production builds** (values are baked in at build time):

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes (prod) | Public backend base URL | `https://api.yourdomain.com` |

For local dev, you can omit this; Vite proxies `/api` → `http://localhost:8000` (see `frontend/vite.config.ts`).

---

## Local deployment (development)

### Step 1 — Clone and enter the project

```bash
cd /path/to/SEOPageAnalyzer
```

### Step 2 — Start PostgreSQL and Redis

Using the included Compose file (default credentials match `backend/.env.example`):

```bash
docker compose up -d
```

Verify:

```bash
docker compose ps
```

Default connection strings:

```
DATABASE_URL=postgresql://seo_user:seo_password@localhost:5432/seo_analyzer
REDIS_URL=redis://localhost:6379/0
```

**Custom Postgres** (different host/port/database): create the database first, then set `DATABASE_URL` in `backend/.env`:

```bash
# Example: create DB on remote/local Postgres
psql -h localhost -p 55432 -U your_user -d postgres -c "CREATE DATABASE seoanalyzer;"
```

Tables are created automatically when the backend starts (`init_db()` in `app/main.py`).

### Step 3 — Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # edit with your keys
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/health
# {"status":"ok","app":"SEO Page Analyzer"}
```

API docs: http://localhost:8000/docs

### Step 4 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Step 5 — Smoke test

1. Enter a URL (e.g. `https://example.com`) and click **Scan Page**.
2. Watch the progress screen; when complete you are redirected to results.
3. Open **Reports** to see saved scans.

---

## Production deployment overview

| Approach | Best for | Complexity |
|----------|----------|------------|
| [VPS + Nginx](#option-a-vps-with-nginx--systemd) | Single server, full control | Medium |
| [Docker Compose](#option-b-docker-compose-full-stack) | Repeatable, portable | Medium |
| [Split hosting](#option-c-split-hosting-frontend--backend) | Vercel/Netlify + Railway/Render | Low–medium |

**Production requirements**

- HTTPS on frontend and API
- Strong Postgres/Redis passwords
- `CORS_ORIGINS` set to production frontend URL only
- `VITE_API_URL` set before `npm run build`
- Run backend with multiple workers (e.g. Gunicorn + Uvicorn workers) if traffic is high
- Outbound HTTPS allowed from backend (fetches target URLs + OpenRouter)

---

## Option A: VPS with Nginx + systemd

Example: Ubuntu 22.04, domain `yourdomain.com`, API at `api.yourdomain.com`.

### 1. Install system packages

```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv nginx git
```

Install Node (via [nodejs.org](https://nodejs.org/) or nvm) and Docker if you use containers for Postgres/Redis.

### 2. Run Postgres and Redis

Either use `docker compose up -d` from the project root, or managed cloud databases. Note connection strings in `backend/.env`.

### 3. Deploy backend

```bash
sudo mkdir -p /var/www/seo-analyzer
sudo chown $USER:$USER /var/www/seo-analyzer
cd /var/www/seo-analyzer
git clone <your-repo-url> .
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
nano .env   # set DATABASE_URL, REDIS_URL, OPENROUTER_API_KEY, CORS_ORIGINS
```

Create systemd service `/etc/systemd/system/seo-backend.service`:

```ini
[Unit]
Description=SEO Page Analyzer API
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/seo-analyzer/backend
Environment="PATH=/var/www/seo-analyzer/backend/.venv/bin"
ExecStart=/var/www/seo-analyzer/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable seo-backend
sudo systemctl start seo-backend
sudo systemctl status seo-backend
```

### 4. Build and deploy frontend

On your build machine or the server:

```bash
cd /var/www/seo-analyzer/frontend
echo "VITE_API_URL=https://api.yourdomain.com" > .env
npm ci
npm run build
```

Serve `frontend/dist` with Nginx.

### 5. Nginx configuration

`/etc/nginx/sites-available/seo-analyzer`:

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/seo-analyzer/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/seo-analyzer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Add TLS with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

Update `backend/.env`:

```
CORS_ORIGINS=https://yourdomain.com
```

Rebuild frontend if API URL changed, then reload Nginx.

---

## Option B: Docker Compose (full stack)

The repo includes `docker-compose.yml` for **Postgres and Redis only**. Below is a reference **full-stack** layout you can add under `docker-compose.prod.yml` (create these files if you adopt Docker for app services).

### `backend/Dockerfile` (reference)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### `frontend/Dockerfile` (reference)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Deploy steps

1. Set env files / secrets for Postgres, Redis, `OPENROUTER_API_KEY`.
2. Build frontend with `VITE_API_URL=https://api.yourdomain.com`.
3. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
4. Put a reverse proxy (Traefik/Caddy/Nginx) in front for HTTPS.

**Minimum today (data layer only):**

```bash
docker compose up -d
# Run backend + frontend on host as in [Local deployment](#local-deployment-development)
```

---

## Option C: Split hosting (frontend + backend)

### Backend — Railway / Render / Fly.io

1. Create a Web Service from the `backend` folder.
2. Set environment variables:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | From Neon/Supabase/Railway Postgres |
   | `REDIS_URL` | From Upstash or Railway Redis |
   | `OPENROUTER_API_KEY` | Your key |
   | `CORS_ORIGINS` | `https://your-frontend.vercel.app` |

3. Start command:

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

4. Note the public URL, e.g. `https://seo-api.onrender.com`.

### Frontend — Vercel / Netlify / Cloudflare Pages

1. Root directory: `frontend`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variable:

   ```
   VITE_API_URL=https://seo-api.onrender.com
   ```

5. Deploy. Ensure SPA routing: all routes fallback to `index.html`.

### Managed databases

| Service | Postgres | Redis |
|---------|----------|-------|
| [Neon](https://neon.tech) | Yes | — |
| [Supabase](https://supabase.com) | Yes | — |
| [Upstash](https://upstash.com) | — | Yes |
| [Railway](https://railway.app) | Yes | Yes |

Use the provider connection string as `DATABASE_URL` / `REDIS_URL`.

---

## Post-deployment checklist

- [ ] `curl https://api.yourdomain.com/api/health` returns `{"status":"ok",...}`
- [ ] Frontend loads over HTTPS
- [ ] Run a scan end-to-end; progress updates; results page loads
- [ ] Reports list shows completed scans
- [ ] `CORS_ORIGINS` matches frontend URL (browser console has no CORS errors)
- [ ] `OPENROUTER_API_KEY` set if you want Gemini AI (not only rule-based fallback)
- [ ] Postgres and Redis not exposed publicly without auth/firewall
- [ ] Secrets only in env vars, not in git

---

## Troubleshooting

### Backend fails on startup: database does not exist

```text
FATAL: database "seoanalyzer" does not exist
```

Create the database:

```bash
psql -h HOST -p PORT -U USER -d postgres -c "CREATE DATABASE seoanalyzer;"
```

Ensure `DATABASE_URL` in `backend/.env` matches host, port, user, password, and DB name.

### Backend fails: Redis connection refused

- Confirm Redis is running: `docker compose ps` or `redis-cli ping`
- Check `REDIS_URL` host/port/password

### Frontend shows network errors / CORS

- Set `CORS_ORIGINS` to your exact frontend origin (e.g. `https://app.example.com`)
- Set `VITE_API_URL` to the API origin and **rebuild** the frontend (`npm run build`)
- Do not mix `http` frontend with `https` API without CORS configuration

### Scans hang or progress 404

- Redis must be reachable; progress keys expire after 1 hour
- Check backend logs while scanning: `journalctl -u seo-backend -f`

### AI returns generic or fallback-only results

- Verify `OPENROUTER_API_KEY` in `backend/.env`
- Confirm outbound HTTPS to `https://openrouter.ai` is allowed
- Check OpenRouter dashboard for quota/errors

### Slow scans / timeouts

- Target sites may be slow; backend uses ~30s HTTP timeout per fetch
- AI step adds up to ~90s; increase proxy `proxy_read_timeout` if using Nginx

---

## Quick reference commands

| Task | Command |
|------|---------|
| Start DB + Redis | `docker compose up -d` |
| Backend (dev) | `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000` |
| Frontend (dev) | `cd frontend && npm run dev` |
| Frontend (prod build) | `cd frontend && npm run build` |
| Health check | `curl http://localhost:8000/api/health` |

---

## GitHub Actions CI/CD

Workflow: `.github/workflows/deploy.yml` — runs on push to `main`.

### Push code to GitHub (first time)

The remote [seo-analyzer](https://github.com/aftab-alam-devops/seo-analyzer) repo may only contain a README. From this project folder:

```bash
cd /path/to/SEOPageAnalyzer
git init
git remote add origin https://github.com/aftab-alam-devops/seo-analyzer.git
git add .
git commit -m "Add SEO Page Analyzer full stack"
git branch -M main
git push -u origin main
```

### Repository secrets (Settings → Secrets and variables → Actions)

| Secret | Description |
|--------|-------------|
| `GHCR_PAT` | GitHub PAT with `write:packages` and `read:packages` (push/pull from [ghcr.io](https://ghcr.io)) |
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USER` | SSH user (e.g. `root`, `ubuntu`) |
| `VPS_SSH_KEY` | Private SSH key (full PEM contents) |
| `VITE_API_URL` | Optional. Leave **empty** so Nginx proxies `/api` to the API container. Set only if the UI calls a separate API domain. |

### VPS setup before first deploy

```bash
sudo mkdir -p /opt/production/aftab   # or your deploy path in deploy.yml
cd /opt/production/aftab
git clone https://github.com/aftab-alam-devops/seo-analyzer.git .
cp backend/.env.example .env          # edit DATABASE_URL, REDIS_URL, OPENROUTER_API_KEY, CORS_ORIGINS
```

Set `CORS_ORIGINS` to your public site URL (e.g. `http://YOUR_VPS_IP` or `https://yourdomain.com`).

Postgres and Redis must be reachable from the API container (use Docker service name or `host.docker.internal`, not `localhost`).

The workflow builds **two images** and runs `docker compose -f docker-compose.prod.yml up -d api web`:

| Container | Image | Port |
|-----------|-------|------|
| `seo_analyzer_api` | `ghcr.io/aftab-alam-devops/seo-analyzer-api` | internal `:8000` |
| `seo_analyzer_web` | `ghcr.io/aftab-alam-devops/seo-analyzer-web` | public `:80` |

Open **http://YOUR_VPS_IP** — Nginx serves the React app and proxies `/api` to the backend.

---

## Related files

| File | Purpose |
|------|---------|
| `README.md` | Project overview and feature list |
| `.github/workflows/deploy.yml` | Build API + Web images, push to GHCR, deploy VPS |
| `docker-compose.prod.yml` | Production API + Nginx web on VPS |
| `backend/Dockerfile` | API container image |
| `frontend/Dockerfile` | Nginx + React static build |
| `frontend/nginx.conf` | SPA routing + `/api` reverse proxy |
| `docker-compose.yml` | Local Postgres + Redis |
| `backend/.env.example` | Backend env template |
| `frontend/.env.example` | Frontend env template |
| `backend/run.sh` | Convenience dev server script |

---

## Security reminders

- Rotate API keys if they were ever committed or shared.
- Use strong passwords for Postgres and Redis in production.
- Restrict database/redis ports to private networks or VPC.
- Keep dependencies updated: `pip install -U -r requirements.txt`, `npm audit`.

For questions or improvements to this guide, update this file in the repository root as deployment steps change.
