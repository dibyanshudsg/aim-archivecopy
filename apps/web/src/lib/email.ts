import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY in environment variables');
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

export function getFromEmail(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) return configured;
  return 'All India Magazine Archive <onboarding@resend.dev>';
}

export interface SendPasswordResetEmailOptions {
  to: string;
  adminName: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({ to, adminName, resetUrl }: SendPasswordResetEmailOptions): Promise<{ id: string }> {
  const client = getResendClient();
  const from = getFromEmail();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Administrator Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d261e; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #faf7f2; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; border: 1px solid #f3e6cf; box-shadow: 0 4px 20px rgba(138, 92, 35, 0.06); overflow: hidden;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; background: linear-gradient(180deg, #fffdf9 0%, #fff7ec 100%); border-bottom: 1px solid #f8eedc;">
              <div style="font-size: 26px; line-height: 1; margin-bottom: 10px;">🔥</div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #7a2e19; letter-spacing: 0.02em;">
                All India Magazine Archive
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #9c733f; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">
                Administrator Security
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 36px 28px 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 17px; font-weight: 600; color: #1f1b16;">
                Reset your administrator password
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4a4034;">
                Hello <strong>${escapeHtml(adminName)}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4a4034;">
                We received a request to reset the password for your administrator account at the All India Magazine Archive. Click the button below to set a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #d95e26 0%, #be4118 100%);">
                    <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px; letter-spacing: 0.02em;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #6b5d4e;">
                This link will expire in <strong>30 minutes</strong> and can only be used once.
              </p>

              <!-- Link Fallback -->
              <div style="margin: 24px 0 0 0; padding: 14px; background-color: #fbf9f5; border-radius: 10px; border: 1px solid #f0e6d6;">
                <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #8c7355; text-transform: uppercase; letter-spacing: 0.05em;">
                  Button not working? Copy and paste this link:
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #b45309; word-break: break-all;">
                  <a href="${resetUrl}" style="color: #b45309; text-decoration: underline;">${resetUrl}</a>
                </p>
              </div>

              <!-- Security Notice -->
              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #8a7b6a; border-top: 1px solid #f5ede0; pt: 16px; padding-top: 16px;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged and your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px 36px; text-align: center; background-color: #faf7f2; border-top: 1px solid #f3e6cf;">
              <p style="margin: 0; font-size: 12px; color: #8a7b6a; font-weight: 500;">
                Sri Aurobindo Society — All India Magazine Digital Archive
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #aa9c8d;">
                Pondicherry, India
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const { data, error } = await client.emails.send({
    from,
    to,
    subject: 'Reset your All India Magazine Archive admin password',
    html,
  });

  if (error || !data) {
    throw new Error(error?.message || 'Failed to send password reset email via Resend');
  }

  return { id: data.id };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
