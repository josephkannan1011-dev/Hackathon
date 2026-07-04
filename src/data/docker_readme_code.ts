export const dockerReadmeCode = `# CivicLens AI - System Architecture, Dockerfiles & DB Configurations

This file details the production-ready infrastructure configurations, Docker specifications, and deployment metrics for CivicLens AI.

---

## 🐋 1. Backend Dockerfile (\`backend/Dockerfile\`)
Production-grade Multi-stage Docker configuration with Gunicorn/Uvicorn, connection pool parameters, and security isolation.

\`\`\`dockerfile
# Stage 1: Build & Dependendency compilation
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    libmariadb-dev \\
    pkg-config \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Final minimal runtime execution image
FROM python:3.12-slim AS runner

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY app/ ./app
EXPOSE 8000
USER appuser
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:8000", "app.main:app"]
\`\`\`

---

## ⏳ 2. Smart SLA & Multi-Level Escalation Matrix
CivicLens AI uses an autonomous escalation process powered by background schedulers to ensure accountability.

| Priority | Resolution SLA | Escalation Flow (Upon SLA Breach) |
| :--- | :--- | :--- |
| **Critical / Emergency** | **2 Hours** | **Officer** ➔ **Dept Head** (2h) ➔ **District Officer** (4h) ➔ **Collector** (6h) |
| **High** | **12 Hours** | **Officer** ➔ **Dept Head** (12h) ➔ **District Officer** (24h) ➔ **Collector** (36h) |
| **Medium** | **24 Hours** | **Officer** ➔ **Dept Head** (24h) ➔ **District Officer** (48h) ➔ **Collector** (72h) |
| **Low** | **48 Hours** | **Officer** ➔ **Dept Head** (48h) ➔ **District Officer** (96h) ➔ **Collector** (144h) |
`;
