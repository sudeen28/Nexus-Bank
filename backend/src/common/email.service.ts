import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../common/logger';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: { user: config.email.user, pass: config.email.pass },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  try {
    if (config.env === 'development') {
      logger.info(`📧 [DEV] Email to ${opts.to}: ${opts.subject}`);
      return;
    }
    await transporter.sendMail({ from: config.email.from, ...opts });
    logger.info(`Email sent to ${opts.to}`);
  } catch (err) {
    logger.error('Email send failed:', err);
  }
}

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: 'Segoe UI', sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #0a2540, #1a3a6b); padding: 32px; text-align: center; }
  .header h1 { color: #c8a45a; margin: 0; font-size: 28px; letter-spacing: 1px; }
  .header p { color: rgba(255,255,255,0.6); margin: 4px 0 0; font-size: 13px; }
  .body { padding: 40px 36px; color: #333; line-height: 1.7; }
  .btn { display: inline-block; background: #0a2540; color: white !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
  .code { background: #f0f4ff; border: 1px solid #c5d3f0; border-radius: 8px; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #0a2540; margin: 20px 0; }
  .footer { background: #f8f9fb; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  .amount { font-size: 28px; font-weight: 700; color: #0a2540; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .badge-green { background: #e8f8f0; color: #1e7e4a; }
  .badge-red { background: #fef0f0; color: #c0392b; }
</style></head>
<body><div class="container">
  <div class="header"><h1>🏛 NexusBank</h1><p>Secure Digital Banking</p></div>
  <div class="body">${content}</div>
  <div class="footer">© 2024 NexusBank. All rights reserved.<br>This email was sent to you as a registered user.</div>
</div></body></html>`;

export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welcome to NexusBank — Your Account is Ready',
    html: baseTemplate(`
      <h2>Welcome, ${name}! 🎉</h2>
      <p>Your NexusBank account has been created successfully. You now have access to:</p>
      <ul>
        <li>✅ Instant money transfers</li>
        <li>✅ Virtual debit card</li>
        <li>✅ Real-time transaction tracking</li>
        <li>✅ 24/7 account access</li>
      </ul>
      <a href="${config.frontendUrl}/dashboard" class="btn">Go to Dashboard →</a>
      <p style="color:#999;font-size:13px;">If you didn't create this account, please contact support immediately.</p>
    `),
  }),

  transactionAlert: (name: string, type: string, amount: string, balance: string) => ({
    subject: `Transaction Alert — ${type} of $${amount}`,
    html: baseTemplate(`
      <h2>Transaction Notification</h2>
      <p>Hi ${name}, here's a summary of your recent transaction:</p>
      <div style="background:#f8f9fb;border-radius:10px;padding:24px;margin:20px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#666;font-size:14px;">Type</span>
          <span class="badge ${type.includes('DEPOSIT') || type.includes('IN') ? 'badge-green' : 'badge-red'}">${type}</span>
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:14px 0;">
        <div style="text-align:center;"><div class="amount">$${amount}</div></div>
        <hr style="border:none;border-top:1px solid #eee;margin:14px 0;">
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#666;font-size:14px;">New Balance</span>
          <strong>$${balance}</strong>
        </div>
      </div>
      <p>If you didn't authorize this transaction, <a href="${config.frontendUrl}/support">contact us immediately</a>.</p>
    `),
  }),

  passwordReset: (name: string, resetLink: string) => ({
    subject: 'Reset Your NexusBank Password',
    html: baseTemplate(`
      <h2>Password Reset Request</h2>
      <p>Hi ${name}, we received a request to reset your password.</p>
      <a href="${resetLink}" class="btn">Reset Password →</a>
      <p style="color:#999;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `),
  }),

  loginAlert: (name: string, ip: string, device: string) => ({
    subject: 'New Login to Your Account',
    html: baseTemplate(`
      <h2>New Login Detected</h2>
      <p>Hi ${name}, a new login was detected on your account:</p>
      <div style="background:#f8f9fb;border-radius:10px;padding:20px;margin:16px 0;">
        <p><strong>IP Address:</strong> ${ip}</p>
        <p><strong>Device:</strong> ${device}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p>If this was you, no action needed. If not, <a href="${config.frontendUrl}/security">secure your account immediately</a>.</p>
    `),
  }),
};
