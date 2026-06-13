from uuid import UUID
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.schemas import BookingCreate, BookingResponse, BookingStatusUpdate
from app.routers.auth import get_current_user
from app.repositories.dependency import get_booking_repository, get_car_repository

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.get("/", response_model=List[BookingResponse])
def get_bookings(
    current_user: dict = Depends(get_current_user),
    booking_repo = Depends(get_booking_repository)
):
    return booking_repo.get_by_family(current_user["family_id"])


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_create: BookingCreate,
    current_user: dict = Depends(get_current_user),
    car_repo = Depends(get_car_repository),
    booking_repo = Depends(get_booking_repository)
):
    car = car_repo.get_by_id(booking_create.car_id)
    if not car or car["family_id"] != current_user["family_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found in your family"
        )
        
    # Check if user has permission to drive this car
    allowed_car_ids = current_user.get("allowed_car_ids", [])
    if car["id"] not in allowed_car_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to drive this car"
        )
        
    # Check time ranges
    if booking_create.start_time >= booking_create.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time"
        )
        
    # Check for overlaps
    overlaps = booking_repo.get_overlapping_bookings(
        booking_create.car_id,
        booking_create.start_time,
        booking_create.end_time
    )
    if overlaps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Car is already booked during this time slot"
        )
        
    # Determine initial status
    # If starting now or in the past, set to "active". Otherwise "scheduled".
    now = datetime.utcnow()
    # Make now timezone-aware if the input datetime is timezone-aware
    if booking_create.start_time.tzinfo is not None:
        now = datetime.now(booking_create.start_time.tzinfo)
        
    # If start time is within 5 minutes of now (or in the past), it's active immediately
    if booking_create.start_time <= now + timedelta(minutes=5):
        initial_status = "active"
    else:
        initial_status = "scheduled"
        
    booking_data = {
        "car_id": booking_create.car_id,
        "user_id": current_user["id"],
        "start_time": booking_create.start_time,
        "end_time": booking_create.end_time,
        "status": initial_status,
        "purpose": booking_create.purpose
    }
    
    return booking_repo.create(booking_data)


@router.put("/{booking_id}/status", response_model=BookingResponse)
def update_booking_status(
    booking_id: UUID,
    status_update: BookingStatusUpdate,
    current_user: dict = Depends(get_current_user),
    booking_repo = Depends(get_booking_repository),
    car_repo = Depends(get_car_repository)
):
    booking = booking_repo.get_by_id(booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
        
    # Check if booking is in the same family
    car = car_repo.get_by_id(booking["car_id"])
    if not car or car["family_id"] != current_user["family_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found in your family"
        )
        
    # Permissions: only owner or manager can update status
    is_owner = booking["user_id"] == current_user["id"]
    is_manager = current_user["role"] == "manager"
    if not (is_owner or is_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update this booking"
        )
        
    new_status = status_update.status.lower()
    if new_status not in ["scheduled", "active", "completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
        
    # Specific checks on status transition
    if new_status == "active" and booking["status"] == "scheduled":
        # Activating booking. Ensure no other booking is currently active on the car.
        now = datetime.utcnow()
        if booking["start_time"].tzinfo is not None:
            now = datetime.now(booking["start_time"].tzinfo)
            
        overlaps = booking_repo.get_overlapping_bookings(booking["car_id"], now, now + timedelta(minutes=5))
        active_overlaps = [o for o in overlaps if o["status"] == "active" and o["id"] != booking_id]
        if active_overlaps:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot activate: another active booking exists for this car"
            )
            
    elif new_status == "completed" and booking["status"] == "active":
        # Returning car. We can shorten the end_time to now so the car is available immediately.
        # But we must update the DB. Since `update_status` only changes status, let's write custom logic in the repository if we want,
        # or we can just change the status to "completed" and let end_time stand.
        # Actually, in Memory and Postgres repository, `update_status` only changes status. Let's just update the status to "completed".
        pass
        
    return booking_repo.update_status(booking_id, new_status)
