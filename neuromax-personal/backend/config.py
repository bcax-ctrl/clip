"""Configuration for NeuroMax Personal (single-user). Reads from environment."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # AI
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: str = ""

    # Market data
    coingecko_api_key: str = ""
    alpha_vantage_api_key: str = ""  # used by reused forex/stocks feeds (macro agent)
    news_api_key: str = ""  # used by the sentiment agent
    binance_api_key: str = ""
    binance_secret: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # Base chain
    base_rpc: str = "https://mainnet.base.org"
    smart_contract_address: str = ""
    wallet_private_key: str = ""

    # Auth / crypto
    jwt_secret: str = "change-me-personal-use"
    jwt_expires_hours: int = 720  # 30 days for personal use
    # 32-byte urlsafe base64 Fernet key for encrypting stored API keys.
    encryption_key: str = ""

    # Safety: auto-execution of on-chain trades is OFF unless explicitly enabled.
    auto_trade_enabled: bool = False
    max_slippage_bps: int = 100  # 1.0% default slippage cap
    redis_url: str = "redis://localhost:6379"
    request_timeout: float = 20.0
    max_tokens: int = 4096


@lru_cache
def get_settings() -> Settings:
    return Settings()
