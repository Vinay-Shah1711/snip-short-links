import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // unique index on slug = the fast lookup path for every redirect
    slug: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    title: { type: String, default: '' },
    passwordHash: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    clickCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Link = mongoose.model('Link', linkSchema);
