import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const localMode = cookieStore.get("local_only_mode")?.value === "true";
  return NextResponse.json({ localOnlyMode: localMode });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enabled } = body;
    const isEnabled = Boolean(enabled);

    const response = NextResponse.json({
      success: true,
      localOnlyMode: isEnabled,
      message: isEnabled
        ? "Local-Only Mode enabled. Cloud APIs bypassed; using Ollama (localhost:11434)."
        : "Local-Only Mode disabled. 14-model cloud routing active.",
    });

    response.cookies.set("local_only_mode", isEnabled ? "true" : "false", {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to toggle local mode", details: String(error) },
      { status: 500 }
    );
  }
}
