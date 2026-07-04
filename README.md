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

## 🚀 CI/CD Pipeline & AWS EKS Deployment

The application features a fully automated GitOps delivery pipeline configured via **GitHub Actions** split into two optimized workflows:
*   [deploy-backend.yml](file:///c:/Users/imaft/OneDrive/Desktop/project/SEO-Page-Analyzer/.github/workflows/deploy-backend.yml): Deploys the FastAPI backend API and monitoring infrastructure.
*   [deploy-frontend.yml](file:///c:/Users/imaft/OneDrive/Desktop/project/SEO-Page-Analyzer/.github/workflows/deploy-frontend.yml): Deploys the React frontend client.

### How the Pipelines Work:
1.  **Path Filtering Triggers**:
    *   Backend pipeline runs only when code changes under `backend/**`, `helm/backend/**`, or `helm/monitoring/**`.
    *   Frontend pipeline runs only when code changes under `frontend/**` or `helm/frontend/**`.
2.  **AWS & ECR Authentication**:
    *   Authenticates securely to AWS ECR using GitHub Repository secrets.
3.  **Build & Push**:
    *   Builds production-optimized Docker images and pushes them to AWS ECR (`seo-analyzer-backend` and `seo-analyzer-frontend` repositories).
4.  **Deploy via Helm**:
    *   Updates the local `kubeconfig` to connect to your AWS EKS cluster.
    *   Deploys/upgrades the respective Helm chart under the `default` namespace.

### Set Up Repository Secrets on GitHub:
To configure the deployment, navigate to **Settings** → **Secrets and variables** → **Actions** in your GitHub repository, and define the following secrets:
*   `AWS_ACCESS_KEY_ID`: Your AWS access key ID.
*   `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key.
*   `AWS_REGION`: The AWS region of your EKS cluster and ECR registry (e.g., `us-east-1`).
*   `EKS_CLUSTER_NAME`: The name of your AWS EKS Cluster.
*   `OPENROUTER_API_KEY`: Your OpenRouter API Key for Gemini.

---

## ☸️ Helm Charts Structure

The Kubernetes manifests are templated using Helm and organized inside the `/helm` directory:
1.  **Backend Chart** (`/helm/backend`):
    *   Deploys the backend application, PostgreSQL database, and Redis cache.
    *   Exposes the backend service as a LoadBalancer.
2.  **Frontend Chart** (`/helm/frontend`):
    *   Deploys the web app (served by Nginx reverse proxy).
    *   Exposes the frontend service as a LoadBalancer.
3.  **Monitoring Chart** (`/helm/monitoring`):
    *   Deploys Prometheus for metrics collection and Grafana for dashboards.
    *   Grafana is exposed via a LoadBalancer.


