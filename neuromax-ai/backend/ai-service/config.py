"""Centralised configuration for the NeuroMax AI service.

All values are read from the environment (see ``.env.example``). Using
``pydantic-settings`` gives us validation and typed access throughout the app.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: str = ""  # optional GPT-4 fallback

    # Market data
    coingecko_api_key: str = ""
    alpha_vantage_api_key: str = ""
    news_api_key: str = ""
    binance_api_key: str = ""
    binance_secret: str = ""

    # Datastores
    database_url: str = "postgresql://neuromax:neuromax@postgres:5432/neuromax"
    redis_url: str = "redis://redis:6379"

    # Behaviour
    request_timeout: float = 20.0
    max_tokens: int = 4096


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton so we parse the environment only once."""
    return Settings()
