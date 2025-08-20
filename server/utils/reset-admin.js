const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function resetAdmin() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/businesspro');
    console.log('Conectado ao MongoDB');

    // Remover usuário admin existente
    const result = await User.deleteMany({ email: 'admin@businesspro.com' });
    console.log(`${result.deletedCount} usuários removidos com email admin@businesspro.com`);

    // Criar novo SuperAdmin
    const superAdmin = new User({
      name: 'Super Administrador',
      email: 'admin@businesspro.com',
      password: 'admin123456',
      role: 'SuperAdmin',
      isSuperAdmin: true,
      status: 'Ativo'
      // Não definir tenantId para SuperAdmin
    });

    await superAdmin.save();
    console.log('SuperAdmin criado com sucesso!');
    console.log('Email: admin@businesspro.com');
    console.log('Senha: admin123456');

  } catch (error) {
    console.error('Erro ao resetar admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  resetAdmin();
}

module.exports = resetAdmin;
