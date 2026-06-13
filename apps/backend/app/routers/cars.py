from uuid import UUID
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.schemas import CarCreate, CarResponse
from app.routers.auth import get_current_user
from app.repositories.dependency import get_car_repository, get_booking_repository

router = APIRouter(prefix="/cars", tags=["Cars"])


def require_manager(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only family managers can perform this action"
        )
    return current_user


@router.get("/", response_model=List[CarResponse])
def get_cars(
    current_user: dict = Depends(get_current_user),
    car_repo = Depends(get_car_repository)
):
    return car_repo.get_by_family(current_user["family_id"])


@router.post("/", response_model=CarResponse, status_code=status.HTTP_201_CREATED)
def create_car(
    car_create: CarCreate,
    current_user: dict = Depends(require_manager),
    car_repo = Depends(get_car_repository)
):
    car_data = {
        "name": car_create.name,
        "license_plate": car_create.license_plate,
        "photo_url": car_create.photo_url,
        "priority": car_create.priority,
        "family_id": current_user["family_id"]
    }
    return car_repo.create(car_data)


@router.put("/{car_id}", response_model=CarResponse)
def update_car(
    car_id: UUID,
    car_create: CarCreate,
    current_user: dict = Depends(require_manager),
    car_repo = Depends(get_car_repository)
):
    car = car_repo.get_by_id(car_id)
    if not car or car["family_id"] != current_user["family_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found in your family"
        )
        
    car_data = {
        "name": car_create.name,
        "license_plate": car_create.license_plate,
        "photo_url": car_create.photo_url,
        "priority": car_create.priority
    }
    return car_repo.update(car_id, car_data)


@router.delete("/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car(
    car_id: UUID,
    current_user: dict = Depends(require_manager),
    car_repo = Depends(get_car_repository)
):
    car = car_repo.get_by_id(car_id)
    if not car or car["family_id"] != current_user["family_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found in your family"
        )
        
    car_repo.delete(car_id)
    return None


@router.get("/available", response_model=List[CarResponse])
def get_available_cars(
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user),
    car_repo = Depends(get_car_repository),
    booking_repo = Depends(get_booking_repository)
):
    # If no window is specified, assume immediate use for next 2 hours
    if not start_time:
        start_time = datetime.utcnow()
    if not end_time:
        end_time = start_time + timedelta(hours=2)
        
    if start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time must be before end_time"
        )
        
    # Get all cars in the family
    family_cars = car_repo.get_by_family(current_user["family_id"])
    
    # Filter to only cars the user is allowed to drive
    allowed_ids = set(current_user.get("allowed_car_ids", []))
    allowed_cars = [car for car in family_cars if car["id"] in allowed_ids]
    
    # Check availability (no overlapping bookings)
    available_cars = []
    for car in allowed_cars:
        overlaps = booking_repo.get_overlapping_bookings(car["id"], start_time, end_time)
        if not overlaps:
            available_cars.append(car)
            
    # Sort by priority descending (highest first), then by name
    available_cars.sort(key=lambda x: (-x.get("priority", 1), x.get("name", "")))
    
    return available_cars
