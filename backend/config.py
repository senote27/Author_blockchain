# config.py
from pydantic_settings import BaseSettings
from typing import Optional, List
from functools import lru_cache

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Book Marketplace"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./bookmarket.db"
    
    # Authentication
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # IPFS
    IPFS_API_URL: str = "http://127.0.0.1:5001"
    IPFS_GATEWAY_URL: str = "http://127.0.0.1:8080"
    
    # Blockchain
    WEB3_PROVIDER_URI: str = "http://127.0.0.1:8545"  # Ganache default
    CONTRACT_ADDRESS: Optional[str] = None  # Set after contract deployment
    CONTRACT_ABI_PATH: str = "./contracts/BookMarket.json"
    
    # Author Royalty
    AUTHOR_ROYALTY_PERCENTAGE: float = 70.0
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite default
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()