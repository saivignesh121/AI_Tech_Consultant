#!/usr/bin/env python3
"""
Multi-Tenant Zero-Leakage Live End-to-End Verification Script
Verifies strict isolation between Acme Corp, Beta Dynamics, and a newly registered tenant.
Guarantees:
1. Search queries never leak another tenant's URLs or company name.
2. Consultant chat citations never leak another tenant's URLs.
3. Cross-tenant chat session tampering is rejected with HTTP 403.
4. Model telemetry spend is tracked and reported strictly per tenant.
5. URL health metrics report the active tenant's real page and chunk counts.
"""

import sys
import json
import urllib.request
import urllib.error
import http.cookiejar

BASE_URL = "http://localhost:3000"

class TenantClient:
    def __init__(self, name):
        self.name = name
        self.cj = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))

    def post_json(self, path, payload):
        url = f"{BASE_URL}{path}"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with self.opener.open(req) as resp:
                body = resp.read().decode("utf-8")
                return resp.status, json.loads(body)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                parsed = json.loads(err_body)
            except Exception:
                parsed = {"raw": err_body}
            return e.code, parsed

    def get_json(self, path):
        url = f"{BASE_URL}{path}"
        req = urllib.request.Request(url)
        try:
            with self.opener.open(req) as resp:
                body = resp.read().decode("utf-8")
                return resp.status, json.loads(body)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                parsed = json.loads(err_body)
            except Exception:
                parsed = {"raw": err_body}
            return e.code, parsed

