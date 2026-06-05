# SEO Page Analyzer 🚀

A high-performance, containerized full-stack SEO analysis application. Enter any website URL to perform deep technical audits, content checks, structure analyses, and get AI-powered improvement suggestions powered by Google Gemini (via OpenRouter).

---

## 🛠 Tech Stack

*   **Frontend**: React, Vite (Vanilla JS/JSX), Tailwind CSS, served via **Nginx** reverse proxy.
*   **Backend**: **FastAPI** (Python), SQLAlchemy, httpx, BeautifulSoup4.
*   **Database**: **PostgreSQL** for storing persistent scan reports.
*   **Message Broker / Cache**: **Redis** for tracking real-time scan job progress.
*   **CI/CD**: **GitHub Actions** with **GitHub Container Registry (GHCR)**.
*   **Monitoring**: **Prometheus** (metrics scraping) & **Grafana** (dashboards).

---

## 💻 Local Development

### 1. Configure Local Environment
Copy the example environment file and add your custom API key:
```bash
cp backend/.env.example backend/.env
```
Open `backend/.env` and specify your `OPENROUTER_API_KEY`. (If left blank, the app falls back to rule-based audits without AI).

### 2. Launch the Stack
Start all services (App, DB, Cache, Monitoring) in detached mode:
```bash
docker compose up -d --build
```

### 3. Access the Services
*   **Web App UI**: [http://localhost:5173](http://localhost:5173)
*   **FastAPI API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
*   **Prometheus Metrics Scraper**: [http://localhost:9090](http://localhost:9090)
*   **Grafana Dashboard**: [http://localhost:3000](http://localhost:3000)

---

## 📈 Monitoring with Prometheus & Grafana

This application exposes internal performance metrics out-of-the-box using the Prometheus FastAPI Instrumentator.

1.  **FastAPI Metrics**: Scraped from the `/metrics` endpoint on the API container.
2.  **Prometheus Configuration**: Configured via `prometheus/prometheus.yml` to pull metrics every 15 seconds.
3.  **Grafana DataSource Provisioning**: Automatically pre-configured to connect to Prometheus. When you log in to Grafana at `http://<your-ip>:3000` (default credentials: `admin` / `admin`), the Prometheus datasource is already provisioned and ready for dashboard design.

---

## 🚀 CI/CD Pipeline & VPS Deployment

The application features a fully automated GitOps delivery pipeline configured via **GitHub Actions** in `.github/workflows/deploy.yml`.

### How the Pipeline Works:
1.  **Trigger**: Triggered on every push to the `main` branch.
2.  **Auth**: Authenticates securely to GitHub Container Registry (GHCR) using the repository's built-in `GITHUB_TOKEN`.
3.  **Build & Push**: Builds production-optimized Docker images for both `/frontend` and `/backend` and pushes them to GHCR.
4.  **Transfer Configs**: SCPs the production docker compose and config files (`docker-compose.prod.yml`, `prometheus/`, `grafana/`) to the target `/opt/production/aftab/` directory on your VPS.
5.  **Dynamic .env generation**: Automatically generates a secure `.env` file on the fly inside the VPS, injecting repository secrets (like `OPENROUTER_API_KEY` and production `CORS_ORIGINS`).
6.  **Deploy**: Connects via SSH to pull the fresh images from GHCR and restart the containers.

### Set Up Repository Secrets on GitHub:
To deploy, navigate to **Settings** → **Secrets and variables** → **Actions** in your GitHub repository, and define:
*   `VPS_HOST`: The public IP of your EC2 instance (`35.174.167.153`).
*   `VPS_USER`: SSH login username (e.g. `ubuntu` or `root`).
*   `VPS_SSH_KEY`: The private SSH key (PEM file content) used to authenticate with the VPS.
*   `OPENROUTER_API_KEY`: Your OpenRouter API Key for Gemini.

---

## 🔒 Security Hardening

For production environments, ensure the following practices are followed:

1.  **Isolate Backend, Database, and Cache**:
    *   `postgres` and `redis` do not expose ports to the public internet. They communicate strictly over the isolated Docker network bridge.
    *   The `api` container is kept private. All external requests target the `web` Nginx container on port `80`, which routes `/api/` traffic safely to the backend service internally.
2.  **CORS Restrictions**:
    *   Backend `CORS_ORIGINS` are locked down to your production domain (`https://aftab-fastapi.duckdns.org`), the VPS public IP (`http://35.174.167.153`), and `localhost:5173` for safety.
3.  **Prometheus Privacy**:
    *   Prometheus (port `9090`) is configured internal-only in `docker-compose.prod.yml`. Grafana serves as the secure visual portal.

---

## 🔑 SSL Certificate Setup (Let's Encrypt)

To secure traffic to `https://aftab-fastapi.duckdns.org` using SSL, you can run **Certbot** on the VPS.

### 1. Install Certbot on the Host VPS
```bash
sudo apt-get update
sudo apt-get install certbot -y
```

### 2. Generate the SSL Certificates
Run Certbot in standalone mode (make sure Docker container on port 80 is temporarily stopped):
```bash
docker compose -f docker-compose.prod.yml down
sudo certbot certonly --standalone -d aftab-fastapi.duckdns.org
```

### 3. Mount Certificates to Nginx Web Container
Once generated, the certificates will be located in `/etc/letsencrypt/live/aftab-fastapi.duckdns.org/`.
Update your `docker-compose.prod.yml` to mount the certificate volumes into the `web` container:
```yaml
  web:
    image: ${DOCKER_IMAGE_WEB}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
```
Then configure your Nginx config to listen on port `443` and use the SSL certs:
```nginx
server {
    listen 80;
    server_name aftab-fastapi.duckdns.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name aftab-fastapi.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/aftab-fastapi.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aftab-fastapi.duckdns.org/privkey.pem;

    location /api/ {
        proxy_pass http://api:8000;
        ...
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
Restart the stack:
```bash
docker compose -f docker-compose.prod.yml up -d
```
