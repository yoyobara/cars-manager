from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_TYPE: str = "postgres"  # 'memory' or 'postgres'
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/cars_manager"
    JWT_SECRET: str = "change-me-in-production-at-least-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REGISTRATION_TOKEN: str = "secret-family-token"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:4200"]
    COOKIE_SECURE: bool = False  # Set to True in production (requires HTTPS)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