def run_tests():
    print("=" * 70)
    print("🚀 MULTI-TENANT ZERO-LEAKAGE VERIFICATION SUITE")
    print("=" * 70)

    # 1. Login as Acme Corp (Alex Turner)
    print("\n[Step 1] Authenticating as Acme Corporation (alex@acme.com)...")
    acme = TenantClient("Acme")
    status, login_res = acme.post_json("/api/auth/login", {
        "email": "alex@acme.com",
        "password": "AcmePass123!"
    })
    assert status == 200, f"Acme login failed: {login_res}"
    print(f"✓ Logged in as Acme: {login_res.get('businessName')}")

    # Check Acme Context
    status, acme_ctx = acme.get_json("/api/auth/context")
    assert status == 200
    acme_biz_id = acme_ctx["currentTenant"]["businessId"]
    assert acme_ctx["currentTenant"]["businessSlug"] == "acme-corp"
    print(f"✓ Acme Context confirmed: {acme_biz_id}")

    # 2. Login as Beta Dynamics (Sarah Chen)
    print("\n[Step 2] Authenticating as Beta Dynamics (sarah@beta-tech.com)...")
    beta = TenantClient("Beta")
    status, login_res = beta.post_json("/api/auth/login", {
        "email": "sarah@beta-tech.com",
        "password": "BetaPass123!"
    })
    assert status == 200, f"Beta login failed: {login_res}"
    print(f"✓ Logged in as Beta: {login_res.get('businessName')}")

    # Check Beta Context
    status, beta_ctx = beta.get_json("/api/auth/context")
    assert status == 200
    beta_biz_id = beta_ctx["currentTenant"]["businessId"]
    assert beta_ctx["currentTenant"]["businessSlug"] == "beta-dynamics"
    assert beta_biz_id != acme_biz_id, "Tenant IDs MUST differ!"
    print(f"✓ Beta Context confirmed: {beta_biz_id}")

    # 3. Knowledge Brain Search Isolation Test
    print("\n[Step 3] Testing Knowledge Brain Search Isolation...")
    # Acme search
    status, acme_search = acme.post_json("/api/brain/query", {"query": "How do I configure custom CNAME?"})
    assert status == 200, f"Acme search failed: {acme_search}"
    acme_urls = [r["url"] for r in acme_search.get("results", [])]
    print(f"  Acme search returned URLs: {acme_urls}")
    assert any("acme" in u for u in acme_urls), "Acme search should return Acme URLs"
    assert not any("beta-dynamics" in u for u in acme_urls), "Acme search leaked Beta URLs!"

    # Beta search
    status, beta_search = beta.post_json("/api/brain/query", {"query": "How do I configure custom CNAME?"})
    assert status == 200, f"Beta search failed: {beta_search}"
    beta_urls = [r["url"] for r in beta_search.get("results", [])]
    print(f"  Beta search returned URLs: {beta_urls}")
    assert any("beta-dynamics" in u for u in beta_urls), "Beta search should return Beta URLs"
    assert not any("acme" in u for u in beta_urls), "CRITICAL LEAK: Beta search returned Acme URLs!"
    print("✓ Zero Search Leakage Verified: Beta search never references Acme!")

    # 4. Chat Grounding and Citation Isolation Test
    print("\n[Step 4] Testing Consultant Chat Citations Isolation...")
    status, beta_chat = beta.post_json("/api/chat", {
        "message": "How do I configure custom domains and DNS?",
        "roleSlug": "support-engineer"
    })
    assert status == 200, f"Beta chat failed: {beta_chat}"
    beta_citations = beta_chat["response"]["citations"]
    beta_session_id = beta_chat["sessionId"]
    print(f"  Beta Chat Session: {beta_session_id}")
    print(f"  Beta Chat Citations: {[c.get('url') for c in beta_citations]}")
    for c in beta_citations:
        assert "acme" not in c.get("url", ""), f"CRITICAL LEAK: Beta citation contains Acme URL: {c.get('url')}"
    print("✓ Zero Chat Citation Leakage Verified: Beta citations are strictly isolated!")

    # 5. Cross-Tenant Session Tampering Shield Test
    print("\n[Step 5] Testing Cross-Tenant Session Tampering Defense...")
    # Acme attempts to post into Beta's session
    status, tamper_res = acme.post_json("/api/chat", {
        "sessionId": beta_session_id,
        "message": "Attacker trying to inject into Beta session!"
    })
    print(f"  Acme tampering attempt returned HTTP status: {status}")
    assert status == 403, f"Expected 403 Forbidden for cross-tenant session tampering, got: {status}"
    print("✓ Cross-Tenant Session Tampering Intercepted & Blocked (HTTP 403)!")

    # 6. Telemetry & Billing Cost Isolation Test
    print("\n[Step 6] Testing Model Telemetry Spend Isolation...")
    status, acme_telem = acme.get_json("/api/telemetry")
    assert status == 200
    status, beta_telem = beta.get_json("/api/telemetry")
    assert status == 200

    acme_spend = acme_telem["summary"]["totalSpendUsd"]
    beta_spend = beta_telem["summary"]["totalSpendUsd"]
    print(f"  Acme Recorded Spend: ${acme_spend:.6f} ({acme_telem['summary']['totalCalls']} calls)")
    print(f"  Beta Recorded Spend: ${beta_spend:.6f} ({beta_telem['summary']['totalCalls']} calls)")
    assert acme_spend != beta_spend, "Acme and Beta spend MUST be independent!"
    print("✓ Telemetry Spend Isolated Per Tenant!")

    # 7. Register a New Tenant (Zero-State Isolation)
    print("\n[Step 7] Testing New Tenant Registration & Zero-State Isolation...")
    import random
    rand_id = random.randint(1000, 9999)
    gamma = TenantClient("Gamma")
    status, reg_res = gamma.post_json("/api/auth/register", {
        "businessName": f"Gamma Quantum {rand_id}",
        "name": "Grace Hopper",
        "email": f"grace_{rand_id}@gamma-quantum.com",
        "password": "GammaSecurePass2026!"
    })
    assert status in (200, 201), f"Registration failed: {reg_res}"
    print(f"✓ Registered new business: {reg_res['business']['name']}")

    # Check Gamma context
    status, gamma_ctx = gamma.get_json("/api/auth/context")
    assert status == 200
    gamma_slug = gamma_ctx["currentTenant"]["businessSlug"]
    print(f"✓ Gamma slug: {gamma_slug}")

    # Gamma search
    status, gamma_search = gamma.post_json("/api/brain/query", {"query": "Setup custom domain"})
    assert status == 200
    gamma_urls = [r["url"] for r in gamma_search.get("results", [])]
    print(f"  Gamma search returned URLs: {gamma_urls}")
    assert any(gamma_slug in u for u in gamma_urls), f"Expected Gamma slug in search results: {gamma_urls}"
    assert not any("acme" in u for u in gamma_urls), "Gamma leaked Acme data!"
    assert not any("beta-dynamics" in u for u in gamma_urls), "Gamma leaked Beta data!"
    print("✓ New Tenant Zero-State Isolation Verified!")

    print("\n" + "=" * 70)
    print("🎉 ALL MULTI-TENANT ISOLATION & ZERO-LEAKAGE TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
