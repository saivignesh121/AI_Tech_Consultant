import requests
import sys

BASE_URL = "http://localhost:3000"

def run_tests():
    session = requests.Session()
    print("=" * 60)
    print("RUNNING END-TO-END RBAC, WORKFLOW & OTP VERIFICATION")
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

    # 3. Test Role Switching & RBAC for All 4 Roles
    # --- Role 1: Owner ---
    print("\n[Check 3] Testing Role: Business Owner (owner)...")
    r_role = session.post(f"{BASE_URL}/api/auth/switch-role", json={"role": "owner"})
    assert r_role.status_code == 200, f"Switch to owner failed: {r_role.text}"
    
    ctx = session.get(f"{BASE_URL}/api/auth/context").json()
    assert ctx["currentTenant"]["userRole"] == "owner", f"Expected owner, got {ctx['currentTenant']['userRole']}"
    
    # Owner can access connections
    conn_res = session.get(f"{BASE_URL}/api/settings/connections")
    assert conn_res.status_code == 200, f"Owner connections access failed: {conn_res.status_code}"
    
    # Owner can access approvals
    appr_res = session.get(f"{BASE_URL}/api/approvals")
    assert appr_res.status_code == 200, f"Owner approvals access failed: {appr_res.status_code}"
    print("  ✓ Owner has full access to settings/keys and approvals inbox.")

    # --- Role 2: Team Member ---
    print("\n[Check 4] Testing Role: Team Member (team)...")
    r_role = session.post(f"{BASE_URL}/api/auth/switch-role", json={"role": "team"})
    assert r_role.status_code == 200
    ctx = session.get(f"{BASE_URL}/api/auth/context").json()
    assert ctx["currentTenant"]["userRole"] == "team", f"Expected team, got {ctx['currentTenant']['userRole']}"
    
    # Team member can access chat sessions
    chat_res = session.get(f"{BASE_URL}/api/chat/sessions")
    assert chat_res.status_code == 200, f"Team chat access failed: {chat_res.status_code}"
    print("  ✓ Team member has access to Ask & Teach Chat.")

    # --- Role 3: Expert / Approver ---
    print("\n[Check 5] Testing Role: Expert / Approver (expert)...")
    r_role = session.post(f"{BASE_URL}/api/auth/switch-role", json={"role": "expert"})
    assert r_role.status_code == 200
    ctx = session.get(f"{BASE_URL}/api/auth/context").json()
    assert ctx["currentTenant"]["userRole"] == "expert", f"Expected expert, got {ctx['currentTenant']['userRole']}"
    
    # Expert can access approvals API
    appr_res = session.get(f"{BASE_URL}/api/approvals")
    assert appr_res.status_code == 200, f"Expert approvals access failed: {appr_res.status_code}"
    appr_data = appr_res.json()
    assert "escalatedTasks" in appr_data and "pendingLessons" in appr_data
    print("  ✓ Expert has access to Approvals Inbox.")

    # --- Role 4: Platform Admin ---
    print("\n[Check 6] Testing Role: Platform Admin (admin)...")
    r_role = session.post(f"{BASE_URL}/api/auth/switch-role", json={"role": "admin"})
    assert r_role.status_code == 200
    ctx = session.get(f"{BASE_URL}/api/auth/context").json()
    assert ctx["currentTenant"]["userRole"] == "admin", f"Expected admin, got {ctx['currentTenant']['userRole']}"
    
    # Platform Admin can access admin fleet API
    admin_res = session.get(f"{BASE_URL}/api/admin/businesses")
    assert admin_res.status_code == 200, f"Admin fleet access failed: {admin_res.status_code}"
    admin_data = admin_res.json()
    assert "fleetSummary" in admin_data and "businesses" in admin_data
    print(f"  ✓ Platform Admin has access to Fleet Overview ({len(admin_data['businesses'])} businesses).")

    # Non-admin access to admin endpoint check
    session_non_admin = requests.Session()
    session_non_admin.post(f"{BASE_URL}/api/auth/switch-role", json={"role": "team"})
    denied_res = session_non_admin.get(f"{BASE_URL}/api/admin/businesses")
    assert denied_res.status_code == 403, f"Expected 403 for non-admin on /api/admin/businesses, got {denied_res.status_code}"
    print("  ✓ Non-admin correctly denied access (HTTP 403) to Platform Admin API.")

    # Reset back to owner
    session.post(f"{BASE_URL}/api/auth/switch-role", json={"role": "owner"})

    # 4. Verify All Web Screens Render HTTP 200
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

    print("\n[Check 7] Verifying all screens render HTTP 200...")
    for path, name in screens:
        res = session.get(f"{BASE_URL}{path}")
        assert res.status_code == 200, f"Screen {name} ({path}) failed with {res.status_code}"
        print(f"  ✓ {name} ({path}) -> HTTP 200 OK")

    print("\n" + "=" * 60)
    print("ALL 7 CHECKS PASSED SUCCESSFULLY (100%)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
