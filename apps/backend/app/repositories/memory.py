import uuid
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.repositories.base import IUserRepository, IFamilyRepository, ICarRepository, IBookingRepository

# Global In-Memory Data Store
USERS_DB = {}          # user_id (UUID) -> dict
FAMILIES_DB = {}       # family_id (UUID) -> dict
CARS_DB = {}           # car_id (UUID) -> dict
BOOKINGS_DB = {}       # booking_id (UUID) -> dict
USER_ALLOWED_CARS = {} # user_id (UUID) -> set of car_ids (UUID)


class MemoryUserRepository(IUserRepository):
    def get_by_id(self, user_id: UUID) -> Optional[dict]:
        user = USERS_DB.get(user_id)
        if user:
            # Create a copy and insert allowed_car_ids
            res = dict(user)
            res["allowed_car_ids"] = list(USER_ALLOWED_CARS.get(user_id, set()))
            return res
        return None

    def get_by_email(self, email: str) -> Optional[dict]:
        normalized_email = email.strip().lower()
        for user in USERS_DB.values():
            if user["email"].strip().lower() == normalized_email:
                res = dict(user)
                res["allowed_car_ids"] = list(USER_ALLOWED_CARS.get(user["id"], set()))
                return res
        return None

    def get_by_family(self, family_id: UUID) -> List[dict]:
        members = []
        for user in USERS_DB.values():
            if user["family_id"] == family_id:
                res = dict(user)
                res["allowed_car_ids"] = list(USER_ALLOWED_CARS.get(user["id"], set()))
                members.append(res)
        return members

    def create(self, user_data: dict) -> dict:
        user_id = user_data.get("id") or uuid.uuid4()
        user = {
            "id": user_id,
            "name": user_data["name"],
            "email": user_data["email"],
            "password_hash": user_data["password_hash"],
            "role": user_data.get("role", "member"),
            "family_id": user_data["family_id"],
        }
        USERS_DB[user_id] = user
        if user_id not in USER_ALLOWED_CARS:
            USER_ALLOWED_CARS[user_id] = set()
        
        res = dict(user)
        res["allowed_car_ids"] = list(USER_ALLOWED_CARS[user_id])
        return res

    def update_permissions(self, user_id: UUID, allowed_car_ids: List[UUID]) -> None:
        USER_ALLOWED_CARS[user_id] = set(allowed_car_ids)

    def get_allowed_car_ids(self, user_id: UUID) -> List[UUID]:
        return list(USER_ALLOWED_CARS.get(user_id, set()))


class MemoryFamilyRepository(IFamilyRepository):
    def get_by_id(self, family_id: UUID) -> Optional[dict]:
        family = FAMILIES_DB.get(family_id)
        return dict(family) if family else None

    def get_by_invite_code(self, invite_code: str) -> Optional[dict]:
        normalized = invite_code.strip()
        for family in FAMILIES_DB.values():
            if family["invite_code"] == normalized:
                return dict(family)
        return None

    def create(self, family_data: dict) -> dict:
        family_id = family_data.get("id") or uuid.uuid4()
        family = {
            "id": family_id,
            "name": family_data["name"],
            "invite_code": family_data["invite_code"],
        }
        FAMILIES_DB[family_id] = family
        return dict(family)


class MemoryCarRepository(ICarRepository):
    def get_by_id(self, car_id: UUID) -> Optional[dict]:
        car = CARS_DB.get(car_id)
        return dict(car) if car else None

    def get_by_family(self, family_id: UUID) -> List[dict]:
        cars = []
        for car in CARS_DB.values():
            if car["family_id"] == family_id:
                cars.append(dict(car))
        return cars

    def create(self, car_data: dict) -> dict:
        car_id = car_data.get("id") or uuid.uuid4()
        car = {
            "id": car_id,
            "name": car_data["name"],
            "license_plate": car_data["license_plate"],
            "photo_url": car_data["photo_url"],
            "priority": car_data.get("priority", 1),
            "family_id": car_data["family_id"],
        }
        CARS_DB[car_id] = car
        
        # Managers can drive all cars by default, or let's associate new car to all existing family managers
        # Find all family managers and add this car to their permissions automatically
        for user_id, user in USERS_DB.items():
            if user["family_id"] == car["family_id"] and user["role"] == "manager":
                if user_id not in USER_ALLOWED_CARS:
                    USER_ALLOWED_CARS[user_id] = set()
                USER_ALLOWED_CARS[user_id].add(car_id)
                
        return dict(car)

    def update(self, car_id: UUID, car_data: dict) -> Optional[dict]:
        if car_id not in CARS_DB:
            return None
        car = CARS_DB[car_id]
        car["name"] = car_data.get("name", car["name"])
        car["license_plate"] = car_data.get("license_plate", car["license_plate"])
        car["photo_url"] = car_data.get("photo_url", car["photo_url"])
        car["priority"] = car_data.get("priority", car["priority"])
        return dict(car)

    def delete(self, car_id: UUID) -> bool:
        if car_id in CARS_DB:
            # Delete car
            del CARS_DB[car_id]
            # Delete associated bookings
            bookings_to_delete = [bid for bid, b in BOOKINGS_DB.items() if b["car_id"] == car_id]
            for bid in bookings_to_delete:
                del BOOKINGS_DB[bid]
            # Clean permissions
            for user_id in USER_ALLOWED_CARS:
                USER_ALLOWED_CARS[user_id].discard(car_id)
            return True
        return False


