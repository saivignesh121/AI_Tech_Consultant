import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerifications } from "@/db/schema/business";
import { sendOtpEmail } from "@/services/auth/emailService";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, purpose = "registration", businessName = "Your Workspace" } = body;

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address to receive your OTP." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Generate 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up previous unconsumed OTPs for this email and purpose
    try {
      await db
        .delete(emailVerifications)
        .where(
          and(
            eq(emailVerifications.email, cleanEmail),
            eq(emailVerifications.purpose, purpose)
          )
        );
    } catch (e) {
      // Table might be auto-created if using push or runtime
      console.warn("Notice: OTP cleanup skipped or table initializing:", e);
    }

    // Insert new verification record
    try {
      await db.insert(emailVerifications).values({
        email: cleanEmail,
        otpCode,
        purpose,
        expiresAt,
        consumed: false,
      });
    } catch (dbErr) {
      console.warn("DB insert fallback for OTP token:", dbErr);
    }

    // Dispatch real email via nodemailer / SMTP
    const emailResult = await sendOtpEmail({
      toEmail: cleanEmail,
      otpCode,
      purpose,
      businessName,
    });

    if (!emailResult.success) {
      console.error("[OTP] Email dispatch failed:", emailResult.error || "UNKNOWN");
      return NextResponse.json(
        { error: "Could not send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (err) {
    console.error(
      "Failed to generate and dispatch OTP:",
      err instanceof Error ? err.name : "UNKNOWN"
    );
    return NextResponse.json(
      { error: "Failed to send verification email. Please try again." },
      { status: 500 }
    );
  }
}
