from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class IUserRepository(ABC):
    @abstractmethod
    def get_by_id(self, user_id: UUID) -> Optional[dict]:
        pass

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[dict]:
        pass

    @abstractmethod
    def get_by_family(self, family_id: UUID) -> List[dict]:
        pass

    @abstractmethod
    def create(self, user_data: dict) -> dict:
        pass

    @abstractmethod
    def update_permissions(self, user_id: UUID, allowed_car_ids: List[UUID]) -> None:
        pass

    @abstractmethod
    def get_allowed_car_ids(self, user_id: UUID) -> List[UUID]:
        pass


class IFamilyRepository(ABC):
    @abstractmethod
    def get_by_id(self, family_id: UUID) -> Optional[dict]:
        pass

    @abstractmethod
    def get_by_invite_code(self, invite_code: str) -> Optional[dict]:
        pass

    @abstractmethod
    def create(self, family_data: dict) -> dict:
        pass


class ICarRepository(ABC):
    @abstractmethod
    def get_by_id(self, car_id: UUID) -> Optional[dict]:
        pass

    @abstractmethod
    def get_by_family(self, family_id: UUID) -> List[dict]:
        pass

    @abstractmethod
    def create(self, car_data: dict) -> dict:
        pass

    @abstractmethod
    def update(self, car_id: UUID, car_data: dict) -> Optional[dict]:
        pass

    @abstractmethod
    def delete(self, car_id: UUID) -> bool:
        pass


class IBookingRepository(ABC):
    @abstractmethod
    def get_by_id(self, booking_id: UUID) -> Optional[dict]:
        pass

    @abstractmethod
    def get_by_family(self, family_id: UUID) -> List[dict]:
        pass

    @abstractmethod
    def get_by_user(self, user_id: UUID) -> List[dict]:
        pass

    @abstractmethod
    def create(self, booking_data: dict) -> dict:
        pass

    @abstractmethod
    def update_status(self, booking_id: UUID, status: str) -> Optional[dict]:
        pass

    @abstractmethod
    def get_overlapping_bookings(self, car_id: UUID, start_time: datetime, end_time: datetime) -> List[dict]:
        pass
