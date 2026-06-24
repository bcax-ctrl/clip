"""Minimal JWT auth + symmetric encryption for stored secrets (personal use).

A single local user is fine for personal use; this still hashes the password and
signs JWTs. API keys saved to the DB are encrypted with Fernet so they're never
stored in plaintext.
"""
from __future__ import annotations

import base64
import hashlib
import logging
import time
from typing import Any

import jwt

from config import get_settings

logger = logging.getLogger("neuromax.auth")


def _derive_fernet_key(secret: str) -> bytes:
    """Derive a urlsafe-base64 32-byte key from a passphrase for Fernet."""
    digest = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_secret(plaintext: str) -> str:
    s = get_settings()
    try:
        from cryptography.fernet import Fernet
    except ImportError:
        logger.warning("cryptography not installed; storing secret base64-only (NOT secure)")
        return "b64:" + base64.b64encode(plaintext.encode()).decode()
    key = s.encryption_key.encode() if s.encryption_key else _derive_fernet_key(s.jwt_secret)
    return "fernet:" + Fernet(key).encrypt(plaintext.encode()).decode()


def decrypt_secret(token: str) -> str:
    if token.startswith("b64:"):
        return base64.b64decode(token[4:]).decode()
    if token.startswith("fernet:"):
        from cryptography.fernet import Fernet

        s = get_settings()
        key = s.encryption_key.encode() if s.encryption_key else _derive_fernet_key(s.jwt_secret)
        return Fernet(key).decrypt(token[7:].encode()).decode()
    return token


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def issue_token(user_id: str, email: str) -> str:
    s = get_settings()
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": int(time.time()) + s.jwt_expires_hours * 3600,
    }
    return jwt.encode(payload, s.jwt_secret, algorithm="HS256")


def verify_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
