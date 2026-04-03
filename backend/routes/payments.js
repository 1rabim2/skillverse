const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { requestJson } = require('../utils/httpJson');
const { sendEmail } = require('../utils/email');
const { notifyUser } = require('../utils/notifications');

const router = express.Router();

function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') return res.status(403).json({ error: 'Student access required' });
  return next();
}

function addOneMonth(date) {
  const d = new Date(date);
  const next = new Date(d);
  next.setMonth(next.getMonth() + 1);
  return next;
}

function khaltiConfig() {
  const secret = String(process.env.KHALTI_SECRET_KEY || '').trim();
  const baseUrl = String(process.env.KHALTI_BASE_URL || 'https://dev.khalti.com').trim().replace(/\/+$/, '');
  const monthlyAmount = Number(process.env.KHALTI_MONTHLY_AMOUNT || 99900); // default: NPR 999.00
  const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');

  if (!secret) {
    const err = new Error('Khalti is not configured (missing KHALTI_SECRET_KEY)');
    err.status = 500;
    throw err;
  }
  if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
    const err = new Error('Invalid KHALTI_MONTHLY_AMOUNT');
    err.status = 500;
    throw err;
  }

  return { secret, baseUrl, monthlyAmount, frontendUrl };
}

router.get('/me/subscription', requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('subscription.lastPaymentId');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      subscription: user.subscription || { status: 'none' }
    });
  } catch {
    res.status(500).json({ error: 'Failed to load subscription' });
  }
});

