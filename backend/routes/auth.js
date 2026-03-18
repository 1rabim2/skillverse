const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { notifyAllAdmins } = require('../utils/notifications');
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function emailFilter(email) {
  const normalized = String(email || '').trim();
  if (!normalized) return null;
  return { email: { $regex: `^${escapeRegExp(normalized)}$`, $options: 'i' } };
}

// Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await User.findOne(emailFilter(normalizedEmail));
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Auto-verify new users (no email verification required)
    const user = new User({ name, email: normalizedEmail, password: hash, isVerified: true });
    await user.save();

    notifyAllAdmins({
      type: 'info',
      title: 'New user registered',
      message: `${user.email} created an account.`,
      link: '/admin/users',
      meta: { userId: String(user._id) }
    }).catch(() => null);

    // Issue a token and log the user in immediately
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role || 'student' }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role || 'student' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne(emailFilter(normalizedEmail));
    // Dev debug logs to help trace login failures locally
    if (!user) {
      if (process.env.NODE_ENV !== 'production') console.debug('Login failed: user not found for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      if (process.env.NODE_ENV !== 'production') console.debug('Login failed: password mismatch for user id:', user._id.toString());
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email before logging in' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role || 'student' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role || 'student' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google sign-in (works for both "login" and "signup" UX)
// Frontend should send the Google Identity Services `credential` (ID token).
router.post('/google', authLimiter, async (req, res) => {
  try {
    if (!googleClient) return res.status(500).json({ error: 'Google auth is not configured (missing GOOGLE_CLIENT_ID)' });

    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'credential required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload() || {};
    const email = String(payload.email || '').trim().toLowerCase();
    const emailVerified = !!payload.email_verified;
    const googleSub = String(payload.sub || '').trim();
    const name = String(payload.name || '').trim();

    if (!email) return res.status(400).json({ error: 'Google account has no email' });
    if (!emailVerified) return res.status(403).json({ error: 'Google email is not verified' });
    if (!googleSub) return res.status(400).json({ error: 'Google token missing sub' });

    const existingBySub = await User.findOne({ googleSub });
    if (existingBySub && String(existingBySub.email).toLowerCase() !== email) {
      return res.status(409).json({ error: 'Google account is already linked to another user' });
    }

    let user = await User.findOne(emailFilter(email));

    if (!user) {
      // Create a local account tied to Google. We still store a random password hash so that:
      // - the existing schema (password required) remains valid
      // - the user can later "reset password" to set an email/password login if desired
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(randomPassword, salt);

      user = new User({
        name,
        email,
        password: hash,
        isVerified: true,
        googleSub
      });

      await user.save();

      notifyAllAdmins({
        type: 'info',
        title: 'New user registered (Google)',
        message: `${user.email} created an account via Google.`,
        link: '/admin/users',
        meta: { userId: String(user._id), provider: 'google' }
      }).catch(() => null);
    } else {
      if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
      // If they previously signed up via email but are now using Google, remember the googleSub.
      if (user.googleSub && user.googleSub !== googleSub) {
        return res.status(409).json({ error: 'This email is already linked to a different Google account' });
      }
      if (!user.googleSub) user.googleSub = googleSub;
      if (!user.isVerified) user.isVerified = true;
      if (!user.name && name) user.name = name;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role || 'student' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role || 'student' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify email
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ error: 'Invalid token' });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend verification
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email });
    // Always return a generic message to avoid revealing which emails exist
    if (!user || user.isVerified) return res.status(200).json({ message: 'If that email exists and is unverified, a verification link was sent' });

    if (!user.verificationToken) user.verificationToken = require('crypto').randomBytes(20).toString('hex');
    await user.save();

    const { sendEmail } = require('../utils/email');
    const verifyLink = `${process.env.BASE_URL || 'http://localhost:4000'}/api/auth/verify?token=${user.verificationToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Verify your Skillverse account',
      text: `Please verify your account by visiting: ${verifyLink}`,
      html: `<p>Please verify your account by clicking <a href="${verifyLink}">this link</a>.</p>`
    });

    return res.status(200).json({ message: 'If that email exists and is unverified, a verification link was sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email });
    // Generic response to avoid revealing whether the email exists
    if (!user) return res.status(200).json({ message: 'If that email exists, an appropriate link was sent' });

    const { sendEmail } = require('../utils/email');

    // If the account is not verified, send verification link instead of reset link
    if (!user.isVerified) {
      if (!user.verificationToken) user.verificationToken = require('crypto').randomBytes(20).toString('hex');
      await user.save();
      const verifyLink = `${process.env.BASE_URL || 'http://localhost:4000'}/api/auth/verify?token=${user.verificationToken}`;
      await sendEmail({
        to: user.email,
        subject: 'Verify your Skillverse account',
        text: `Please verify your account by visiting: ${verifyLink}`,
        html: `<p>Please verify your account by clicking <a href="${verifyLink}">this link</a>.</p>`
      });

      const resp = { message: 'If that email exists and is unverified, a verification link was sent' };
      if (process.env.NODE_ENV !== 'production') resp.verifyLink = verifyLink;
      return res.status(200).json(resp);
    }

    // Otherwise send password reset link
    const resetToken = require('crypto').randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your Skillverse password',
      text: `Reset your password by visiting: ${resetLink}`,
      html: `<p>Reset your password by clicking <a href="${resetLink}">this link</a>. The link expires in 1 hour.</p>`
    });

    const resp = { message: 'If that email exists, a reset link was sent' };
    if (process.env.NODE_ENV !== 'production') resp.resetLink = resetLink;
    return res.status(200).json(resp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });

    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
