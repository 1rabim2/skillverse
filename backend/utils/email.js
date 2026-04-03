const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM = process.env.SMTP_FROM || 'no-reply@skillverse.local';
const SMTP_SECURE = process.env.SMTP_SECURE;
const SMTP_REQUIRE_TLS = process.env.SMTP_REQUIRE_TLS;
const SMTP_TLS_REJECT_UNAUTHORIZED = process.env.SMTP_TLS_REJECT_UNAUTHORIZED;
const SMTP_NAME = process.env.SMTP_NAME;

let transporter;
if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  const portNum = Number(SMTP_PORT);
  const secure =
    typeof SMTP_SECURE === 'string' && SMTP_SECURE.length
      ? ['1', 'true', 'yes', 'on'].includes(SMTP_SECURE.trim().toLowerCase())
      : portNum === 465;

  const requireTLS = ['1', 'true', 'yes', 'on'].includes(String(SMTP_REQUIRE_TLS || '').trim().toLowerCase());
  const rejectUnauthorized =
    typeof SMTP_TLS_REJECT_UNAUTHORIZED === 'string' && SMTP_TLS_REJECT_UNAUTHORIZED.length
      ? !['0', 'false', 'no', 'off'].includes(SMTP_TLS_REJECT_UNAUTHORIZED.trim().toLowerCase())
      : true;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: portNum,
    secure,
    requireTLS,
    name: SMTP_NAME || undefined,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized }
  });
}

async function sendEmail({ to, subject, text, html }) {
  if (!transporter) {
    // Fallback: log the email with the verification/reset link so devs can use it during development
    console.log('--- Email (console fallback) ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    console.log('HTML:', html);
    console.log('-------------------------------');
    return { ok: false, skipped: true, reason: 'smtp_not_configured' };
  }

  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, text, html });
    return { ok: true, messageId: info?.messageId || null };
  } catch (err) {
    // Keep errors visible in logs even if callers intentionally don't await/catch.
    console.warn('Email send failed:', err?.message || String(err));
    throw err;
  }
}

function isEmailConfigured() {
  return !!transporter;
}

module.exports = { sendEmail, isEmailConfigured };
