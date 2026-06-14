from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.db import Base, engine, init_db
from app.routers import auth, cars, bookings, family, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup if using postgres
    if settings.DATABASE_TYPE == "postgres":
        engine = init_db()
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Cars Manager API",
    description="Backend API for managing family cars and bookings",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
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
