# CivicLens AI - System Architecture, Dockerfiles & DB Configurations
This file details the production-ready infrastructure configurations, Docker specifications, and deployment metrics for CivicLens AI.

---

## 🐋 1. Backend Dockerfile (`backend/Dockerfile`)
Production-grade Multi-stage Docker configuration with Gunicorn/Uvicorn, connection pool parameters, and security isolation.

```dockerfile
# Stage 1: Build & Dependendency compilation
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmariadb-dev \
    pkg-config \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies inside a virtual env to shrink layer size
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -U pip setuptools && \
    pip install --no-cache-dir -r requirements.txt

# Stage 2: Final minimal runtime execution image
FROM python:3.12-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libmariadb3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY app/ ./app
COPY alembic.ini .
COPY alembic/ ./alembic

# Create non-privileged user for security hardening
RUN useradd -u 8888 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENV PORT=8000
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:8000", "app.main:app"]
```

---

## 📱 2. Flutter Web/Android Dockerfile (`mobile/Dockerfile`)
Sleek compilation container for Flutter Web and Android bundles, pre-packaged with Flutter SDK and dependencies.

```dockerfile
FROM ubuntu:22.04 AS build-env

# Setup system requirements
RUN apt-get update && apt-get install -y \
    curl git unzip zip xz-utils libglu1-mesa python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /sdks

# Fetch latest stable Flutter SDK
RUN git clone https://github.com/flutter/flutter.git -b stable --depth 1

ENV PATH="/sdks/flutter/bin:/sdks/flutter/bin/cache/dart-sdk/bin:$PATH"

RUN flutter doctor -v

WORKDIR /app
COPY . .

# Run flutter configurations
RUN flutter pub get
RUN flutter build web --release

# Stage 2: Nginx high-performance host
FROM nginx:alpine
COPY --from=build-env /app/build/web /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🗄️ 3. Database Schema Blueprint (MySQL 3NF Compliant)
Below is the relational entity diagram detailing primary/foreign keys and constraint bounds.

```
+------------------+         +------------------+         +--------------------------+
|   departments    |         |     officers     |         |  complaint_status_history|
+------------------+         +------------------+         +--------------------------+
| PK id            |<--------| PK id            |         | PK id                    |
|    name (Unique) |         |    full_name     |         | FK complaint_id (Cascade)|
|    sla_low_hours |         |    email (Unique)|         |    status                |
|    sla_med_hours |         |    phone_number  |         |    remarks               |
|    sla_high_hours|         | FK dept_id       |         |    changed_by            |
|    sla_crit_hours|         +------------------+         |    changed_at            |
+------------------+                  |                   +--------------------------+
         ^                            |                                 ^
         |                            |                                 |
         +------------------+         |                                 |
                            |         v                                 |
                     +----------------------------+                     |
                     |         complaints         |---------------------+
                     +----------------------------+
                     | PK id (CMP-YYYY-XXXXXX)    |
                     |    title                   |
                     |    description             |
                     | FK department_id           |
                     | FK officer_id (Null/Set)   |
                     | FK citizen_id (Cascade)    |
                     |    status                  |
                     |    priority_score          |
                     |    priority_level          |
                     |    latitude, longitude     |
                     |    photo_url, video_url    |
                     |    ai_summary, ai_engine   |
                     |    escalation_level (0-3)  |
                     +----------------------------+
                                  ^   ^
                                  |   |
         +------------------------+   +-------------------+
         |                                                |
+--------------------------+                     +------------------------+
|    complaint_supports    |                     |      escalations       |
+--------------------------+                     +------------------------+
| PK id                    |                     | PK id                  |
| FK complaint_id (Cascade)|                     | FK complaint_id        |
| FK citizen_id (Cascade)  |                     |    old_level           |
+--------------------------+                     |    new_level (1-3)     |
                                                 |    escalated_to_role   |
                                                 |    escalated_at        |
                                                 +------------------------+
```

---

## ⏳ 4. Smart SLA & Multi-Level Escalation Matrix
CivicLens AI uses an autonomous escalation process powered by background schedulers to ensure accountability.

| Priority | Resolution SLA | Escalation Flow (Upon SLA Breach) |
| :--- | :--- | :--- |
| **Critical / Emergency** | **2 Hours** | **Officer** (0h) ➔ **Dept Head** (2h) ➔ **District Officer** (4h) ➔ **Collector** (6h) |
| **High** | **12 Hours** | **Officer** (0h) ➔ **Dept Head** (12h) ➔ **District Officer** (24h) ➔ **Collector** (36h) |
| **Medium** | **24 Hours** | **Officer** (0h) ➔ **Dept Head** (24h) ➔ **District Officer** (48h) ➔ **Collector** (72h) |
| **Low** | **48 Hours** | **Officer** (0h) ➔ **Dept Head** (48h) ➔ **District Officer** (96h) ➔ **Collector** (144h) |
