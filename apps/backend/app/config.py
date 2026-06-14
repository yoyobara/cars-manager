from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_TYPE: str = "postgres"  # 'memory' or 'postgres'
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/cars_manager"
    JWT_SECRET: str = "super-secret-family-key-123456"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"


settings = Settings()
