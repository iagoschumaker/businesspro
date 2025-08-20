const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Plan = require('../models/Plan');

async function seedSaasData() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/businesspro');
    console.log('Conectado ao MongoDB');

    // Criar planos padrão
    console.log('Criando planos...');
    
    const plans = [
      {
        name: 'Trial',
        slug: 'trial',
        description: 'Teste grátis por 30 dias',
        price: { monthly: 0, yearly: 0 },
        limits: {
          users: 2,
          customers: 50,
          products: 25,
          storage: 500,
          apiRequests: 500
        },
        features: [
          { name: 'Gestão de Clientes', enabled: true },
          { name: 'Gestão de Produtos', enabled: true },
          { name: 'Pedidos Básicos', enabled: true },
          { name: 'Relatórios Básicos', enabled: true },
          { name: 'Suporte por Email', enabled: true }
        ],
        order: 1
      },
      {
        name: 'Básico',
        slug: 'basic',
        description: 'Ideal para pequenas empresas',
        price: { monthly: 49.90, yearly: 499.90 },
        limits: {
          users: 5,
          customers: 500,
          products: 200,
          storage: 2048,
          apiRequests: 2000
        },
        features: [
          { name: 'Gestão de Clientes', enabled: true },
          { name: 'Gestão de Produtos', enabled: true },
          { name: 'Pedidos Avançados', enabled: true },
          { name: 'Relatórios Avançados', enabled: true },
          { name: 'Suporte por Email', enabled: true },
          { name: 'Backup Automático', enabled: true }
        ],
        order: 2
      },
      {
        name: 'Profissional',
        slug: 'professional',
        description: 'Para empresas em crescimento',
        price: { monthly: 99.90, yearly: 999.90 },
        limits: {
          users: 15,
          customers: 2000,
          products: 1000,
          storage: 5120,
          apiRequests: 5000
        },
        features: [
          { name: 'Gestão de Clientes', enabled: true },
          { name: 'Gestão de Produtos', enabled: true },
          { name: 'Pedidos Avançados', enabled: true },
          { name: 'Relatórios Avançados', enabled: true },
          { name: 'API Completa', enabled: true },
          { name: 'Integrações', enabled: true },
          { name: 'Suporte Prioritário', enabled: true },
          { name: 'Backup Automático', enabled: true },
          { name: 'Multi-usuários', enabled: true }
        ],
        order: 3
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Para grandes empresas',
        price: { monthly: 199.90, yearly: 1999.90 },
        limits: {
          users: 50,
          customers: 10000,
          products: 5000,
          storage: 20480,
          apiRequests: 20000
        },
        features: [
          { name: 'Gestão de Clientes', enabled: true },
          { name: 'Gestão de Produtos', enabled: true },
          { name: 'Pedidos Avançados', enabled: true },
          { name: 'Relatórios Avançados', enabled: true },
          { name: 'API Completa', enabled: true },
          { name: 'Integrações Ilimitadas', enabled: true },
          { name: 'Suporte 24/7', enabled: true },
          { name: 'Backup Automático', enabled: true },
          { name: 'Multi-usuários Ilimitado', enabled: true },
          { name: 'Domínio Personalizado', enabled: true },
          { name: 'SLA Garantido', enabled: true }
        ],
        order: 4
      }
    ];

    // Limpar planos existentes
    await Plan.deleteMany({});
    
    // Inserir novos planos
    for (const planData of plans) {
      const plan = new Plan(planData);
      await plan.save();
      console.log(`Plano ${plan.name} criado`);
    }

    // Criar SuperAdmin
    console.log('Criando SuperAdmin...');
    
    // Verificar se já existe um SuperAdmin
    let existingSuperAdmin = await User.findOne({ 
      $or: [
        { isSuperAdmin: true },
        { email: 'admin@businesspro.com' }
      ]
    });
    
    if (!existingSuperAdmin) {
      const superAdmin = new User({
        name: 'Super Administrador',
        email: 'admin@businesspro.com',
        password: 'admin123456', // Será hasheado automaticamente
        role: 'SuperAdmin',
        isSuperAdmin: true,
        status: 'Ativo'
      });

      await superAdmin.save();
      console.log('SuperAdmin criado com sucesso!');
      console.log('Email: admin@businesspro.com');
      console.log('Senha: admin123456');
    } else {
      // Se existe mas não é SuperAdmin, atualizar
      if (!existingSuperAdmin.isSuperAdmin) {
        existingSuperAdmin.role = 'SuperAdmin';
        existingSuperAdmin.isSuperAdmin = true;
        existingSuperAdmin.tenantId = undefined;
        await existingSuperAdmin.save();
        console.log('Usuário existente atualizado para SuperAdmin');
      } else {
        console.log('SuperAdmin já existe');
      }
    }

    // Criar tenant de demonstração
    console.log('Criando tenant de demonstração...');
    
    const existingTenant = await Tenant.findOne({ subdomain: 'demo' });
    
    if (!existingTenant) {
      const basicPlan = await Plan.findOne({ slug: 'basic' });
      
      const demoTenant = new Tenant({
        name: 'Empresa Demonstração',
        subdomain: 'demo',
        status: 'active',
        plan: 'basic',
        planLimits: basicPlan.limits,
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
        }
      });

      await demoTenant.save();
      console.log('Tenant demo criado');

      // Criar usuário administrador para o tenant demo
      const adminUser = new User({
        name: 'Administrador Demo',
        email: 'admin@demo.com',
        password: 'demo123456',
        role: 'Administrador',
        tenantId: demoTenant._id,
        status: 'Ativo'
      });

      await adminUser.save();
      console.log('Usuário admin do tenant demo criado');
      console.log('Acesso: demo.localhost:3001');
      console.log('Email: admin@demo.com');
      console.log('Senha: demo123456');
    } else {
      console.log('Tenant demo já existe');
    }

    console.log('\n=== SEED CONCLUÍDO ===');
    console.log('SuperAdmin: admin@businesspro.com / admin123456');
    console.log('Demo Tenant: demo.localhost:3001');
    console.log('Demo Admin: admin@demo.com / demo123456');
    
  } catch (error) {
    console.error('Erro no seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedSaasData();
}

module.exports = seedSaasData;
