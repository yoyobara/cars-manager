import uuid
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.repositories.base import IUserRepository, IFamilyRepository, ICarRepository, IBookingRepository
from app.models.db import User, Family, Car, Booking, user_allowed_cars


# Serialization Helpers
def _user_to_dict(user: User) -> Optional[dict]:
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "password_hash": user.password_hash,
        "role": user.role,
        "family_id": user.family_id,
        "allowed_car_ids": [car.id for car in user.allowed_cars]
    }


def _family_to_dict(family: Family) -> Optional[dict]:
    if not family:
        return None
    return {
        "id": family.id,
        "name": family.name,
        "invite_code": family.invite_code
    }


def _car_to_dict(car: Car) -> Optional[dict]:
    if not car:
        return None
    return {
        "id": car.id,
        "name": car.name,
        "license_plate": car.license_plate,
        "photo_url": car.photo_url,
        "priority": car.priority,
        "family_id": car.family_id
    }


def _booking_to_dict(booking: Booking) -> Optional[dict]:
    if not booking:
        return None
    return {
        "id": booking.id,
        "car_id": booking.car_id,
        "user_id": booking.user_id,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "status": booking.status,
        "purpose": booking.purpose,
        "user": {
            "id": booking.user.id,
            "name": booking.user.name,
            "email": booking.user.email
        } if booking.user else None,
        "car": {
            "id": booking.car.id,
            "name": booking.car.name,
            "license_plate": booking.car.license_plate,
            "photo_url": booking.car.photo_url
        } if booking.car else None
    }


class PostgresUserRepository(IUserRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: UUID) -> Optional[dict]:
        user = self.db.query(User).filter(User.id == user_id).first()
        return _user_to_dict(user)

    def get_by_email(self, email: str) -> Optional[dict]:
        user = self.db.query(User).filter(User.email.ilike(email.strip())).first()
        return _user_to_dict(user)

    def get_by_family(self, family_id: UUID) -> List[dict]:
        users = self.db.query(User).filter(User.family_id == family_id).all()
        return [_user_to_dict(u) for u in users]

    def create(self, user_data: dict) -> dict:
        user_id = user_data.get("id") or uuid.uuid4()
        db_user = User(
            id=user_id,
            name=user_data["name"],
            email=user_data["email"].strip().lower(),
            password_hash=user_data["password_hash"],
            role=user_data.get("role", "member"),
            family_id=user_data["family_id"]
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return _user_to_dict(db_user)

    def update_permissions(self, user_id: UUID, allowed_car_ids: List[UUID]) -> None:
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            # Load the corresponding cars
            cars = self.db.query(Car).filter(Car.id.in_(allowed_car_ids)).all()
            user.allowed_cars = cars
            self.db.commit()

    def get_allowed_car_ids(self, user_id: UUID) -> List[UUID]:
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            return [car.id for car in user.allowed_cars]
        return []


class PostgresFamilyRepository(IFamilyRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, family_id: UUID) -> Optional[dict]:
        family = self.db.query(Family).filter(Family.id == family_id).first()
        return _family_to_dict(family)

    def get_by_invite_code(self, invite_code: str) -> Optional[dict]:
        family = self.db.query(Family).filter(Family.invite_code == invite_code.strip()).first()
        return _family_to_dict(family)

    def create(self, family_data: dict) -> dict:
        family_id = family_data.get("id") or uuid.uuid4()
        db_family = Family(
            id=family_id,
            name=family_data["name"],
            invite_code=family_data["invite_code"].strip()
        )
        self.db.add(db_family)
        self.db.commit()
        self.db.refresh(db_family)
        return _family_to_dict(db_family)


class PostgresCarRepository(ICarRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, car_id: UUID) -> Optional[dict]:
        car = self.db.query(Car).filter(Car.id == car_id).first()
        return _car_to_dict(car)

    def get_by_family(self, family_id: UUID) -> List[dict]:
        cars = self.db.query(Car).filter(Car.family_id == family_id).all()
        return [_car_to_dict(c) for c in cars]

    def create(self, car_data: dict) -> dict:
        car_id = car_data.get("id") or uuid.uuid4()
        db_car = Car(
            id=car_id,
            name=car_data["name"],
            license_plate=car_data["license_plate"],
            photo_url=car_data["photo_url"],
            priority=car_data.get("priority", 1),
            family_id=car_data["family_id"]
        )
        self.db.add(db_car)
        self.db.commit()
        self.db.refresh(db_car)
        
        # Auto-add allowed car permission for family managers
        managers = self.db.query(User).filter(
            and_(User.family_id == db_car.family_id, User.role == "manager")
        ).all()
        for manager in managers:
            manager.allowed_cars.append(db_car)
        self.db.commit()
        
        return _car_to_dict(db_car)

    def update(self, car_id: UUID, car_data: dict) -> Optional[dict]:
        car = self.db.query(Car).filter(Car.id == car_id).first()
        if not car:
            return None
        car.name = car_data.get("name", car.name)
        car.license_plate = car_data.get("license_plate", car.license_plate)
        car.photo_url = car_data.get("photo_url", car.photo_url)
        car.priority = car_data.get("priority", car.priority)
        self.db.commit()
        self.db.refresh(car)
        return _car_to_dict(car)

    def delete(self, car_id: UUID) -> bool:
        car = self.db.query(Car).filter(Car.id == car_id).first()
        if car:
            self.db.delete(car)
            self.db.commit()
            return True
        return False


class PostgresBookingRepository(IBookingRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, booking_id: UUID) -> Optional[dict]:
        booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
        return _booking_to_dict(booking)

    def get_by_family(self, family_id: UUID) -> List[dict]:
        bookings = self.db.query(Booking).join(Car).filter(Car.family_id == family_id).all()
        return [_booking_to_dict(b) for b in bookings]

    def get_by_user(self, user_id: UUID) -> List[dict]:
        bookings = self.db.query(Booking).filter(Booking.user_id == user_id).all()
        return [_booking_to_dict(b) for b in bookings]

    def create(self, booking_data: dict) -> dict:
        booking_id = booking_data.get("id") or uuid.uuid4()
        db_booking = Booking(
            id=booking_id,
            car_id=booking_data["car_id"],
            user_id=booking_data["user_id"],
            start_time=booking_data["start_time"],
            end_time=booking_data["end_time"],
            status=booking_data.get("status", "scheduled"),
            purpose=booking_data.get("purpose")
        )
        self.db.add(db_booking)
        self.db.commit()
        self.db.refresh(db_booking)
        return _booking_to_dict(db_booking)

    def update_status(self, booking_id: UUID, status: str) -> Optional[dict]:
        booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            return None
        booking.status = status
        self.db.commit()
        self.db.refresh(booking)
        return _booking_to_dict(booking)

    def get_overlapping_bookings(self, car_id: UUID, start_time: datetime, end_time: datetime) -> List[dict]:
        bookings = self.db.query(Booking).filter(
            and_(
                Booking.car_id == car_id,
                Booking.status.in_(["scheduled", "active"]),
                Booking.start_time < end_time,
                Booking.end_time > start_time
            )
        ).all()
        return [_booking_to_dict(b) for b in bookings]
