const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Plan = require('../models/Plan');

async function checkSuperAdmin() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/businesspro');
    console.log('Conectado ao MongoDB');

    // Verificar se existem planos
    const plansCount = await Plan.countDocuments();
    console.log(`Total de planos: ${plansCount}`);

    if (plansCount === 0) {
      console.log('Nenhum plano encontrado. Criando planos...');
      
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
          isActive: true,
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
            { name: 'Pedidos Completos', enabled: true },
            { name: 'Relatórios Avançados', enabled: true },
            { name: 'Suporte Prioritário', enabled: true },
            { name: 'Backup Automático', enabled: true }
          ],
          isActive: true,
          order: 2
        }
      ];

      for (const planData of plans) {
        const existingPlan = await Plan.findOne({ slug: planData.slug });
        if (!existingPlan) {
          const plan = new Plan(planData);
          await plan.save();
          console.log(`Plano ${planData.name} criado`);
        }
      }
    }

    // Verificar SuperAdmin
    const superAdmin = await User.findOne({ role: 'SuperAdmin' });
    
    if (superAdmin) {
      console.log('SuperAdmin encontrado:');
      console.log(`- ID: ${superAdmin._id}`);
      console.log(`- Nome: ${superAdmin.name}`);
      console.log(`- Email: ${superAdmin.email}`);
      console.log(`- Role: ${superAdmin.role}`);
      console.log(`- TenantId: ${superAdmin.tenantId || 'null'}`);
      console.log(`- isSuperAdmin: ${superAdmin.isSuperAdmin}`);
    } else {
      console.log('SuperAdmin não encontrado. Criando...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newSuperAdmin = new User({
        name: 'Super Administrador',
        email: 'superadmin@businesspro.com',
        password: hashedPassword,
        role: 'SuperAdmin',
        tenantId: null,
        isSuperAdmin: true
      });

      await newSuperAdmin.save();
      console.log('SuperAdmin criado com sucesso!');
      console.log('Email: superadmin@businesspro.com');
      console.log('Senha: admin123');
    }

    // Listar todos os planos
    const allPlans = await Plan.find().sort({ order: 1 });
    console.log('\nPlanos disponíveis:');
    allPlans.forEach(plan => {
      console.log(`- ${plan.name} (${plan.slug}) - R$ ${plan.price.monthly}/mês`);
    });

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado do MongoDB');
  }
}

checkSuperAdmin();
