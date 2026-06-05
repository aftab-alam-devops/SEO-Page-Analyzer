# SEO Page Analyzer

Full-stack SEO analysis tool containerized with Docker. Enter a URL, track real-time scan progress, and view detailed technical/content/performance reports with Gemini AI suggestions.

## Stack
- **Frontend**: React, Vite, Tailwind CSS (running inside Nginx container proxy)
- **Backend**: FastAPI, SQLAlchemy, httpx, BeautifulSoup (running inside Python container)
- **Database**: PostgreSQL (persisting reports)
- **Cache/Progress**: Redis (job progress status)

## Setup and Running

1. **Configure Environment**:
   Create the backend `.env` file from the example:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Add your `OPENROUTER_API_KEY` to `backend/.env` if you want AI recommendations. Without a key, the app falls back to a rule-based SEO audit.

2. **Launch Stack**:
   Start the entire stack using Docker Compose:
   ```bash
   docker compose up -d --build
   ```

3. **Access the App**:
   - Web App: `http://localhost:5173/`
   - Backend API Docs: `http://localhost:8000/docs`

4. **Shutdown Stack**:
   ```bash
   docker compose down
   ```
## License

MIT
