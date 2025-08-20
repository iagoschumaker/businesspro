const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: false, // Made optional for simplified form
    trim: true
  },
  type: {
    type: String,
    required: false, // Made optional for simplified form
    enum: ['Visita Comercial', 'Apresentação', 'Follow-up', 'Demonstração', 'Reunião', 'Suporte']
  },
  status: {
    type: String,
    enum: ['Agendado', 'Confirmado', 'Concluído', 'Cancelado', 'Pendente'],
    default: 'Agendado'
  },
  notes: {
    type: String,
    trim: true
  },
  reminder: {
    type: Number,
    default: 30,
    min: 0
  }
}, {
  timestamps: true
});

// Índices para multi-tenancy
visitSchema.index({ tenantId: 1 });
visitSchema.index({ tenantId: 1, customer_id: 1 });
visitSchema.index({ tenantId: 1, user_id: 1 });
visitSchema.index({ tenantId: 1, date: 1 });

module.exports = mongoose.model('Visit', visitSchema);