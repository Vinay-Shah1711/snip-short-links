import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema({
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ts: { type: Date, default: Date.now },
  country: { type: String, default: 'Unknown' },
  city: { type: String, default: '' },
  device: { type: String, default: 'desktop' },
  browser: { type: String, default: 'Other' },
  os: { type: String, default: 'Other' },
  referrer: { type: String, default: 'Direct' },
  // We never store the raw IP: only a salted SHA-256 hash (used for "unique visitors")
  ipHash: { type: String, required: true },
});

// Dashboard queries always filter by link and time range
clickSchema.index({ linkId: 1, ts: -1 });

export const Click = mongoose.model('Click', clickSchema);
