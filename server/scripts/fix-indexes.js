const mongoose = require('mongoose');
require('dotenv').config();

const fixIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Conectado ao MongoDB');
    const db = mongoose.connection.db;
    
    // Listar índices atuais
    console.log('Índices atuais na collection customers:');
    const indexes = await db.collection('customers').indexes();
    indexes.forEach(index => {
      console.log('- ', JSON.stringify(index.key), index.unique ? '(unique)' : '');
    });
    
    // Remover índice antigo 'document' se existir
    try {
      await db.collection('customers').dropIndex({ document: 1 });
      console.log('✅ Índice "document" removido');
    } catch (error) {
      console.log('ℹ️  Índice "document" não existe ou já foi removido');
    }
    
    // Criar novos índices corretos
    await db.collection('customers').createIndex({ cpf: 1 }, { unique: true, sparse: true });
    console.log('✅ Índice único para CPF criado');
    
    await db.collection('customers').createIndex({ cnpj: 1 }, { unique: true, sparse: true });
    console.log('✅ Índice único para CNPJ criado');
    
    await db.collection('customers').createIndex({ email: 1 }, { sparse: true });
    console.log('✅ Índice para email criado');
    
    console.log('\n🎉 Índices corrigidos com sucesso!');
    
    // Listar índices finais
    console.log('\nÍndices finais na collection customers:');
    const finalIndexes = await db.collection('customers').indexes();
    finalIndexes.forEach(index => {
      console.log('- ', JSON.stringify(index.key), index.unique ? '(unique)' : '');
    });
    
  } catch (error) {
    console.error('❌ Erro ao corrigir índices:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nConexão fechada');
  }
};

fixIndexes();
