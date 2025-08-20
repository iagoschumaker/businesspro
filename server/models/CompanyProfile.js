const mongoose = require('mongoose');

const CompanyProfileSchema = new mongoose.Schema(
  {
    razao_social: { type: String, trim: true },
    nome_fantasia: { type: String, trim: true },
    cnpj: { type: String, trim: true },
    ie: { type: String, trim: true },
    endereco: { type: String, trim: true },
    cidade: { type: String, trim: true },
    estado: { type: String, trim: true },
    cep: { type: String, trim: true },
    telefone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    logoUrl: { type: String }, // pode ser Data URL/base64 ou URL pública
    pixKey: { type: String, trim: true }, // chave PIX para recebimento
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanyProfile', CompanyProfileSchema);
