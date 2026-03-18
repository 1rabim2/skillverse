const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM = process.env.SMTP_FROM || 'no-reply@skillverse.local';

let transporter;
if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
    auth: { user: SMTP_USER, pass: SMTP_PASS }
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
    return;
  }

  await transporter.sendMail({ from: FROM, to, subject, text, html });
}

module.exports = { sendEmail };
