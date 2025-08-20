const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  name: { type: String, required: true },
  email: String,
  phone: String,
  cpf: String,         // Novo campo
  cnpj: String,        // Novo campo
  rg: String,
  ie: String,
  address: String,
  address_number: String,
  address_complement: String,
  district: String,
  city: String,
  state: String,
  zip_code: String,
  country: { type: String, default: 'BRASIL' },
  person_type: { type: String, enum: ['FISICA', 'JURIDICA'], default: 'JURIDICA' },
  notes: String,
  birth_date: String,  // Novo campo
  status: { type: String, default: 'Ativo' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Índices para multi-tenancy
CustomerSchema.index({ tenantId: 1 });
// Unicidade por tenant
CustomerSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true, name: 'uniq_tenant_email' });
CustomerSchema.index({ tenantId: 1, cpf: 1 }, { unique: true, sparse: true, name: 'uniq_tenant_cpf' });
CustomerSchema.index({ tenantId: 1, cnpj: 1 }, { unique: true, sparse: true, name: 'uniq_tenant_cnpj' });

module.exports = mongoose.model('Customer', CustomerSchema);