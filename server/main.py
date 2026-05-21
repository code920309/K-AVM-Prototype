import sys
import os
import io

# Fix UTF-8 output on Windows Korean locale safely without breaking sys.excepthook on shutdown
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure server/ directory is in Python path for absolute imports consistency
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.mongodb import connect_to_mongo, close_mongo_connection
from routers import avm, report, chat

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="통합 AVM 및 금융 연계 플랫폼 API",
    description="Python FastAPI 백엔드 + MongoDB Atlas 실시간 실거래 유사사례 필터 + Gemini RAG 의사 결정 분석 엔진",
    version="3.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include endpoint routers
app.include_router(avm.router)
app.include_router(report.router)
app.include_router(chat.router)

# Mount frontend static files in production / Hugging Face Spaces environment
front_dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "front", "dist")
if os.path.exists(front_dist_path):
    print(f"[Static] Mounting frontend from: {front_dist_path}")
    app.mount("/", StaticFiles(directory=front_dist_path, html=True), name="frontend")
else:
    print(f"[Static] Frontend dist directory not found at: {front_dist_path}. Local backend-only mode.")

if __name__ == "__main__":
    import uvicorn
    # Hugging Face Spaces runs on port 7860 by default
    port = int(os.getenv("PORT", 7860))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
