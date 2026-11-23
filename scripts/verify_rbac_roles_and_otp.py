import requests
import sys

BASE_URL = "http://localhost:3000"

def run_tests():
    session = requests.Session()
    print("=" * 60)
    print("RUNNING END-TO-END OTP & SCREEN CHECKS")
    print("=" * 60)

    # 1. Verify Home Page & Aesthetic
    print("\n[Check 1] Verifying Cyber AI Home Page...")
    r = session.get(f"{BASE_URL}/")
    assert r.status_code == 200, f"Expected 200 for /, got {r.status_code}"
    assert "AI Technologies" in r.text or "AI Consultant" in r.text, "Missing branding in home page"
    print("  ✓ Home page loads with AI Technologies & Consulting branding.")

    # 2. Verify OTP Dispatch
    test_email = "vigneshkolu@gmail.com"
    print(f"\n[Check 2] Testing Real OTP Dispatch to {test_email}...")
    otp_res = session.post(f"{BASE_URL}/api/auth/otp/send", json={
        "email": test_email,
        "purpose": "registration",
        "businessName": "Acme Test Workspace"
    })
    assert otp_res.status_code == 200, f"OTP send failed: {otp_res.text}"
    otp_data = otp_res.json()
    assert otp_data.get("success") is True, f"Expected success=True, got {otp_data}"
    otp_code = otp_data.get("devPreviewOtp")
    print(f"  ✓ OTP API response received: isRealSmtp={otp_data.get('isRealSmtp')}, devPreviewOtp={otp_code}")

    # Verify OTP
    verify_res = session.post(f"{BASE_URL}/api/auth/otp/verify", json={
        "email": test_email,
        "otpCode": otp_code or "123456",
        "purpose": "registration"
    })
    assert verify_res.status_code == 200, f"OTP verify failed: {verify_res.text}"
    print("  ✓ OTP verification succeeded with generated code.")

    # 3. Verify All Web Screens Render HTTP 200
    screens = [
        ("/", "Dashboard Hub"),
        ("/onboarding", "15-Minute Onboarding"),
        ("/knowledge", "Knowledge Brain"),
        ("/chat", "Ask & Teach Chat"),
        ("/settings/roles-prompts", "Role Studio"),
        ("/evals", "Eval Lab"),
        ("/self-improve", "Self-Improve Loop"),
        ("/settings", "Settings & Keys"),
        ("/approvals", "Approvals Inbox"),
        ("/admin", "Platform Fleet Admin"),
        ("/signin", "Sign In"),
        ("/signup", "Sign Up"),
        ("/about", "About Us"),
        ("/services", "Services"),
        ("/contact", "Contact Us"),
    ]

    print("\n[Check 3] Verifying all screens render HTTP 200...")
    for path, name in screens:
        res = session.get(f"{BASE_URL}{path}")
        assert res.status_code == 200, f"Screen {name} ({path}) failed with {res.status_code}"
        print(f"  ✓ {name} ({path}) -> HTTP 200 OK")

    print("\n" + "=" * 60)
    print("ALL 3 CHECKS PASSED SUCCESSFULLY (100%)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
