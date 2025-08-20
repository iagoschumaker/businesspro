const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    monthly: { type: Number, required: true },
    yearly: { type: Number, required: true }
  },
  limits: {
    users: { type: Number, required: true },
    customers: { type: Number, required: true },
    products: { type: Number, required: true },
    storage: { type: Number, required: true }, // MB
    apiRequests: { type: Number, required: true }
  },
  features: [{
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices
planSchema.index({ slug: 1 });
planSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Plan', planSchema);
