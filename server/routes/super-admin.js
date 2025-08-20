const express = require('express');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/tenant');

const router = express.Router();

// Middleware para todas as rotas - apenas SuperAdmin
router.use(auth);
router.use(requireSuperAdmin);

// Dashboard - Métricas gerais
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      totalUsers,
      totalCustomers,
      totalOrders,
      recentTenants
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'active' }),
      Tenant.countDocuments({ status: 'trial' }),
      User.countDocuments({ role: { $ne: 'SuperAdmin' } }),
      Customer.countDocuments(),
      Order.countDocuments(),
      Tenant.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name subdomain status plan createdAt')
    ]);

    // Métricas de receita (simulada - integrar com sistema de pagamento real)
    const monthlyRevenue = await calculateMonthlyRevenue();
    
    res.json({
      metrics: {
        tenants: {
          total: totalTenants,
          active: activeTenants,
          trial: trialTenants,
          suspended: totalTenants - activeTenants - trialTenants
        },
        users: totalUsers,
        customers: totalCustomers,
        orders: totalOrders,
        revenue: monthlyRevenue
      },
      recentTenants
    });
  } catch (error) {
    console.error('Erro no dashboard super admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os tenants
router.get('/tenants', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, plan, search } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (plan) filter.plan = plan;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subdomain: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } }
      ];
    }

    const tenants = await Tenant.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('usage');

    const total = await Tenant.countDocuments(filter);

    res.json({
      tenants,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Erro ao listar tenants:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo tenant
router.post('/tenants', async (req, res) => {
  try {
    const {
      name,
      subdomain,
      plan = 'trial',
      contact,
      billing
    } = req.body;

    // Se subdomínio foi enviado, normalizar e checar duplicidade
    let normalizedSub = subdomain;
    if (normalizedSub && typeof normalizedSub === 'string') {
      normalizedSub = normalizedSub.toLowerCase().trim();
      const existingTenant = await Tenant.findOne({ subdomain: normalizedSub });
      if (existingTenant) {
        return res.status(400).json({ error: 'Subdomínio já está em uso' });
      }
    }

    // Buscar configurações do plano (opcional). Se não existir, usar defaults do schema
    let planConfig = null;
    if (plan) {
      planConfig = await Plan.findOne({ slug: plan });
    }
    // Se não encontrou o plano solicitado, coerção para 'trial' com defaults
    const resolvedPlan = planConfig ? plan : 'trial';

    const baseTenant = {
      name,
      subdomain: normalizedSub, // pode estar undefined; o model gerará
      slug: normalizedSub, // espelha subdomain para compatibilidade com índice único existente (slug_1)
      plan: resolvedPlan,
      contact,
      billing,
      subscription: {
        startDate: new Date(),
        endDate: resolvedPlan === 'trial' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
      }
    };

    // Só atribuir planLimits quando houver planConfig; caso contrário, usar defaults do schema
    if (planConfig?.limits) {
      baseTenant.planLimits = planConfig.limits;
    }

    const tenant = new Tenant(baseTenant);

    await tenant.save();

    res.status(201).json(tenant);
  } catch (error) {
    console.error('Erro ao criar tenant:', error);
    // Duplicidade de subdomínio
    if (error && error.code === 11000) {
      return res.status(400).json({ error: 'Subdomínio já está em uso' });
    }
    // Erros de validação do Mongoose
    if (error?.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({ error: 'Dados inválidos', details: messages });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter detalhes de um tenant
router.get('/tenants/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    // Buscar estatísticas do tenant
    const [userCount, customerCount, productCount, orderCount] = await Promise.all([
      User.countDocuments({ tenantId: tenant._id }),
      Customer.countDocuments({ tenantId: tenant._id }),
      Product.countDocuments({ tenantId: tenant._id }),
      Order.countDocuments({ tenantId: tenant._id })
    ]);

    // Atualizar usage no tenant
    tenant.usage = {
      users: userCount,
      customers: customerCount,
      products: productCount,
      orders: orderCount
    };
    await tenant.save();

    res.json(tenant);
  } catch (error) {
    console.error('Erro ao obter tenant:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar tenant
router.put('/tenants/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('Erro ao atualizar tenant:', error);
    if (error && error.code === 11000) {
      return res.status(400).json({ error: 'Subdomínio já está em uso' });
    }
    if (error?.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({ error: 'Dados inválidos', details: messages });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Suspender/Ativar tenant
router.patch('/tenants/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'suspended', 'trial', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('Erro ao alterar status do tenant:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir tenant e seus usuários
router.delete('/tenants/:id', async (req, res) => {
  try {
    const tenantId = req.params.id;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    // Deletar usuários do tenant
    const usersResult = await User.deleteMany({ tenantId });

    // Deletar o tenant
    await Tenant.findByIdAndDelete(tenantId);

    return res.json({
      message: 'Tenant e usuários excluídos com sucesso',
      deleted: {
        users: usersResult?.deletedCount || 0,
        tenant: 1
      }
    });
  } catch (error) {
    console.error('Erro ao excluir tenant:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar usuários de um tenant
router.get('/tenants/:id/users', async (req, res) => {
  try {
    const users = await User.find({ tenantId: req.params.id })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Erro ao listar usuários do tenant:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerenciar planos
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ order: 1 });
    res.json(plans);
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const plan = new Plan(req.body);
    await plan.save();
    res.status(201).json(plan);
  } catch (error) {
    console.error('Erro ao criar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função auxiliar para calcular receita mensal (simulada)
async function calculateMonthlyRevenue() {
  const activeTenants = await Tenant.find({ status: 'active' });
  
  let monthlyRevenue = 0;
  for (const tenant of activeTenants) {
    const plan = await Plan.findOne({ slug: tenant.plan });
    if (plan) {
      monthlyRevenue += plan.price.monthly;
    }
  }
  
  return monthlyRevenue;
}

module.exports = router;
