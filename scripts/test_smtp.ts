import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/["'\s]/g, "");

  console.log("Testing SMTP with User:", user, "Pass length:", pass?.length);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    console.log("✓ SUCCESS: SMTP connection & Gmail App Password verified successfully!");
    const info = await transporter.sendMail({
      from: `"AI Technologies & Consulting" <${user}>`,
      to: "saivigneshkolu6@gmail.com",
      subject: "Test Real OTP - AI Technologies & Consulting",
      text: "Hello Sai Vignesh! Your real OTP email connection is active and working!",
    });
    console.log("✓ EMAIL DISPATCHED! Message ID:", info.messageId);
  } catch (err: any) {
    console.error("❌ SMTP Error:", err.message);
  }
}

main();
