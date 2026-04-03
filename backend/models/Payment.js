const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['khalti'], required: true, index: true },
    kind: { type: String, enum: ['subscription_monthly'], required: true, index: true },
    amount: { type: Number, required: true }, // in paisa (NPR * 100)
    currency: { type: String, default: 'NPR' },
    purchaseOrderId: { type: String, required: true, index: true },
    purchaseOrderName: { type: String, default: '' },
    pidx: { type: String, default: '', index: true },
    status: { type: String, default: 'initiated', index: true }, // initiated | pending | completed | failed | canceled | refunded
    initiatedAt: { type: Date, default: Date.now },
    paidAt: { type: Date, default: null },
    rawInitiate: { type: mongoose.Schema.Types.Mixed, default: null },
    rawLookup: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

PaymentSchema.index({ provider: 1, pidx: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Payment', PaymentSchema);
