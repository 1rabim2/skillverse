const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { notifyAllAdmins } = require('../utils/notifications');
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');
const { validatePassword, validateEmail } = require('../utils/validation');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limit for password reset - more restrictive
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many password reset attempts. Please try again later.'
});

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function emailFilter(email) {
  const normalized = String(email || '').trim();
  if (!normalized) return null;
  return { email: { $regex: `^${escapeRegExp(normalized)}$`, $options: 'i' } };
}

// Helper to set JWT in httpOnly cookie
function setAuthCookie(res, token) {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// Backwards compatibility for older admin UI which used `adminToken` cookie.
function setAdminCompatCookie(res, token) {
  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// Helper to clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
}

function clearAdminCompatCookie(res) {
  res.clearCookie('adminToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
}

// Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Validate email format
    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: 'Password does not meet requirements', details: passwordValidation.errors });
    }

    const existing = await User.findOne(emailFilter(normalizedEmail));
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const requestedRole = String(role || 'student').trim().toLowerCase();
    if (!['student', 'instructor'].includes(requestedRole)) {
      return res.status(400).json({ error: 'role must be student or instructor' });
    }

    const user = new User({ 
      name, 
      email: normalizedEmail, 
      password: hash, 
      role: requestedRole,
      isVerified: true,
      verificationToken: undefined
    });
    await user.save();

    notifyAllAdmins({
      type: 'info',
      title: 'New user registered',
      message: `${user.email} created an account.`,
      link: '/admin/users',
      meta: { userId: String(user._id) }
    }).catch(() => null);

    // Email verification is disabled: log in immediately after signup.
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role || 'student' }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);
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

    // Unified login for users and admins (admins are created manually).
    const admin = await Admin.findOne(emailFilter(normalizedEmail));
    if (admin) {
      if (!admin.isActive) return res.status(403).json({ error: 'Account is deactivated' });
      const matchAdmin = await bcrypt.compare(password, admin.password);
      if (matchAdmin) {
        const token = jwt.sign({ id: admin._id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        setAuthCookie(res, token);
        setAdminCompatCookie(res, token);
        return res.json({ token, user: { id: admin._id, email: admin.email, name: admin.name, role: 'admin' } });
      }
    }

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

    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role || 'student' }, JWT_SECRET, { expiresIn: '7d' });
    
    // Set token in httpOnly cookie and also return for client logic
    setAuthCookie(res, token);
    
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

    const { credential, role } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'credential required' });

    const requestedRole = String(role || 'student').trim().toLowerCase();
    if (!['student', 'instructor'].includes(requestedRole)) {
      return res.status(400).json({ error: 'role must be student or instructor' });
    }

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
    let isNewUser = false;

    if (!user) {
      // Create a new account tied to Google
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(randomPassword, salt);

      user = new User({
        name,
        email,
        password: hash,
        isVerified: true,
        role: requestedRole,
        googleSub,
        verificationToken: undefined
      });

      await user.save();
      isNewUser = true;

      notifyAllAdmins({
        type: 'info',
        title: 'New user registered (Google)',
        message: `${user.email} created an account via Google.`,
        link: '/admin/users',
        meta: { userId: String(user._id), provider: 'google' }
      }).catch(() => null);

      const token = jwt.sign({ id: user._id, email: user.email, role: user.role || 'student' }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);
      return res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role || 'student' } });
    } else {
      if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
      // If they previously signed up via email but are now using Google, remember the googleSub.
      if (user.googleSub && user.googleSub !== googleSub) {
        return res.status(409).json({ error: 'This email is already linked to a different Google account' });
      }
      if (!user.googleSub) user.googleSub = googleSub;
      if (!user.name && name) user.name = name;
      if (!user.isVerified) user.isVerified = true;
      if (user.verificationToken) user.verificationToken = undefined;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role || 'student' }, JWT_SECRET, { expiresIn: '7d' });
    
    // Set token in httpOnly cookie and return token for frontend storage
    setAuthCookie(res, token);
    
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role || 'student' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify email with code
router.post('/verify', async (_req, res) => {
  return res.status(410).json({ error: 'Email verification is disabled' });
});

// Verify email with token (for backward compatibility)
router.get('/verify', async (_req, res) => {
  return res.status(410).json({ error: 'Email verification is disabled' });
});

// Resend verification
router.post('/resend-verification', authLimiter, async (req, res) => {
  return res.status(410).json({ error: 'Email verification is disabled' });
});

// Forgot password - WITH RATE LIMITING
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne(emailFilter(normalizedEmail));
    // Generic response to avoid revealing whether the email exists
    if (!user) return res.status(200).json({ message: 'If that email exists, an appropriate link was sent' });

    const { sendEmail } = require('../utils/email');

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

    // Validate new password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: 'Password does not meet requirements', details: passwordValidation.errors });
    }

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

// Authenticated identity (student/instructor/admin)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const id = req.user?.id;
    if (!id) return res.status(401).json({ error: 'Unauthorized' });

    if (role === 'admin') {
      const admin = await Admin.findById(id).select('-password');
      if (!admin || !admin.isActive) return res.status(403).json({ error: 'Account is deactivated' });
      return res.json({ user: { id: admin._id, email: admin.email, name: admin.name, role: 'admin' } });
    }

    const user = await User.findById(id).select('-password');
    if (!user || !user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    return res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role || 'student' } });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  clearAdminCompatCookie(res);
  res.json({ message: 'Logged out successfully' });
});




module.exports = router;
