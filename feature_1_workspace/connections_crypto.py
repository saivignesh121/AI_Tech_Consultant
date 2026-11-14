"""
connections_crypto.py
---------------------
AES-GCM encryption/decryption of API keys and OAuth tokens, plus key masking.

Security contract:
  - Plaintext keys are NEVER logged at any level.
  - APP_SECRET_KEY is derived via HKDF-SHA256 before use with AES-GCM.
  - If APP_SECRET_KEY is absent or too short on import, a fresh 32-byte key is
    generated, persisted to the project-root .env file, and used for the
    lifetime of the process.
"""

from __future__ import annotations

import base64
import logging
import os
import secrets
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

# ---------------------------------------------------------------------------
# Internal constants
# ---------------------------------------------------------------------------

_ENV_VAR = "APP_SECRET_KEY"
_MIN_KEY_BYTES = 32
_NONCE_BYTES = 12
_AES_KEY_BYTES = 32
_PROJECT_ROOT = Path(__file__).resolve().parent.parent  # /…/AI_Tech_Consultant
_DOTENV_PATH = _PROJECT_ROOT / ".env"

_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level key bootstrap
# ---------------------------------------------------------------------------


def _load_or_generate_secret() -> str:
    """Return the hex-encoded APP_SECRET_KEY, generating + persisting one if needed."""
    raw = os.getenv(_ENV_VAR, "")
    try:
        raw_bytes = bytes.fromhex(raw) if raw else b""
    except ValueError:
        # Not valid hex – treat as a raw UTF-8 passphrase; encode and check length
        raw_bytes = raw.encode()

    if len(raw_bytes) >= _MIN_KEY_BYTES:
        return raw_bytes.hex()

    # Generate a fresh key
    new_key_bytes = secrets.token_bytes(_MIN_KEY_BYTES)
    new_key_hex = new_key_bytes.hex()

    # Persist to .env  (append if file exists, create otherwise)
    env_line = f"{_ENV_VAR}={new_key_hex}\n"
    if _DOTENV_PATH.exists():
        # Only append if the key is not already present
        content = _DOTENV_PATH.read_text()
        if _ENV_VAR not in content:
            with _DOTENV_PATH.open("a") as fh:
                fh.write(env_line)
    else:
        _DOTENV_PATH.write_text(env_line)

    # Inject into the current process environment so subsequent calls find it
    os.environ[_ENV_VAR] = new_key_hex
    _logger.info("Generated and stored new APP_SECRET_KEY in %s", _DOTENV_PATH)
    return new_key_hex


# Eagerly load on import – fail fast if the crypto stack is broken
_SECRET_KEY_HEX: str = _load_or_generate_secret()


# ---------------------------------------------------------------------------
# Key derivation
# ---------------------------------------------------------------------------


def derive_aes_key(secret: str) -> bytes:
    """Derive a 32-byte AES key from *secret* via HKDF-SHA256.

    Parameters
    ----------
    secret:
        Hex-encoded APP_SECRET_KEY (or any high-entropy string).

    Returns
    -------
    bytes
        32-byte derived key suitable for AES-256-GCM.
    """
    try:
        ikm = bytes.fromhex(secret)
    except ValueError:
        ikm = secret.encode()

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=_AES_KEY_BYTES,
        salt=None,
        info=b"connections_crypto v1",
    )
    return hkdf.derive(ikm)


# ---------------------------------------------------------------------------
# Encryption / Decryption
# ---------------------------------------------------------------------------


def encrypt_value(plaintext: str) -> str:
    """Encrypt *plaintext* with AES-256-GCM.

    Returns
    -------
    str
        URL-safe base64(nonce || ciphertext) with no padding.
    """
    key = derive_aes_key(_SECRET_KEY_HEX)
    aesgcm = AESGCM(key)
    nonce = secrets.token_bytes(_NONCE_BYTES)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    blob = nonce + ciphertext
    return base64.urlsafe_b64encode(blob).rstrip(b"=").decode()


def decrypt_value(encrypted: str) -> str:
    """Decrypt a value produced by :func:`encrypt_value`.

    Parameters
    ----------
    encrypted:
        URL-safe base64-encoded nonce + ciphertext (padding optional).

    Returns
    -------
    str
        The original plaintext.

    Raises
    ------
    ValueError
        If the blob is too short, the tag is invalid, or decoding fails.
    """
    # Re-add stripped padding
    padding = 4 - len(encrypted) % 4
    if padding != 4:
        encrypted += "=" * padding

    try:
        blob = base64.urlsafe_b64decode(encrypted)
    except Exception as exc:
        raise ValueError("encrypted value is not valid base64url") from exc

    if len(blob) <= _NONCE_BYTES:
        raise ValueError(
            f"encrypted blob too short: {len(blob)} bytes (need > {_NONCE_BYTES})"
        )

    nonce, ciphertext = blob[:_NONCE_BYTES], blob[_NONCE_BYTES:]
    key = derive_aes_key(_SECRET_KEY_HEX)
    aesgcm = AESGCM(key)
    try:
        plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, None)
    except Exception as exc:
        raise ValueError("decryption failed: invalid key or corrupted data") from exc

    return plaintext_bytes.decode()


# ---------------------------------------------------------------------------
# Key masking
# ---------------------------------------------------------------------------


def mask_value(plaintext: str, provider: str) -> str:
    """Return a safely masked representation of *plaintext* for display.

    Plaintext is never included verbatim in the returned string (except for
    ``"local"`` provider URLs which are not considered sensitive).

    Parameters
    ----------
    plaintext:
        The raw secret or token value.
    provider:
        One of ``"claude"``, ``"gemini"``, ``"openrouter"``, ``"local"``,
        ``"gmail"``, or any other string for the generic fallback.

    Returns
    -------
    str
        A masked string safe for display in logs, UIs, and API responses.
    """
    if not plaintext:
        return ""

    provider_lower = provider.strip().lower()

    if provider_lower == "claude":
        return f"sk-ant-...{plaintext[-4:]}"

    if provider_lower == "gemini":
        return f"AIzaSy...{plaintext[-4:]}"

    if provider_lower == "openrouter":
        return f"sk-or-...{plaintext[-4:]}"

    if provider_lower == "local":
        # Local Ollama / LM-Studio URLs are not secret
        return plaintext

    if provider_lower == "gmail":
        # OAuth2 token – just confirm connectivity
        return "OAuth2 ✓ Connected" if plaintext else ""

    # Generic fallback: first 4 + "..." + last 4
    if len(plaintext) <= 8:
        return "..." + plaintext[-4:]
    return f"{plaintext[:4]}...{plaintext[-4:]}"
