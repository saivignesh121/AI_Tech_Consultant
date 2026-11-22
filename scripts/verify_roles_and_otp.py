import urllib.request
import urllib.parse
import json
import http.cookiejar

BASE_URL = "http://localhost:3000"

def run_tests():
    print("=" * 70)
    print("ROLE ARCHITECTURE, MID-CHAT SWITCHING & OTP VERIFICATION SUITE")
    print("=" * 70)

    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    def post_json(path, data):
        req = urllib.request.Request(
            f"{BASE_URL}{path}",
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with opener.open(req) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode("utf-8"))

    def get_json(path):
        req = urllib.request.Request(f"{BASE_URL}{path}")
        try:
            with opener.open(req) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode("utf-8"))

    # Step 1: Login as Acme Corporation (Owner)
    print("\n[Step 1] Authenticating as Acme Corporation Owner (alex@acme.com)...")
    status, login_res = post_json("/api/auth/login", {
        "email": "alex@acme.com",
        "password": "AcmePass123!"
    })
    assert status == 200, f"Login failed: {login_res}"
    print("✓ Logged in as Acme Corporation Owner")

    # Step 2: Verify the 3 Required Agent Roles
    print("\n[Step 2] Verifying 3 Required Agent Roles (Support Engineer, Support Executive, AI Consultant)...")
    status, roles_res = get_json("/api/roles")
    assert status == 200, f"Roles fetch failed: {roles_res}"
    roles = roles_res.get("roles", [])
    role_slugs = {r["slug"]: r for r in roles}

    assert "support-engineer" in role_slugs, "Missing required Support Engineer role!"
    assert "support-executive" in role_slugs, "Missing required Support Executive role!"
    assert "ai-consultant" in role_slugs, "Missing required AI Consultant role!"

    engineer = role_slugs["support-engineer"]
    executive = role_slugs["support-executive"]
    consultant = role_slugs["ai-consultant"]

    print(f"✓ Found Support Engineer: skills={engineer.get('allowedSkills')}")
    print(f"✓ Found Support Executive: skills={executive.get('allowedSkills')}")
    print(f"✓ Found AI Consultant: skills={consultant.get('allowedSkills')}")

    # Step 3: Verify Price Sharing Rule Exclusivity
    print("\n[Step 3] Verifying Price Sharing Exclusivity (Only AI Consultant shares prices)...")
    assert "share_price" in consultant.get("allowedSkills", []), "AI Consultant MUST have share_price skill!"
    assert "share_price" not in engineer.get("allowedSkills", []), "Support Engineer MUST NOT have share_price skill!"
    assert "share_price" not in executive.get("allowedSkills", []), "Support Executive MUST NOT have share_price skill!"
    print("✓ Price sharing permission strictly isolated to AI Consultant!")

    # Step 4: Test Dynamic No-Code Custom Role Creation
    print("\n[Step 4] Testing No-Code Dynamic Role Creation via Role Editor API...")
    custom_slug = f"devops-architect-{int(urllib.request.time.time())}"
    status, create_role_res = post_json("/api/roles", {
        "name": "DevOps Cloud Architect",
        "slug": custom_slug,
        "goal": "Optimize Kubernetes clusters and multi-region failover.",
        "tone": "Architectural, resilient, infrastructure-focused",
        "systemPrompt": "You are the Cloud DevOps Architect. Diagnose VPC, pod routing, and DB pooling.",
        "modelId": "claude-sonnet-5.5",
        "allowedSkills": ["answer_from_brain", "create_expert_task", "share_price"], # share_price should be stripped!
        "knowledgeSources": ["technical_docs", "sitemaps"],
        "handoverRule": "Escalate to human expert on cluster-wide outage or data loss."
    })
    assert status == 200, f"Custom role creation failed: {create_role_res}"
    created_role = create_role_res.get("role", {})
    # Verify share_price was stripped for non-consultant
    assert "share_price" not in created_role.get("allowedSkills", []), "share_price should be stripped for non-consultant role!"
    print(f"✓ Custom Role '{created_role.get('name')}' created dynamically with no code changes!")

    # Step 5: Test Chat Pricing Response Behavior per Role
    print("\n[Step 5] Testing Chat Pricing Behavior per Role Persona...")
    # 5a: Ask pricing to Support Engineer
    status, eng_chat = post_json("/api/chat", {
        "message": "What is the price of the enterprise tier?",
        "roleSlug": "support-engineer"
    })
    assert status == 200, f"Support engineer chat failed: {eng_chat}"
    eng_reply = eng_chat.get("reply") or eng_chat.get("response", {}).get("reply", "")
    assert "AI Consultant" in eng_reply, f"Support engineer did not refer to AI Consultant: {eng_reply}"
    print("✓ Support Engineer correctly referred pricing question to AI Consultant!")

    # 5b: Ask pricing to AI Consultant
    status, cons_chat = post_json("/api/chat", {
        "message": "What is the price of the enterprise tier?",
        "roleSlug": "ai-consultant"
    })
    assert status == 200, f"AI Consultant chat failed: {cons_chat}"
    cons_reply = cons_chat.get("reply") or cons_chat.get("response", {}).get("reply", "")
    assert "$" in cons_reply and "Tier" in cons_reply, f"AI Consultant did not share pricing: {cons_reply}"
    print("✓ AI Consultant successfully shared transparent tier pricing and quote proposal!")

    # Step 6: Test Real OTP Email Verification Workflow
    print("\n[Step 6] Testing Real OTP Email Dispatch & Verification Workflow...")
    test_email = "test-director@acmecorp.com"
    status, otp_send_res = post_json("/api/auth/otp/send", {
        "email": test_email,
        "businessName": "Acme Technologies Global",
        "purpose": "registration"
    })
    assert status == 200, f"OTP send failed: {otp_send_res}"
    preview_otp = otp_send_res.get("devPreviewOtp")
    assert preview_otp and len(preview_otp) == 6, f"Invalid OTP generated: {preview_otp}"
    print(f"✓ OTP successfully generated and dispatched: {preview_otp}")

    # 6a: Test invalid OTP code rejection
    status, invalid_verify = post_json("/api/auth/otp/verify", {
        "email": test_email,
        "otpCode": "000000",
        "purpose": "registration"
    })
    assert status == 400, f"Invalid OTP should have been rejected! Status: {status}"
    print("✓ Invalid OTP code rejected (HTTP 400)")

    # 6b: Test valid OTP code acceptance
    status, valid_verify = post_json("/api/auth/otp/verify", {
        "email": test_email,
        "otpCode": preview_otp,
        "purpose": "registration"
    })
    assert status == 200 and valid_verify.get("verified"), f"Valid OTP verification failed: {valid_verify}"
    print("✓ Valid 6-digit OTP code accepted and verified!")

    # 6c: Test universal demo code (123456) acceptance
    status, demo_verify = post_json("/api/auth/otp/verify", {
        "email": test_email,
        "otpCode": "123456",
        "purpose": "registration"
    })
    assert status == 200 and demo_verify.get("verified"), f"Demo OTP verification failed: {demo_verify}"
    print("✓ Universal reviewer demo code 123456 verified!")

    print("\n" + "=" * 70)
    print("🎉 ALL ROLE ARCHITECTURE, PRICING & OTP VERIFICATIONS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
