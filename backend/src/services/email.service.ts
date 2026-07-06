import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Central transactional-email sender. In dev (EMAIL_ENABLED=false) it logs the
// message — including any action link — instead of dialing SMTP, so signup and
// password-reset flows are fully testable locally without a mail server. In
// production it uses the configured SMTP transport. Failures never throw to the
// caller: a down mail server must not 500 a signup; the token still lives in the
// DB and the email can be re-triggered (resend verification / re-request reset).

let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Surfaced in dev logs so the tester can click through without a real inbox.
  actionUrl?: string;
}

async function send(msg: EmailMessage): Promise<void> {
  if (!env.EMAIL_ENABLED) {
    logger.info('Email (dev, not sent)', {
      to: msg.to,
      subject: msg.subject,
      actionUrl: msg.actionUrl,
    });
    return;
  }

  try {
    await getTransport().sendMail({
      from: env.SMTP_FROM,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
  } catch (err) {
    // Swallow — the caller (signup/forgot-password) must not fail on mail issues.
    logger.error('Email send failed', {
      to: msg.to,
      subject: msg.subject,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────
// Inline-styled, single-column, no external assets — the format that survives
// across mail clients (Gmail/Outlook strip <style> and external CSS).

function layout(heading: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0a0a0a;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#141414;border:1px solid #262626;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:32px 32px 8px;">
        <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;">FUGU</div>
      </td></tr>
      <tr><td style="padding:8px 32px 0;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#fff;font-weight:700;">${heading}</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a3a3a3;">${body}</p>
        <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#7B2FF7,#FF2E9A);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">${ctaLabel}</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#666;">Or paste this link into your browser:<br><span style="color:#8b8b8b;word-break:break-all;">${ctaUrl}</span></p>
      </td></tr>
      <tr><td style="padding:32px;">
        <hr style="border:none;border-top:1px solid #262626;margin:0 0 16px;">
        <p style="margin:0;font-size:11px;color:#555;">If you didn't request this, you can safely ignore this email.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export const EmailService = {
  async sendVerification(to: string, token: string): Promise<void> {
    const url = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    await send({
      to,
      subject: 'Verify your FUGU email address',
      actionUrl: url,
      text: `Welcome to FUGU. Verify your email address: ${url}`,
      html: layout(
        'Verify your email',
        'Confirm this address to activate your FUGU account and start indexing documents. This link expires in 24 hours.',
        'Verify email',
        url
      ),
    });
  },

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const url = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    await send({
      to,
      subject: 'Reset your FUGU password',
      actionUrl: url,
      text: `Reset your FUGU password: ${url}`,
      html: layout(
        'Reset your password',
        'We received a request to reset your password. This link expires in 1 hour. If you didn\'t ask for this, ignore this email — your password stays unchanged.',
        'Reset password',
        url
      ),
    });
  },

  async sendQuotaWarning(to: string, percent: number): Promise<void> {
    const url = `${env.FRONTEND_URL}/dashboard/billing`;
    await send({
      to,
      subject: `You've used ${Math.round(percent * 100)}% of your FUGU monthly quota`,
      actionUrl: url,
      text: `Your organization has used ${Math.round(percent * 100)}% of its monthly query quota. Upgrade to avoid interruptions: ${url}`,
      html: layout(
        'Approaching your monthly quota',
        `Your organization has used ${Math.round(percent * 100)}% of its monthly query allowance. Once you hit 100%, new queries will be blocked until the next billing period or an upgrade.`,
        'Review usage & upgrade',
        url
      ),
    });
  },
};