class MemoryBookingRepository(IBookingRepository):
    def _enrich_booking(self, booking: dict) -> dict:
        res = dict(booking)
        
        # Fetch user
        user = USERS_DB.get(booking["user_id"])
        if user:
            res["user"] = {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"]
            }
        else:
            res["user"] = None
            
        # Fetch car
        car = CARS_DB.get(booking["car_id"])
        if car:
            res["car"] = {
                "id": car["id"],
                "name": car["name"],
                "license_plate": car["license_plate"],
                "photo_url": car["photo_url"]
            }
        else:
            res["car"] = None
            
        return res

    def get_by_id(self, booking_id: UUID) -> Optional[dict]:
        booking = BOOKINGS_DB.get(booking_id)
        return self._enrich_booking(booking) if booking else None

    def get_by_family(self, family_id: UUID) -> List[dict]:
        # Filter bookings for cars in this family
        bookings = []
        for booking in BOOKINGS_DB.values():
            car = CARS_DB.get(booking["car_id"])
            if car and car["family_id"] == family_id:
                bookings.append(self._enrich_booking(booking))
        return bookings

    def get_by_user(self, user_id: UUID) -> List[dict]:
        bookings = []
        for booking in BOOKINGS_DB.values():
            if booking["user_id"] == user_id:
                bookings.append(self._enrich_booking(booking))
        return bookings

    def create(self, booking_data: dict) -> dict:
        booking_id = booking_data.get("id") or uuid.uuid4()
        booking = {
            "id": booking_id,
            "car_id": booking_data["car_id"],
            "user_id": booking_data["user_id"],
            "start_time": booking_data["start_time"],
            "end_time": booking_data["end_time"],
            "status": booking_data.get("status", "scheduled"),
            "purpose": booking_data.get("purpose"),
        }
        BOOKINGS_DB[booking_id] = booking
        return self._enrich_booking(booking)

    def update_status(self, booking_id: UUID, status: str) -> Optional[dict]:
        if booking_id not in BOOKINGS_DB:
            return None
        BOOKINGS_DB[booking_id]["status"] = status
        return self._enrich_booking(BOOKINGS_DB[booking_id])

    def get_overlapping_bookings(self, car_id: UUID, start_time: datetime, end_time: datetime) -> List[dict]:
        overlapping = []
        for booking in BOOKINGS_DB.values():
            if booking["car_id"] == car_id and booking["status"] in ["scheduled", "active"]:
                b_start = booking["start_time"]
                b_end = booking["end_time"]
                
                # Make timezone comparison safe
                req_start = start_time
                req_end = end_time
                if b_start.tzinfo is not None and req_start.tzinfo is None:
                    req_start = req_start.replace(tzinfo=b_start.tzinfo)
                if b_end.tzinfo is not None and req_end.tzinfo is None:
                    req_end = req_end.replace(tzinfo=b_end.tzinfo)
                if b_start.tzinfo is None and req_start.tzinfo is not None:
                    req_start = req_start.replace(tzinfo=None)
                if b_end.tzinfo is None and req_end.tzinfo is not None:
                    req_end = req_end.replace(tzinfo=None)
                
                # Overlap condition: start1 < end2 AND end1 > start2
                if b_start < req_end and b_end > req_start:
                    overlapping.append(self._enrich_booking(booking))
        return overlapping
