from fastapi import Depends
from sqlalchemy.orm import Session
from app.config import settings
from app.models.db import get_db
from app.repositories.base import IUserRepository, IFamilyRepository, ICarRepository, IBookingRepository
from app.repositories.memory import (
    MemoryUserRepository,
    MemoryFamilyRepository,
    MemoryCarRepository,
    MemoryBookingRepository,
)
from app.repositories.postgres import (
    PostgresUserRepository,
    PostgresFamilyRepository,
    PostgresCarRepository,
    PostgresBookingRepository,
)

# Singleton memory repositories
_memory_user_repo = MemoryUserRepository()
_memory_family_repo = MemoryFamilyRepository()
_memory_car_repo = MemoryCarRepository()
_memory_booking_repo = MemoryBookingRepository()


def get_user_repository(db: Session = Depends(get_db)) -> IUserRepository:
    if settings.DATABASE_TYPE == "postgres":
        return PostgresUserRepository(db)
    return _memory_user_repo


def get_family_repository(db: Session = Depends(get_db)) -> IFamilyRepository:
    if settings.DATABASE_TYPE == "postgres":
        return PostgresFamilyRepository(db)
    return _memory_family_repo


def get_car_repository(db: Session = Depends(get_db)) -> ICarRepository:
    if settings.DATABASE_TYPE == "postgres":
        return PostgresCarRepository(db)
    return _memory_car_repo


def get_booking_repository(db: Session = Depends(get_db)) -> IBookingRepository:
    if settings.DATABASE_TYPE == "postgres":
        return PostgresBookingRepository(db)
    return _memory_booking_repo
