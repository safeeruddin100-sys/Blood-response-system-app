"""
Application configuration loaded from environment variables.
Uses pydantic-settings for type-safe config management.
"""

from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Ensure .env from backend directory is loaded
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    load_dotenv()


class Settings(BaseSettings):
    """
    App settings — loaded from .env file or environment variables.
    Defaults are set for local development (SQLite, console SMS, etc.)
    """

    # Database — change this one string to switch from SQLite to PostgreSQL
    DATABASE_URL: str = "sqlite:///./blood_response.db"
    MONGO_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "blood_response_db"

    # JWT
    SECRET_KEY: str = "CHANGE-ME-TO-A-RANDOM-SECRET-IN-PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Donor cooldown after confirmed donation (days)
    COOLDOWN_DAYS: int = 90

    # Nearby donor search radius (km)
    DEFAULT_SEARCH_RADIUS_KM: float = 25.0

    # OTP
    OTP_LENGTH: int = 6

    # SMS / Email provider — "console" logs to stdout, "email" sends via Gmail SMTP, "twilio" for SMS
    SMS_PROVIDER: str = "console"

    # SMTP / Gmail settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    OTP_EMAIL_FROM: str = ""

    # App info
    APP_NAME: str = "Blood Response System"
    DEBUG: bool = True

    model_config = {
        "env_file": str(ENV_FILE) if ENV_FILE.exists() else ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


# Singleton settings instance
settings = Settings()
