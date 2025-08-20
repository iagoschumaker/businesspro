const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    required: true,
    enum: ['SuperAdmin', 'Administrador', 'Vendedor', 'Financeiro', 'Suporte'],
    default: 'Vendedor'
  },
  avatarUrl: {
    type: String,
    trim: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: function() {
      return this.role !== 'SuperAdmin';
    }
  },
  status: {
    type: String,
    enum: ['Ativo', 'Inativo'],
    default: 'Ativo'
  },
  permissions: [{
    type: String
  }],
  last_login: {
    type: Date
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  // PIX data (optional): users can receive payments via their own PIX key
  pix_key: {
    type: String,
    trim: true,
  },
  pix_key_type: {
    type: String,
    enum: ['cpf', 'cnpj', 'email', 'phone', 'random'],
  },
  // Optional merchant info for BR Code (recommended: uppercase, no accents)
  pix_merchant_name: { type: String, trim: true },
  pix_merchant_city: { type: String, trim: true },
}, {
  timestamps: true
});

// Gera um nome automaticamente a partir do email caso não seja informado
userSchema.pre('validate', function(next) {
  if ((!this.name || this.name.trim().length === 0) && this.email) {
    const prefix = this.email.split('@')[0] || 'usuario';
    this.name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  next();
});

// Hash password antes de salvar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Índices para performance
userSchema.index({ email: 1 });
userSchema.index({ tenantId: 1 });
userSchema.index({ role: 1 });
// Índice único composto: email + tenantId (apenas para usuários com tenant)
userSchema.index(
  { email: 1, tenantId: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { tenantId: { $exists: true } }
  }
);

// Método para comparar senha
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remover senha do JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);