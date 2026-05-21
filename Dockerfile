# ==========================================
# Phase 1: Build React Frontend using Node.js
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/front

# Copy package configuration
COPY front/package*.json ./
RUN npm install --legacy-peer-deps

# Copy frontend codebase and run compilation
COPY front/ ./
RUN npm run build

# ==========================================
# Phase 2: Python Runtime and FastAPI Serving
# ==========================================
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies needed for compiling python wheels if any
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python backend dependencies
COPY server/requirements.txt ./server/
RUN pip install --no-cache-dir -r server/requirements.txt

# Copy server code
COPY server/ ./server/

# Copy compiled React output (dist) from Phase 1 builder into frontend dir
COPY --from=frontend-builder /app/front/dist ./front/dist

# Expose port (Hugging Face Spaces strictly forwards traffic on port 7860)
EXPOSE 7860

# Set environment directory and launch uvicorn
WORKDIR /app/server
CMD ["python", "main.py"]
