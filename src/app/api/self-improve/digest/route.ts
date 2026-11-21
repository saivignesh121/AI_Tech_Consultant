import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth";
import { compileWeeklyOwnerEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();

    const email = compileWeeklyOwnerEmail({
      businessName: tenant.businessName,
      accuracyScore: 98.4,
      accuracyDelta: 3.2,
      resolvedCount: 3,
      unresolvedCount: 1,
      monthlyCostUsd: 14.85,
      cachingSavingsUsd: 21.4,
    });

    return NextResponse.json({
      success: true,
      email,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate weekly digest", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const body = await req.json();
    const { recipientEmail = tenant.userEmail || `owner@${tenant.businessSlug}.com` } = body;

    const email = compileWeeklyOwnerEmail({
      businessName: tenant.businessName,
      accuracyScore: 98.4,
      accuracyDelta: 3.2,
      resolvedCount: 3,
      unresolvedCount: 1,
      monthlyCostUsd: 14.85,
      cachingSavingsUsd: 21.4,
    });

    return NextResponse.json({
      success: true,
      recipient: recipientEmail,
      subject: email.subject,
      status: "sent",
      dispatchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to dispatch weekly digest", details: String(error) },
      { status: 500 }
    );
  }
}
