const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Aumenta o pool de conexões para alta concorrência (configurável por ENV)
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 200),
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT || 15000),
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Configurar índices após conexão
    await createIndexes();
    
  } catch (error) {
    console.error('Erro ao conectar com MongoDB:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const customers = db.collection('customers');

    // Listar índices existentes
    let indexes = [];
    try {
      indexes = await customers.indexes();
    } catch (e) {
      console.warn('[indexes] Falha ao listar índices atuais:', e?.message || e);
    }
    console.log('[indexes] customers existentes:', indexes.map(i => ({ name: i.name, key: i.key, unique: !!i.unique })));

    // Remover índices problemáticos (globais e com nome de campo incorreto)
    const problematicKeys = [
      JSON.stringify({ cpf: 1 }),
      JSON.stringify({ cnpj: 1 }),
      JSON.stringify({ email: 1 }),
      JSON.stringify({ tenant_id: 1, cpf: 1 }),
      JSON.stringify({ tenant_id: 1, cnpj: 1 }),
      JSON.stringify({ tenant_id: 1, email: 1 })
    ];
    for (const idx of indexes) {
      const keyStr = JSON.stringify(idx.key || {});
      if (problematicKeys.includes(keyStr) || idx.name?.includes('tenant_id')) {
        try {
          await customers.dropIndex(idx.name);
          console.log(`[indexes] Removido índice problemático: ${idx.name} ${keyStr}`);
        } catch (e) {
          console.warn(`[indexes] Falha ao remover índice ${idx.name}:`, e?.message || e);
        }
      }
    }

    // Recarregar lista após remoções
    try { indexes = await customers.indexes(); } catch {}

    // Garantir índices compostos por tenantId (cria se não existir)
    const ensureCompound = async (key, opts) => {
      const targetName = opts.name;
      const exists = indexes.some(i => i.name === targetName || JSON.stringify(i.key) === JSON.stringify(key));
      if (!exists) {
        try {
          await customers.createIndex(key, opts);
          console.log('[indexes] Criado índice:', targetName, key, opts);
        } catch (e) {
          console.error('[indexes] Erro ao criar índice', targetName, e?.message || e);
        }
      } else {
        console.log('[indexes] Índice já existe:', targetName);
      }
    };

    await ensureCompound({ tenantId: 1, cpf: 1 }, { unique: true, sparse: true, name: 'uniq_tenant_cpf' });
    await ensureCompound({ tenantId: 1, cnpj: 1 }, { unique: true, sparse: true, name: 'uniq_tenant_cnpj' });
    await ensureCompound({ tenantId: 1, email: 1 }, { unique: true, sparse: true, name: 'uniq_tenant_email' });

    // Índice de texto para buscas (best-effort)
    try { await customers.createIndex({ name: 'text', email: 'text' }); } catch (_) {}

    await db.collection('products').createIndex({ code: 1 }, { unique: true });
    await db.collection('products').createIndex({ name: 'text', description: 'text' });
    
    await db.collection('orders').createIndex({ order_number: 1 }, { unique: true });
    await db.collection('orders').createIndex({ customer_id: 1 });
    await db.collection('orders').createIndex({ date: -1 });
    
    await db.collection('billets').createIndex({ billet_number: 1 }, { unique: true });
    await db.collection('billets').createIndex({ customer_id: 1 });
    await db.collection('billets').createIndex({ due_date: 1 });
    
    await db.collection('visits').createIndex({ customer_id: 1 });
    await db.collection('visits').createIndex({ date: 1, time: 1 });
    
    // Users: evitar conflito com índice existente "email_1" (não único) e
    // preferir o índice composto parcial definido no schema (email + tenantId)
    try {
      const users = db.collection('users');
      const uIdx = await users.indexes();
      const hasEmail1 = uIdx.some(i => i.name === 'email_1' || JSON.stringify(i.key) === JSON.stringify({ email: 1 }));
      if (!hasEmail1) {
        // criar não-único apenas para busca por email; unicidade é garantida pelo índice parcial no schema
        await users.createIndex({ email: 1 });
        console.log('[indexes] Criado índice users.email_1 (não único)');
      } else {
        console.log('[indexes] users.email_1 já existe; pulando criação');
      }
    } catch (e) {
      console.warn('[indexes] Falha ao garantir índice em users.email_1:', e?.message || e);
    }

    console.log('Índices criados com sucesso');
  } catch (error) {
    console.error('Erro ao criar índices:', error.message);
  }
};

module.exports = connectDB;