import random
import string
from uuid import UUID
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from jose import jwt, JWTError
import bcrypt

from app.config import settings
from app.models.schemas import UserCreate, UserLogin, UserResponse, Token
from app.repositories.dependency import get_user_repository, get_family_repository
from app.utils.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Password helpers
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# JWT helpers
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# Dependency for current user
async def get_current_user(
    request: Request, user_repo=Depends(get_user_repository)
) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        # Fallback to header for dev/testing if needed, but prefer cookies
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
        user_id = UUID(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    user = user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


# Helper to generate invite codes
def generate_invite_code() -> str:
    # 6-character alphanumeric code
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(6))


@router.post("/register", response_model=Token)
def register(
    user_create: UserCreate,
    response: Response,
    user_repo=Depends(get_user_repository),
    family_repo=Depends(get_family_repository),
):
    # Check if email is already registered
    existing_user = user_repo.get_by_email(user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered",
        )

    # Validate family setup
    family_id = None
    role = user_create.role

    if user_create.family_name:
        # Check registration token for new families
        if user_create.registration_token != settings.REGISTRATION_TOKEN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid registration token. Creating a new family is restricted.",
            )

        # Create a new family
        invite_code = generate_invite_code()
        # Keep checking for uniqueness (unlikely collisions, but safe)
        while family_repo.get_by_invite_code(invite_code) is not None:
            invite_code = generate_invite_code()

        family = family_repo.create(
            {"name": user_create.family_name, "invite_code": invite_code}
        )
        family_id = family["id"]
        # Creating a family automatically makes you the manager
        role = "manager"

    elif user_create.invite_code:
        # Join existing family
        family = family_repo.get_by_invite_code(user_create.invite_code)
        if not family:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid family invite code",
            )
        family_id = family["id"]

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must specify either family_name (to create a family) or invite_code (to join one)",
        )

    # Create the user
    password_hash = hash_password(user_create.password)
    user_data = {
        "name": user_create.name,
        "email": user_create.email,
        "password_hash": password_hash,
        "role": role,
        "family_id": family_id,
    }

    new_user = user_repo.create(user_data)
    token = create_access_token({"sub": str(new_user["id"])})

    # Set cookie for security
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="none",
        secure=settings.COOKIE_SECURE,
    )

    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    user_login: UserLogin,
    response: Response,
    user_repo=Depends(get_user_repository),
):
    user = user_repo.get_by_email(user_login.email)
    if not user or not verify_password(user_login.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )

    token = create_access_token({"sub": str(user["id"])})

    # Set cookie for security
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="none",
        secure=settings.COOKIE_SECURE,
    )

    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}
