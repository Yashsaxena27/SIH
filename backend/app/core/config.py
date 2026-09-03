from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Union
import json

class Settings(BaseSettings):
    PROJECT_NAME: str = "Urban Intelligence Network API"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://sih_user:sih_password@localhost:5433/sih_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    JWT_SECRET: str = "supersecretkey_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week for demo
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    parsed = json.loads(v_trimmed)
                    if isinstance(parsed, list):
                        origins = [str(item).strip() for item in parsed if str(item).strip()]
                        if "http://localhost:5174" not in origins:
                            origins.append("http://localhost:5174")
                        return origins
                except Exception:
                    pass
            origins = [x.strip() for x in v.split(",") if x.strip()]
            if "http://localhost:5174" not in origins:
                origins.append("http://localhost:5174")
            return origins
        elif isinstance(v, list):
            origins = [str(item).strip() for item in v if str(item).strip()]
            if "http://localhost:5174" not in origins:
                origins.append("http://localhost:5174")
            return origins
        return v

    @property
    def CORS_ORIGINS_STR(self) -> str:
        if isinstance(self.CORS_ORIGINS, list):
            return ",".join(self.CORS_ORIGINS)
        return str(self.CORS_ORIGINS)

    # Application flags
    DEMO_MODE: bool = True
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
