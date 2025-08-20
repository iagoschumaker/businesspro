const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/businesspro');
    console.log('Conectado ao MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Listar índices existentes
    console.log('Índices existentes:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log('- ', JSON.stringify(index.key), index.name);
    });

    // Remover índices problemáticos
    try {
      await usersCollection.dropIndex('email_1');
      console.log('Índice email_1 removido');
    } catch (error) {
      console.log('Índice email_1 não existe ou já foi removido');
    }

    try {
      await usersCollection.dropIndex('email_1_tenantId_1');
      console.log('Índice email_1_tenantId_1 removido');
    } catch (error) {
      console.log('Índice email_1_tenantId_1 não existe ou já foi removido');
    }

    // Criar novos índices
    await usersCollection.createIndex({ email: 1 });
    console.log('Índice email_1 criado');

    await usersCollection.createIndex({ tenantId: 1 });
    console.log('Índice tenantId_1 criado');

    await usersCollection.createIndex({ role: 1 });
    console.log('Índice role_1 criado');

    // Índice único composto apenas para usuários com tenant
    await usersCollection.createIndex(
      { email: 1, tenantId: 1 }, 
      { 
        unique: true,
        partialFilterExpression: { tenantId: { $exists: true } },
        name: 'email_1_tenantId_1_partial'
      }
    );
    console.log('Índice único email_1_tenantId_1_partial criado');

    console.log('\nÍndices após correção:');
    const newIndexes = await usersCollection.indexes();
    newIndexes.forEach(index => {
      console.log('- ', JSON.stringify(index.key), index.name);
    });

  } catch (error) {
    console.error('Erro ao corrigir índices:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixIndexes();
}

module.exports = fixIndexes;
