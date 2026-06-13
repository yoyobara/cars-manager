from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.schemas import FamilyMemberResponse, PermissionUpdate, FamilyResponse
from app.routers.auth import get_current_user
from app.routers.cars import require_manager
from app.repositories.dependency import get_user_repository, get_car_repository, get_family_repository

router = APIRouter(prefix="/family", tags=["Family"])


@router.get("/info", response_model=FamilyResponse)
def get_family_info(
    current_user: dict = Depends(get_current_user),
    family_repo = Depends(get_family_repository)
):
    family = family_repo.get_by_id(current_user["family_id"])
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found"
        )
    return family


@router.get("/members", response_model=List[FamilyMemberResponse])
def get_members(
    current_user: dict = Depends(get_current_user),
    user_repo = Depends(get_user_repository)
):
    members = user_repo.get_by_family(current_user["family_id"])
    return members


@router.put("/members/{member_id}/permissions", response_model=FamilyMemberResponse)
def update_member_permissions(
    member_id: UUID,
    permission_update: PermissionUpdate,
    current_user: dict = Depends(require_manager),
    user_repo = Depends(get_user_repository),
    car_repo = Depends(get_car_repository)
):
    # Retrieve the user to verify they belong to the same family
    member = user_repo.get_by_id(member_id)
    if not member or member["family_id"] != current_user["family_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family member not found"
        )
        
    # Verify all allowed cars belong to the family
    family_cars = car_repo.get_by_family(current_user["family_id"])
    family_car_ids = {car["id"] for car in family_cars}
    
    for car_id in permission_update.allowed_car_ids:
        if car_id not in family_car_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Car with ID {car_id} does not belong to this family"
            )
            
    # Update permissions
    user_repo.update_permissions(member_id, permission_update.allowed_car_ids)
    
    # Reload and return updated member
    updated_member = user_repo.get_by_id(member_id)
    return updated_member
