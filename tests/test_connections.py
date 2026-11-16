"""
test_connections.py
-------------------
Pytest suite for Task 1.2: AES-GCM encryption, key masking, and log/HTML safety.

All tests are pure unit tests – no database or async fixtures are needed.

Run with:
    pytest tests/test_connections.py -v
"""

from __future__ import annotations

import base64
import logging

import pytest

from feature_1_workspace.connections_crypto import (
    decrypt_value,
    derive_aes_key,
    encrypt_value,
    mask_value,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# pytestmark removed  # asyncio_mode="auto" in pyproject.toml / pytest.ini


def _tamper(encrypted: str) -> str:
    """Flip the last byte of the base64url-decoded blob and re-encode.

    This invalidates the GCM authentication tag without changing length.
    """
    padding = 4 - len(encrypted) % 4
    padded = encrypted + ("=" * (padding if padding != 4 else 0))
    blob = bytearray(base64.urlsafe_b64decode(padded))
    blob[-1] ^= 0xFF  # corrupt the last byte of the GCM tag
    return base64.urlsafe_b64encode(bytes(blob)).rstrip(b"=").decode()


# ---------------------------------------------------------------------------
# TestAESGCMEncryption
# ---------------------------------------------------------------------------


class TestAESGCMEncryption:
    """Tests for AES-256-GCM encrypt/decrypt and HKDF key derivation."""

    def test_encrypt_returns_string(self) -> None:
        """encrypt_value must return a plain str, not bytes."""
        result = encrypt_value("sk-ant-test")
        assert isinstance(result, str), "encrypt_value should return str"

    @pytest.mark.parametrize(
        "value",
        [
            "sk-ant-api123",
            "AIzaSyXYZ",
            "sk-or-openrouter",
            "http://localhost:11434",
            "oauth-token-abc",
        ],
    )
    def test_decrypt_roundtrip(self, value: str) -> None:
        """Encrypting then decrypting must recover the original plaintext."""
        assert decrypt_value(encrypt_value(value)) == value

    def test_encrypt_produces_unique_ciphertexts(self) -> None:
        """Two calls on the same input must produce different ciphertexts (random nonce)."""
        key = "sk-ant-same-key-every-time"
        ct1 = encrypt_value(key)
        ct2 = encrypt_value(key)
        assert ct1 != ct2, "ciphertexts must differ due to random nonce"

    def test_encrypted_does_not_contain_plaintext(self) -> None:
        """The base64 ciphertext must not contain the plaintext literally."""
        secret = "sk-ant-secret"
        assert secret not in encrypt_value(secret)

    def test_wrong_key_raises(self) -> None:
        """A tampered ciphertext must raise an exception on decryption."""
        encrypted = encrypt_value("sensitive-data")
        corrupted = _tamper(encrypted)
        with pytest.raises((ValueError, Exception)):
            decrypt_value(corrupted)

    def test_key_derivation_deterministic(self) -> None:
        """derive_aes_key must return the same bytes for the same input every call."""
        secret = "same-secret"
        assert derive_aes_key(secret) == derive_aes_key(secret)

    def test_key_derivation_length(self) -> None:
        """HKDF derivation must always produce exactly 32 bytes (AES-256)."""
        assert len(derive_aes_key("any")) == 32


# ---------------------------------------------------------------------------
# TestKeyMasking
# ---------------------------------------------------------------------------


_MASKING_HIDE_CASES: list[tuple[str, str, str]] = [
    ("sk-ant-api03-longkeyvalue8a2f", "claude", "sk-ant-api03-longkeyvalue8a2f"),
    ("AIzaSyABCDEFGHIJKLMN1234", "gemini", "AIzaSyABCDEFGHIJKLMN1234"),
    ("sk-or-v1-longkeyhere1234", "openrouter", "sk-or-v1-longkeyhere1234"),
    ("ya29.some-long-token", "gmail", "ya29.some-long-token"),
    ("abcdefghijklmnop", "unknown", "abcdefghijklmnop"),
]


class TestKeyMasking:
    """Tests for mask_value across all supported providers."""

    def test_claude_masking(self) -> None:
        """Claude keys: 'sk-ant-...' prefix + last 4 chars."""
        result = mask_value("sk-ant-api03-longkeyvalue8a2f", "claude")
        assert result == "sk-ant-...8a2f"

    def test_gemini_masking(self) -> None:
        """Gemini keys: 'AIzaSy...' prefix + last 4 chars."""
        key = "AIzaSyABCDEFGHIJKLMN1234"
        result = mask_value(key, "gemini")
        assert result.startswith("AIzaSy...")
        assert result.endswith(key[-4:])

    def test_openrouter_masking(self) -> None:
        """OpenRouter keys: 'sk-or-...' prefix + last 4 chars."""
        key = "sk-or-v1-longkeyhere1234"
        result = mask_value(key, "openrouter")
        assert result.startswith("sk-or-...")
        assert result.endswith(key[-4:])

    def test_local_masking(self) -> None:
        """Local Ollama/LM-Studio URLs are not sensitive; returned as-is."""
        url = "http://localhost:11434"
        assert mask_value(url, "local") == url

    def test_gmail_masking(self) -> None:
        """Gmail OAuth tokens must be masked as a connectivity confirmation."""
        result = mask_value("ya29.some-long-token", "gmail")
        assert result == "OAuth2 ✓ Connected"

    def test_generic_masking(self) -> None:
        """Unknown provider falls back to first-4 + '...' + last-4 format."""
        result = mask_value("abcdefghijklmnop", "unknown")
        assert result == "abcd...mnop"

    @pytest.mark.parametrize(
        "plaintext,provider,full_key",
        _MASKING_HIDE_CASES,
    )
    def test_masking_hides_full_key(
        self, plaintext: str, provider: str, full_key: str
    ) -> None:
        """The full plaintext must NOT appear verbatim in the masked output."""
        masked = mask_value(plaintext, provider)
        # 'local' provider intentionally returns the URL unchanged – skip it
        if provider == "local":
            pytest.skip("local provider returns plaintext by design")
        assert full_key not in masked, (
            f"mask_value({provider!r}) leaked full plaintext into: {masked!r}"
        )


# ---------------------------------------------------------------------------
# TestNoPlainterextInLogs
# ---------------------------------------------------------------------------


class TestNoPlainterextInLogs:
    """Verify that no plaintext secrets appear in captured log output."""

    _SECRET = "SUPERSECRET_KEY_DO_NOT_LOG"

    def test_encrypt_no_log_emission(self, caplog: pytest.LogCaptureFixture) -> None:
        """encrypt_value must not log the plaintext at any log level."""
        with caplog.at_level(logging.DEBUG):
            encrypt_value(self._SECRET)
        for record in caplog.records:
            assert self._SECRET not in record.getMessage(), (
                f"Plaintext found in log [{record.levelname}]: {record.getMessage()!r}"
            )

    def test_decrypt_no_log_emission(self, caplog: pytest.LogCaptureFixture) -> None:
        """decrypt_value must not log the plaintext at any log level."""
        encrypted = encrypt_value(self._SECRET)
        with caplog.at_level(logging.DEBUG):
            decrypt_value(encrypted)
        for record in caplog.records:
            assert self._SECRET not in record.getMessage(), (
                f"Plaintext found in log [{record.levelname}]: {record.getMessage()!r}"
            )

    def test_mask_value_no_log(self, caplog: pytest.LogCaptureFixture) -> None:
        """mask_value must not log the full plaintext at any log level."""
        secret = "full-secret-api-key"
        with caplog.at_level(logging.DEBUG):
            mask_value(secret, "claude")
        for record in caplog.records:
            assert secret not in record.getMessage(), (
                f"Plaintext found in log [{record.levelname}]: {record.getMessage()!r}"
            )


# ---------------------------------------------------------------------------
# TestHTMLSafety
# ---------------------------------------------------------------------------


_HTML_PROVIDER_CASES: list[tuple[str, str]] = [
    ("sk-ant-api03-realistickeyfullvalue0001", "claude"),
    ("AIzaSyRealisticGeminiKeyABCDEFGH1234", "gemini"),
    ("sk-or-v1-realisticopenrouterkey00001234", "openrouter"),
    ("ya29.realisticoauth2tokenforGmail0001", "gmail"),
    ("abcdefghij_genericprovider_key0001", "unknown"),
]


class TestHTMLSafety:
    """Verify that neither encrypted nor masked values leak full plaintext into HTML."""

    def test_encrypted_value_safe_in_html(self) -> None:
        """An encrypted value embedded in an HTML attribute must not expose plaintext."""
        plaintext = "sk-ant-secret"
        encrypted = encrypt_value(plaintext)
        html = f"<input value='{encrypted}'>"
        assert plaintext not in html

    def test_masked_value_in_html(self) -> None:
        """A masked value embedded in an HTML element must not expose plaintext."""
        plaintext = "sk-ant-apikey12349999"
        masked = mask_value(plaintext, "claude")
        html = f"<span>{masked}</span>"
        assert plaintext not in html

    @pytest.mark.parametrize("plaintext,provider", _HTML_PROVIDER_CASES)
    def test_full_key_never_in_html_response(
        self, plaintext: str, provider: str
    ) -> None:
        """mask_value output for a realistic key must never contain the full plaintext,
        regardless of provider (local is excluded from this check by design)."""
        if provider == "local":
            pytest.skip("local provider returns plaintext URL by design")
        masked = mask_value(plaintext, provider)
        html = f"<div data-key='{masked}'>{masked}</div>"
        assert plaintext not in html, (
            f"Full key leaked for provider={provider!r}: "
            f"plaintext={plaintext!r} found in HTML: {html!r}"
        )
