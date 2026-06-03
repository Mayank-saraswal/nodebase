import nodemailer from "nodemailer"
import crypto from "crypto"

// Generate a cryptographically secure token
export function generateVerifyToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Token expiry: 24 hours from now
export function getTokenExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + 24)
  return expiry
}

// Build the verification URL
export function buildVerifyUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nodebase.tech"
  return `${baseUrl}/verify-email?token=${token}`
}

// Send verification email
export async function sendVerificationEmail(
  toEmail: string,
  userName: string,
  token: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const verifyUrl = buildVerifyUrl(token)

  await transporter.sendMail({
    from: `"Nodebase" <${process.env.SMTP_FROM || "noreply@nodebase.tech"}>`,
    to: toEmail,
    subject: "Verify your Nodebase account",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin:0;padding:0;background:#111;font-family:Inter,sans-serif;">
          <div style="max-width:520px;margin:40px auto;background:#1a1a1a;border-radius:12px;
                      border:1px solid #2a2a2a;overflow:hidden;">
            <!-- Header -->
            <div style="background:#F97316;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                Nodebase
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">
                Workflow Automation for India
              </p>
            </div>

            <!-- Body -->
            <div style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#f5f5f5;font-size:20px;font-weight:600;">
                Verify your email address
              </h2>
              <p style="margin:0 0 24px;color:#999;font-size:15px;line-height:1.6;">
                Hi ${escapeHtml(userName)}, click the button below to verify your email and
                activate your Nodebase account. This link expires in 24 hours.
              </p>

              <a href="${verifyUrl}"
                 style="display:inline-block;background:#F97316;color:#fff;
                        text-decoration:none;padding:14px 32px;border-radius:8px;
                        font-size:15px;font-weight:600;letter-spacing:0.2px;">
                Verify Email Address
              </a>

              <p style="margin:24px 0 0;color:#666;font-size:13px;line-height:1.5;">
                If the button doesn't work, copy this URL into your browser:<br>
                <a href="${verifyUrl}" style="color:#F97316;word-break:break-all;">
                  ${verifyUrl}
                </a>
              </p>

              <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">

              <p style="margin:0;color:#555;font-size:12px;line-height:1.5;">
                If you didn't create a Nodebase account, you can safely ignore this email.
                This link will expire in 24 hours.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Verify your Nodebase account

Hi ${escapeHtml(userName)}, click the link below to verify your email address:
${verifyUrl}

This link expires in 24 hours.

If you didn't create a Nodebase account, ignore this email.
    `.trim(),
  })
}

// Send a resend verification email (same template, different subject line)
export async function sendResendVerificationEmail(
  toEmail: string,
  userName: string,
  token: string
): Promise<void> {
  const verifyUrl = buildVerifyUrl(token)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  
  await transporter.sendMail({
    from: `"Nodebase" <${process.env.SMTP_FROM || "noreply@nodebase.tech"}>`,
    to: toEmail,
    subject: "New verification link for Nodebase",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin:0;padding:0;background:#111;font-family:Inter,sans-serif;">
          <div style="max-width:520px;margin:40px auto;background:#1a1a1a;border-radius:12px;
                      border:1px solid #2a2a2a;overflow:hidden;">
            <!-- Header -->
            <div style="background:#F97316;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                Nodebase
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">
                Workflow Automation for India
              </p>
            </div>

            <!-- Body -->
            <div style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#f5f5f5;font-size:20px;font-weight:600;">
                Verify your email address
              </h2>
              <p style="margin:0 0 24px;color:#999;font-size:15px;line-height:1.6;">
                Hi ${escapeHtml(userName)}, click the button below to verify your email and
                activate your Nodebase account. This link expires in 24 hours.
              </p>

              <a href="${verifyUrl}"
                 style="display:inline-block;background:#F97316;color:#fff;
                        text-decoration:none;padding:14px 32px;border-radius:8px;
                        font-size:15px;font-weight:600;letter-spacing:0.2px;">
                Verify Email Address
              </a>

              <p style="margin:24px 0 0;color:#666;font-size:13px;line-height:1.5;">
                If the button doesn't work, copy this URL into your browser:<br>
                <a href="${verifyUrl}" style="color:#F97316;word-break:break-all;">
                  ${verifyUrl}
                </a>
              </p>

              <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">

              <p style="margin:0;color:#555;font-size:12px;line-height:1.5;">
                If you didn't request a new link, you can safely ignore this email.
                This link will expire in 24 hours.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Verify your Nodebase account

Hi ${escapeHtml(userName)}, click the link below to verify your email address:
${verifyUrl}

This link expires in 24 hours.

If you didn't request a new link, ignore this email.
    `.trim(),
  })
}
