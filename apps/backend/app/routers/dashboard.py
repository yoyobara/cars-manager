from datetime import datetime
from fastapi import APIRouter, Depends
from typing import List

from app.models.schemas import DashboardResponse, CarStatusResponse, BookingResponse
from app.routers.auth import get_current_user
from app.repositories.dependency import get_car_repository, get_booking_repository, get_user_repository

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def is_booking_active(booking: dict, now: datetime) -> bool:
    if booking["status"] == "active":
        return True
    if booking["status"] == "scheduled":
        b_start = booking["start_time"]
        b_end = booking["end_time"]
        
        # Normalize timezone
        chk_now = now
        if b_start.tzinfo is not None:
            chk_now = datetime.now(b_start.tzinfo)
        else:
            # Make chk_now timezone-naive
            chk_now = chk_now.replace(tzinfo=None)
            
        return b_start <= chk_now <= b_end
    return False


def is_booking_upcoming(booking: dict, now: datetime) -> bool:
    if booking["status"] not in ["scheduled", "active"]:
        return False
        
    b_end = booking["end_time"]
    chk_now = now
    if b_end.tzinfo is not None:
        chk_now = datetime.now(b_end.tzinfo)
    else:
        chk_now = chk_now.replace(tzinfo=None)
        
    return b_end > chk_now


@router.get("/", response_model=DashboardResponse)
def get_dashboard(
    current_user: dict = Depends(get_current_user),
    car_repo = Depends(get_car_repository),
    booking_repo = Depends(get_booking_repository),
    user_repo = Depends(get_user_repository)
):
    now = datetime.utcnow()
    family_id = current_user["family_id"]
    
    # 1. Fetch all family cars, bookings, and users
    cars = car_repo.get_by_family(family_id)
    bookings = booking_repo.get_by_family(family_id)
    members = user_repo.get_by_family(family_id)
    
    # 2. Identify upcoming bookings
    upcoming_bookings = [
        b for b in bookings if is_booking_upcoming(b, now)
    ]
    # Sort upcoming bookings by start_time ascending
    upcoming_bookings.sort(key=lambda x: x["start_time"])
    
    # 3. Compile car statuses
    car_statuses = []
    for car in cars:
        # Check if there is an active booking on this car
        current_booking = None
        car_bookings = [b for b in bookings if b["car_id"] == car["id"]]
        for b in car_bookings:
            if is_booking_active(b, now):
                current_booking = b
                break
                
        # Status
        status_str = "in_use" if current_booking else "available"
        
        # Find drivers who are allowed to drive this car
        allowed_drivers = []
        for member in members:
            if car["id"] in member.get("allowed_car_ids", []):
                allowed_drivers.append({
                    "id": member["id"],
                    "name": member["name"],
                    "email": member["email"]
                })
                
        car_statuses.append({
            "car": car,
            "status": status_str,
            "current_booking": current_booking,
            "allowed_drivers": allowed_drivers
        })
        
    # Sort cars by status (available first) and priority (highest first)
    car_statuses.sort(key=lambda x: (x["status"] == "in_use", -x["car"].get("priority", 1), x["car"]["name"]))
    
    return {
        "cars": car_statuses,
        "upcoming_bookings": upcoming_bookings
    }
