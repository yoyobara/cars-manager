from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.models.db import Base, engine, init_db
from app.routers import auth, cars, bookings, family, dashboard
from app.utils.limiter import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup if using postgres
    if settings.DATABASE_TYPE == "postgres":
        engine = init_db()
        Base.metadata.create_all(bind=engine)
    yield


# Rate limiting setup
app = FastAPI(
    title="Cars Manager API",
    description="Backend API for managing family cars and bookings",
    version="1.0.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(cars.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(family.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Welcome to Cars Manager API"}