router.get('/me/payments', requireStudent, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 15)));
    const items = await Payment.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ items });
  } catch {
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

router.post('/khalti/subscription/monthly/initiate', requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    const { secret, baseUrl, monthlyAmount, frontendUrl } = khaltiConfig();

    const purchaseOrderId = `SVSUB-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const purchaseOrderName = 'Skillverse Monthly Subscription';

    const body = {
      return_url: `${frontendUrl}/subscribe/return`,
      website_url: frontendUrl,
      amount: monthlyAmount,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName,
      customer_info: {
        name: user.name || 'Student',
        email: user.email,
        phone: user.phone || ''
      }
    };

    const initiateUrl = `${baseUrl}/api/v2/epayment/initiate/`;
    const response = await requestJson(initiateUrl, {
      method: 'POST',
      headers: { Authorization: `Key ${secret}` },
      body
    });

    if (response.status < 200 || response.status >= 300) {
      const msg = response.json?.detail || response.json?.message || 'Failed to initiate Khalti payment';
      return res.status(502).json({ error: msg, provider: 'khalti' });
    }

    const pidx = String(response.json?.pidx || '').trim();
    const paymentUrl = String(response.json?.payment_url || response.json?.paymentUrl || '').trim();
    if (!pidx || !paymentUrl) return res.status(502).json({ error: 'Khalti response missing pidx/payment_url' });

    const payment = await Payment.create({
      user: user._id,
      provider: 'khalti',
      kind: 'subscription_monthly',
      amount: monthlyAmount,
      currency: 'NPR',
      purchaseOrderId,
      purchaseOrderName,
      pidx,
      status: 'initiated',
      rawInitiate: response.json
    });

    notifyUser(user._id, {
      type: 'info',
      title: 'Payment initiated',
      message: 'Your subscription payment is initiated. Complete the payment to activate access.',
      link: '/subscribe',
      meta: { provider: 'khalti', pidx, paymentId: String(payment._id) }
    }).catch(() => null);

    sendEmail({
      to: user.email,
      subject: 'Skillverse payment initiated',
      text: `Your payment was initiated. Complete it here: ${paymentUrl}`,
      html: `<p>Your payment was initiated.</p><p>Complete it here: <a href="${paymentUrl}">${paymentUrl}</a></p>`
    }).catch(() => null);

    res.json({ pidx, paymentUrl, amount: monthlyAmount, currency: 'NPR' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to initiate payment' });
  }
});

router.post('/khalti/lookup', requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });
    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email' });

    const pidx = String(req.body?.pidx || '').trim();
    if (!pidx) return res.status(400).json({ error: 'pidx required' });

    const { secret, baseUrl, monthlyAmount } = khaltiConfig();

    const payment = await Payment.findOne({ provider: 'khalti', pidx, user: user._id });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const lookupUrl = `${baseUrl}/api/v2/epayment/lookup/`;
    const response = await requestJson(lookupUrl, {
      method: 'POST',
      headers: { Authorization: `Key ${secret}` },
      body: { pidx }
    });

    if (response.status < 200 || response.status >= 300) {
      const msg = response.json?.detail || response.json?.message || 'Failed to verify Khalti payment';
      return res.status(502).json({ error: msg, provider: 'khalti' });
    }

    payment.rawLookup = response.json;

    const statusRaw = String(response.json?.status || '').trim();
    const statusLower = statusRaw.toLowerCase();
    const isCompleted = statusLower.includes('complete') || statusLower.includes('success');
    const isRefunded = statusLower.includes('refund');
    const isCanceled = statusLower.includes('cancel');
    const isExpiredOrFailed = statusLower.includes('expire') || statusLower.includes('fail');
    const isPending = statusLower.includes('pending') || statusLower.includes('initiated') || statusLower.includes('created');

    if (isCompleted) {
      const prev = payment.status;
      payment.status = 'completed';
      payment.paidAt = payment.paidAt || new Date();
      await payment.save();

      const now = new Date();
      const currentEnd = user.subscription?.currentPeriodEnd ? new Date(user.subscription.currentPeriodEnd) : null;
      const anchor = currentEnd && currentEnd > now ? currentEnd : now;
      const nextEnd = addOneMonth(anchor);

      user.subscription = user.subscription || {};
      user.subscription.provider = 'khalti';
      user.subscription.status = 'active';
      user.subscription.currentPeriodStart = user.subscription.currentPeriodStart || now;
      user.subscription.currentPeriodEnd = nextEnd;
      user.subscription.lastPaymentId = payment._id;
      await user.save();

      notifyUser(user._id, {
        type: 'success',
        title: 'Subscription active',
        message: `Your monthly subscription is active until ${nextEnd.toLocaleDateString()}.`,
        link: '/subscribe',
        meta: { provider: 'khalti', pidx }
      }).catch(() => null);

      sendEmail({
        to: user.email,
        subject: 'Skillverse subscription activated',
        text: `Your Skillverse monthly subscription is active until ${nextEnd.toLocaleDateString()}.`,
        html: `<p>Your Skillverse monthly subscription is active until <b>${nextEnd.toLocaleDateString()}</b>.</p>`
      }).catch(() => null);

      return res.json({
        ok: true,
        status: 'completed',
        subscription: user.subscription,
        amount: payment.amount || monthlyAmount
      });
    }

    const prev = payment.status;
    if (isRefunded) payment.status = 'refunded';
    else if (isCanceled) payment.status = 'canceled';
    else if (isExpiredOrFailed) payment.status = 'failed';
    else if (isPending) payment.status = 'pending';
    else payment.status = payment.status || 'initiated';
    await payment.save();

    if (prev !== payment.status) {
      if (payment.status === 'pending') {
        notifyUser(user._id, {
          type: 'info',
          title: 'Payment pending',
          message: 'Your payment is still pending. Please wait a moment and check again.',
          link: '/subscribe',
          meta: { provider: 'khalti', pidx }
        }).catch(() => null);

        sendEmail({
          to: user.email,
          subject: 'Skillverse payment pending',
          text: 'Your payment is still pending. You can check status from your subscription page.',
          html: '<p>Your payment is still pending. You can check status from your subscription page.</p>'
        }).catch(() => null);
      } else if (['failed', 'canceled', 'refunded'].includes(payment.status)) {
        notifyUser(user._id, {
          type: 'warning',
          title: 'Payment not completed',
          message: `Your payment status is: ${payment.status}.`,
          link: '/subscribe',
          meta: { provider: 'khalti', pidx, status: payment.status }
        }).catch(() => null);

        sendEmail({
          to: user.email,
          subject: 'Skillverse payment update',
          text: `Your payment was not completed. Status: ${payment.status}.`,
          html: `<p>Your payment was not completed. Status: <b>${payment.status}</b>.</p>`
        }).catch(() => null);
      }
    }

    res.json({ ok: true, status: payment.status, providerStatus: statusRaw || '' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to lookup payment' });
  }
});

module.exports = router;
