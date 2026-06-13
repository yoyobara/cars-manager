from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Optional
from uuid import UUID

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[UUID] = None

# --- Family Schemas ---
class FamilyBase(BaseModel):
    name: str

class FamilyCreate(FamilyBase):
    pass

class FamilyResponse(FamilyBase):
    id: UUID
    invite_code: str

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    role: str = "member"  # "manager" or "member"
    family_name: Optional[str] = None  # If creating a new family
    invite_code: Optional[str] = None  # If joining an existing family

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: UUID
    role: str
    family_id: UUID
    allowed_car_ids: List[UUID] = []

    class Config:
        from_attributes = True

class FamilyMemberResponse(UserBase):
    id: UUID
    role: str
    allowed_car_ids: List[UUID] = []

    class Config:
        from_attributes = True

# --- Car Schemas ---
class CarBase(BaseModel):
    name: str
    license_plate: str
    photo_url: str
    priority: int = Field(default=1, ge=1, le=5)  # 1 to 5

class CarCreate(CarBase):
    pass

class CarResponse(CarBase):
    id: UUID
    family_id: UUID

    class Config:
        from_attributes = True

# --- Booking Schemas ---
class BookingBase(BaseModel):
    car_id: UUID
    start_time: datetime
    end_time: datetime
    purpose: Optional[str] = None

class BookingCreate(BookingBase):
    pass

class BookingStatusUpdate(BaseModel):
    status: str  # "scheduled", "active", "completed", "cancelled"

# Nested response representations for rich display
class UserMinResponse(BaseModel):
    id: UUID
    name: str
    email: str

class CarMinResponse(BaseModel):
    id: UUID
    name: str
    license_plate: str
    photo_url: str

class BookingResponse(BaseModel):
    id: UUID
    car_id: UUID
    user_id: UUID
    start_time: datetime
    end_time: datetime
    status: str
    purpose: Optional[str] = None
    user: Optional[UserMinResponse] = None
    car: Optional[CarMinResponse] = None

    class Config:
        from_attributes = True

# --- Dashboard Schemas ---
class CarStatusResponse(BaseModel):
    car: CarResponse
    status: str  # "available" or "in_use"
    current_booking: Optional[BookingResponse] = None
    allowed_drivers: List[UserMinResponse] = []

class DashboardResponse(BaseModel):
    cars: List[CarStatusResponse]
    upcoming_bookings: List[BookingResponse]

# --- Permission Schemas ---
class PermissionUpdate(BaseModel):
    allowed_car_ids: List[UUID]
