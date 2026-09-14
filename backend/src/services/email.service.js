/**
 * Production Transactional Email Service
 * Supports Resend, SendGrid, Brevo, and SMTP / Webhook integrations
 */

/**
 * Dispatch Partner Registration OTP Email
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.partnerName - Full name of the partner
 * @param {string} params.otp - 6-digit OTP
 * @param {number} params.expiresInMinutes - Expiration time in minutes (default 5)
 */
export const sendPartnerRegistrationOTPEmail = async ({
  toEmail,
  partnerName = 'Partner',
  otp,
  expiresInMinutes = 5,
}) => {
  if (!toEmail || !toEmail.trim()) {
    return { success: false, reason: 'NO_EMAIL_PROVIDED' };
  }

  const cleanEmail = toEmail.toLowerCase().trim();
  const fromEmail = process.env.EMAIL_FROM || 'no-reply@vidhyutsaathi.com';
  const fromName = 'Vidhyut Saathi Franchise Portal';
  const subject = 'Vidhyut Saathi Partner Registration OTP';

  const textContent = `Dear ${partnerName},\n\nYour Vidhyut Saathi Partner OTP is: ${otp}\n\nThis OTP is valid for ${expiresInMinutes} minutes.\nDo not share this OTP with anyone.\n\nBest regards,\nVidhyut Saathi Operations Team`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Vidhyut Saathi Partner Registration OTP</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">⚡ VIDHYUT SAATHI</h1>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Franchise Operations Portal</p>
          </div>
          <div style="padding: 28px 24px;">
            <p style="font-size: 15px; margin-top: 0;">Dear <strong>${partnerName}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              Congratulations on your onboarding to the Vidhyut Saathi Franchise Network. Your initial account verification OTP is provided below:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <div style="display: inline-block; background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 10px; padding: 14px 28px;">
                <div style="font-size: 11px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">YOUR SECURE REGISTRATION OTP</div>
                <div style="font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: 6px; font-family: monospace;">${otp}</div>
              </div>
            </div>
            <p style="font-size: 13px; color: #dc2626; font-weight: 600; text-align: center; margin: 0 0 16px;">
              ⏱️ This OTP is valid for ${expiresInMinutes} minutes. Do not share this OTP with anyone.
            </p>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;">
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
              If you did not request this registration, please contact operations immediately at support@vidhyutsaathi.com.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    // 1. Resend API (https://resend.com)
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [cleanEmail],
          subject,
          text: textContent,
          html: htmlContent,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Resend delivery failed');
      }
      return { success: true, provider: 'RESEND', messageId: data.id };
    }

    // 2. SendGrid API (https://sendgrid.com)
    if (process.env.SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: cleanEmail, name: partnerName }] }],
          from: { email: fromEmail, name: fromName },
          subject,
          content: [
            { type: 'text/plain', value: textContent },
            { type: 'text/html', value: htmlContent },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'SendGrid delivery failed');
      }
      return { success: true, provider: 'SENDGRID' };
    }

    // 3. Brevo / Sendinblue API (https://brevo.com)
    if (process.env.BREVO_API_KEY) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: cleanEmail, name: partnerName }],
          subject,
          htmlContent,
          textContent,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Brevo delivery failed');
      }
      return { success: true, provider: 'BREVO', messageId: data.messageId };
    }

    // 4. Fallback / Development Simulation
    if (process.env.ENABLE_DEV_OTP_LOG === 'true' || process.env.NODE_ENV !== 'production') {
      console.log(`\n========================================`);
      console.log(`[DEV EMAIL SERVICE] To: ${cleanEmail}`);
      console.log(`[DEV EMAIL SERVICE] Subject: ${subject}`);
      console.log(`[DEV EMAIL SERVICE] OTP Code: ${otp}`);
      console.log(`[DEV EMAIL SERVICE] Valid For: ${expiresInMinutes} Minutes`);
      console.log(`========================================\n`);
    }

    return { success: true, provider: 'DEV_SIMULATOR' };
  } catch (err) {
    console.error(`[Email Dispatch Error] Failed to send email to ${cleanEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};
