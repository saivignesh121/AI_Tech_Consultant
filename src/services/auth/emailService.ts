import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
dotenv.config();

function errorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code?: unknown }).code ?? "UNKNOWN");
  }
  return err instanceof Error ? err.name : "UNKNOWN";
}

export interface SmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  secure?: boolean;
  from?: string;
}

export interface SendOtpParams {
  toEmail: string;
  otpCode: string;
  purpose?: string;
  businessName?: string;
  customSmtp?: SmtpConfig;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  isRealSmtp?: boolean;
  error?: string;
}

export async function sendOtpEmail(params: SendOtpParams): Promise<SendEmailResult> {
  const { toEmail, otpCode, purpose = "registration", businessName = "Your Workspace", customSmtp } = params;

  // 1. Resolve SMTP configuration (custom > env > defaults)
  const smtpHost = customSmtp?.host || process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = customSmtp?.port || parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = (customSmtp?.user || process.env.SMTP_USER || "").trim() || undefined;
  const rawPass = customSmtp?.pass || process.env.SMTP_PASS;
  const smtpPass = rawPass ? rawPass.replace(/["'\s]/g, "") : undefined;
  const smtpSecure = customSmtp?.secure ?? (process.env.SMTP_SECURE === "true" || smtpPort === 465);
  
  let smtpFrom = customSmtp?.from || process.env.SMTP_FROM;
  if (!smtpFrom || smtpFrom.includes("no-reply@aitechconsults.com") || smtpFrom.includes("aitechconsults.com")) {
    smtpFrom = smtpUser ? `"AI Technologies & Consulting" <${smtpUser}>` : '"AI Technologies & Consulting" <no-reply@aitechconsults.com>';
  }

  const subject = "Your verification code";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #050B18; color: #F3F4F6; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background-color: #071329; border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0, 240, 255, 0.1); }
        .logo { display: inline-block; width: 36px; height: 36px; line-height: 36px; background-color: #000; color: #fff; border: 1px solid #374151; border-radius: 8px; text-align: center; font-size: 20px; font-weight: bold; font-family: serif; }
        .title { color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 16px; margin-bottom: 8px; }
        .subtitle { color: #9CA3AF; font-size: 13px; line-height: 1.5; margin-bottom: 24px; }
        .otp-box { background-color: #040F26; border: 1px dashed #00F0FF; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #00F0FF; font-family: monospace; }
        .otp-expiry { color: #6B7280; font-size: 11px; margin-top: 8px; font-family: monospace; }
        .notice { font-size: 12px; color: #9CA3AF; line-height: 1.5; border-top: 1px solid #1F2937; padding-top: 16px; }
        .footer { font-size: 11px; color: #4B5563; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">α</div>
        <div class="title">Verify Your Corporate Workspace</div>
        <div class="subtitle">
          You are verifying your account for <strong>${businessName}</strong> on the AI Technologies &amp; Consulting Multi-Tenant SaaS platform.
        </div>
        <div class="otp-box">
          <div class="otp-code">${otpCode}</div>
          <div class="otp-expiry">Valid for 10 minutes &bull; Single-use security token</div>
        </div>
        <div class="notice">
          If you did not request this verification code, please disregard this email. Never share your OTP with anyone.
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} AI Technologies &amp; Consulting &bull; Strict Tenant Isolation Protocol
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Your AI Technologies & Consulting Verification Code: ${otpCode}\n\nValid for 10 minutes for ${businessName}.\nIf you did not request this code, please ignore this email.`;

  // 2. Dispatch using configured real SMTP credentials if provided
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[Email Dispatch] Real SMTP OTP dispatched to ${toEmail}: messageId=${info.messageId}`);
      return { success: true, messageId: info.messageId, isRealSmtp: true };
    } catch (err) {
      console.error("[Email Dispatch] SMTP send failed:", errorCode(err));
      return { success: false, error: "SMTP_SEND_FAILED" };
    }
  }

  // 3. Ethereal is allowed only for explicit local development opt-in.
  if (process.env.NODE_ENV === "development" && process.env.ALLOW_TEST_EMAIL === "true") {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await testTransporter.sendMail({
        from: smtpFrom,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        isRealSmtp: false,
      };
    } catch (etherealErr) {
      console.error("[Email Dispatch] Ethereal send failed:", errorCode(etherealErr));
      return { success: false, error: "TEST_EMAIL_SEND_FAILED" };
    }
  }

  // No real transport configured (or a real send failed outside development).
  return { success: false, error: "EMAIL_NOT_CONFIGURED" };
}
