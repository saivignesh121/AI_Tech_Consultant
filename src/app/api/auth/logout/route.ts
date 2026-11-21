import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session_token")?.value;
    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
      redirectUrl: "/signin",
    });

    response.cookies.delete("session_token");
    response.cookies.delete("active_tenant_slug");

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Logout failed", details: String(error) },
      { status: 500 }
    );
  }
}
