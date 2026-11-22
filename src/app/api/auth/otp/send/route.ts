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

    return NextResponse.json({
      success: true,
      message: emailResult.isRealSmtp
        ? `Real OTP email successfully dispatched to ${cleanEmail}. Please check your inbox and spam folder.`
        : `Verification code generated for ${cleanEmail}. Code: ${otpCode}`,
      emailResult,
      previewUrl: emailResult.previewUrl || null,
      isRealSmtp: Boolean(emailResult.isRealSmtp),
      // For instant local testing / dev environment preview
      devPreviewOtp: otpCode,
    });
  } catch (err) {
    console.error("Failed to generate and dispatch OTP:", err);
    return NextResponse.json(
      { error: "Failed to send verification email. Please try again." },
      { status: 500 }
    );
  }
}
