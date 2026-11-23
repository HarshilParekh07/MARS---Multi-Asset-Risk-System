"""Application configuration settings."""
import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    CACHE_DIR = Path("/tmp/cache")
else:
    CACHE_DIR = BASE_DIR / "cache"

try:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    CACHE_DIR = Path("/tmp/cache")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    APP_NAME: str = "Bloomberg MARS - Risk Analytics Engine"
    API_PREFIX: str = "/api"
    CACHE_EXPIRATION_HOURS: int = 12
    DEFAULT_LOOKBACK: str = "2y"
    DEFAULT_CONFIDENCE: float = 0.99
    DEFAULT_HOLDING_PERIOD: int = 1
    DEFAULT_PORTFOLIO_VALUE: float = 1_000_000.0
    MONTE_CARLO_SIMULATIONS: int = 10_000
    RANDOM_SEED: int = 42
    MAX_TICKERS: int = 20

settings = Settings()
