const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    trim: true
  },
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/
  },
  // slug espelha o subdomain para compatibilidade com índices antigos (slug_1)
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    default: function () {
      return this.subdomain ? String(this.subdomain).toLowerCase().trim() : undefined;
    }
  },
  domain: {
    type: String,
    trim: true
  },
  // Nome do banco/identificador interno para este tenant (necessário devido a índice único existente)
  dbName: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    default: function () {
      // Usa subdomain se já existir; caso contrário, gera um temporário
      const base = (this.subdomain && String(this.subdomain)) || `tenant-${Date.now()}`;
      const normalized = base
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
      return `tenant_${normalized}`;
    }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial', 'cancelled'],
    default: 'trial'
  },
  plan: {
    type: String,
    enum: ['trial', 'basic', 'professional', 'enterprise'],
    default: 'trial'
  },
  planLimits: {
    users: { type: Number, default: 5 },
    customers: { type: Number, default: 100 },
    products: { type: Number, default: 50 },
    storage: { type: Number, default: 1024 } // MB
  },
  subscription: {
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    autoRenew: { type: Boolean, default: true },
    paymentStatus: {
      type: String,
      enum: ['active', 'overdue', 'cancelled'],
      default: 'active'
    }
  },
  settings: {
    allowCustomDomain: { type: Boolean, default: false },
    enableAPI: { type: Boolean, default: true },
    maxAPIRequests: { type: Number, default: 1000 }
  },
  contact: {
    name: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  billing: {
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'Brasil' },
    taxId: { type: String } // CNPJ
  },
  usage: {
    users: { type: Number, default: 0 },
    customers: { type: Number, default: 0 },
    products: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }, // MB
    apiRequestsThisMonth: { type: Number, default: 0 }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Gera subdomínio e nome automaticamente quando não informados
tenantSchema.pre('validate', function(next) {
  // Se subdomínio não for informado, gerar um único automaticamente
  if (!this.subdomain || String(this.subdomain).trim().length === 0) {
    this.subdomain = `tenant-${Date.now()}`;
  }

  // Normalizar subdomínio
  this.subdomain = String(this.subdomain)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Garantir slug sempre definido e espelhado do subdomain
  if (!this.slug || String(this.slug).trim().length === 0) {
    this.slug = this.subdomain;
  }

  // Gerar nome a partir do subdomínio se não houver nome
  if ((!this.name || this.name.trim().length === 0) && this.subdomain) {
    const base = String(this.subdomain).split('.')[0];
    const cleaned = base.replace(/[-_]+/g, ' ').trim();
    this.name = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  // Garantir dbName único e derivado do subdomínio quando ausente
  if (!this.dbName && this.subdomain) {
    this.dbName = `tenant_${this.subdomain}`;
  }
  if (!this.contact) {
    this.contact = {};
  }
  next();
});

// Índices para performance
tenantSchema.index({ subdomain: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'contact.email': 1 });

// Método para verificar se o tenant pode criar mais usuários
tenantSchema.methods.canCreateUser = function() {
  return this.usage.users < this.planLimits.users;
};

// Método para verificar se o tenant pode criar mais clientes
tenantSchema.methods.canCreateCustomer = function() {
  return this.usage.customers < this.planLimits.customers;
};

// Método para verificar se o tenant pode criar mais produtos
tenantSchema.methods.canCreateProduct = function() {
  return this.usage.products < this.planLimits.products;
};

// Método para verificar se o plano está ativo
tenantSchema.methods.isActive = function() {
  const isStatusActive = this.status === 'active' || this.status === 'trial';
  return isStatusActive &&
         (!this.subscription.endDate || this.subscription.endDate > new Date());
};

module.exports = mongoose.model('Tenant', tenantSchema);
