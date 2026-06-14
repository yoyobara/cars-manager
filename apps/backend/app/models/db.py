import uuid
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    ForeignKey,
    DateTime,
    Table,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.types import Uuid
from app.config import settings

Base = declarative_base()

# Association table for User allowed cars
user_allowed_cars = Table(
    "user_allowed_cars",
    Base.metadata,
    Column(
        "user_id", Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    ),
    Column("car_id", Uuid, ForeignKey("cars.id", ondelete="CASCADE"), primary_key=True),
)


class Family(Base):
    __tablename__ = "families"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    invite_code = Column(String, unique=True, nullable=False, index=True)

    # Relationships
    users = relationship("User", back_populates="family", cascade="all, delete-orphan")
    cars = relationship("Car", back_populates="family", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="member")  # "manager" or "member"
    family_id = Column(
        Uuid, ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    family = relationship("Family", back_populates="users")
    bookings = relationship(
        "Booking", back_populates="user", cascade="all, delete-orphan"
    )
    allowed_cars = relationship(
        "Car", secondary=user_allowed_cars, back_populates="allowed_users"
    )


class Car(Base):
    __tablename__ = "cars"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    license_plate = Column(String, nullable=False)
    photo_url = Column(
        String, nullable=False
    )  # Can store static URL, preset name, or base64 data
    priority = Column(Integer, nullable=False, default=1)  # 1 to 5
    family_id = Column(
        Uuid, ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )

    # Relationships
    family = relationship("Family", back_populates="cars")
    bookings = relationship(
        "Booking", back_populates="car", cascade="all, delete-orphan"
    )
    allowed_users = relationship(
        "User", secondary=user_allowed_cars, back_populates="allowed_cars"
    )


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    car_id = Column(Uuid, ForeignKey("cars.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        String, nullable=False, default="scheduled"
    )  # "scheduled", "active", "completed", "cancelled"
    purpose = Column(String, nullable=True)

    # Relationships
    car = relationship("Car", back_populates="bookings")
    user = relationship("User", back_populates="bookings")


# SQLAlchemy setup
engine = None
SessionLocal = None


def init_db():
    global engine, SessionLocal
    if settings.DATABASE_TYPE == "postgres":
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine


def get_db():
    if settings.DATABASE_TYPE != "postgres":
        yield None
        return

    if SessionLocal is None:
        init_db()

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
