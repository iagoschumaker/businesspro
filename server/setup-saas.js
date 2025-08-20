const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupSaas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/businesspro');
    console.log('✅ Conectado ao MongoDB');

    // Remover índices problemáticos da collection users
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    try {
      await usersCollection.dropIndex('email_1');
      console.log('✅ Índice email_1 removido');
    } catch (e) {
      console.log('ℹ️  Índice email_1 não existia');
    }

    // Remover usuário admin existente se houver
    await usersCollection.deleteMany({ email: 'admin@businesspro.com' });
    console.log('✅ Usuários admin antigos removidos');

    // Criar planos
    const plansCollection = db.collection('plans');
    await plansCollection.deleteMany({});
    
    const plans = [
      {
        name: 'Trial',
        slug: 'trial',
        description: 'Teste grátis por 30 dias',
        price: { monthly: 0, yearly: 0 },
        limits: { users: 2, customers: 50, products: 25, storage: 500, apiRequests: 500 },
        features: [
          { name: 'Gestão de Clientes', enabled: true },
          { name: 'Gestão de Produtos', enabled: true }
        ],
        isActive: true,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Básico',
        slug: 'basic',
        description: 'Ideal para pequenas empresas',
        price: { monthly: 49.90, yearly: 499.90 },
        limits: { users: 5, customers: 500, products: 200, storage: 2048, apiRequests: 2000 },
        features: [
          { name: 'Gestão de Clientes', enabled: true },
          { name: 'Gestão de Produtos', enabled: true },
          { name: 'Relatórios Avançados', enabled: true }
        ],
        isActive: true,
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await plansCollection.insertMany(plans);
    console.log('✅ Planos criados');

    // Criar SuperAdmin
    const hashedPassword = await bcrypt.hash('admin123456', 10);
    
    await usersCollection.insertOne({
      name: 'Super Administrador',
      email: 'admin@businesspro.com',
      password: hashedPassword,
      role: 'SuperAdmin',
      isSuperAdmin: true,
      status: 'Ativo',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ SuperAdmin criado');

    // Criar tenant demo
    const tenantsCollection = db.collection('tenants');
    await tenantsCollection.deleteMany({ subdomain: 'demo' });
    
    const demoTenant = {
      name: 'Empresa Demonstração',
      subdomain: 'demo',
      status: 'active',
      plan: 'basic',
      planLimits: { users: 5, customers: 500, products: 200, storage: 2048 },
      contact: {
        name: 'João Silva',
        email: 'joao@demo.com',
        phone: '(11) 99999-9999'
      },
      billing: {
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        country: 'Brasil',
        taxId: '12.345.678/0001-90'
      },
      usage: { users: 0, customers: 0, products: 0, storageUsed: 0 },
      subscription: {
        startDate: new Date(),
        autoRenew: true,
        paymentStatus: 'active'
      },
      settings: {
        allowCustomDomain: false,
        enableAPI: true,
        maxAPIRequests: 2000
      },
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertedTenant = await tenantsCollection.insertOne(demoTenant);
    console.log('✅ Tenant demo criado');

    // Criar admin do tenant demo
    const demoAdminPassword = await bcrypt.hash('demo123456', 10);
    
    await usersCollection.insertOne({
      name: 'Administrador Demo',
      email: 'admin@demo.com',
      password: demoAdminPassword,
      role: 'Administrador',
      tenantId: insertedTenant.insertedId,
      isSuperAdmin: false,
      status: 'Ativo',
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Admin do tenant demo criado');

    console.log('\n🎉 SETUP SAAS CONCLUÍDO!');
    console.log('📧 SuperAdmin: admin@businesspro.com / admin123456');
    console.log('🏢 Demo Tenant: demo.localhost:3001');
    console.log('👤 Demo Admin: admin@demo.com / demo123456');
    
  } catch (error) {
    console.error('❌ Erro no setup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

setupSaas();
