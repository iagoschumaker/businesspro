const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  type: {
    type: String,
    required: true,
    enum: ['success', 'warning', 'error', 'info']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for common queries
notificationSchema.index({ tenantId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);