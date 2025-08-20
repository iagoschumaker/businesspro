const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  ncm: {
    type: String,
    trim: true
  },
  cest: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    enum: ['UN', 'KG', 'MT', 'LT', 'CX', 'PC'],
    default: 'UN'
  },
  cost_price: {
    type: Number,
    required: true,
    min: 0
  },
  sale_price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  min_stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  category: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Ativo', 'Inativo'],
    default: 'Ativo'
  }
}, {
  timestamps: true
});

// Virtual para status do estoque
productSchema.virtual('stock_status').get(function() {
  if (this.stock <= 0) return 'Sem Estoque';
  if (this.stock <= this.min_stock) return 'Baixo Estoque';
  return 'Normal';
});

// Índices para multi-tenancy
productSchema.index({ tenantId: 1 });
productSchema.index({ tenantId: 1, code: 1 }, { unique: true });
productSchema.index({ tenantId: 1, category: 1 });

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);