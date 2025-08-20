const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para extrair tenant do subdomínio ou header
const extractTenant = async (req, res, next) => {
  try {
    let tenantIdentifier = null;

    // 1. Tentar extrair do header X-Tenant-ID (para APIs)
    if (req.headers['x-tenant-id']) {
      tenantIdentifier = req.headers['x-tenant-id'];
    }
    
    // 2. Tentar extrair do subdomínio
    else if (req.headers.host) {
      const host = req.headers.host.split(':')[0]; // Remove porta se existir
      const parts = host.split('.');
      
      if (parts.length > 2) {
        tenantIdentifier = parts[0]; // Primeiro subdomínio
      }
    }

    // 3. Se não encontrou tenant, NÃO permitir prosseguir em rotas com escopo de tenant,
    //    mesmo para SuperAdmin. O cliente deve informar o tenant via subdomínio ou X-Tenant-ID.
    if (!tenantIdentifier) {
      // Rotas públicas continuam liberadas
      const publicRoutes = ['/api/auth/login', '/api/auth/register-simple', '/api/health', '/api/super-admin'];
      const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));
      if (isPublicRoute) return next();
      // Em rotas de tenant, exigir explicitamente o tenant
      return res.status(400).json({
        error: 'Tenant não identificado. Use subdomínio ou header X-Tenant-ID.'
      });
    }

    // Buscar tenant no banco
    let tenant = null;
    const identifier = String(tenantIdentifier || '').toLowerCase();
    const isObjectId = /^[a-f\d]{24}$/.test(identifier);
    if (isObjectId) {
      // Permitir identificar por ObjectId no header
      tenant = await Tenant.findById(identifier);
    }
    if (!tenant) {
      tenant = await Tenant.findOne({ subdomain: identifier });
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    if (!tenant.isActive()) {
      return res.status(403).json({ 
        error: 'Tenant inativo ou assinatura expirada' 
      });
    }

    // Adicionar tenant ao request
    req.tenant = tenant;
    req.tenantId = tenant._id;

    next();
  } catch (error) {
    console.error('Erro no middleware de tenant:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para verificar se usuário pertence ao tenant
const validateTenantUser = async (req, res, next) => {
  try {
    // SuperAdmins podem acessar qualquer tenant
    if (req.user && req.user.isSuperAdmin) {
      return next();
    }

    // Verificar se usuário pertence ao tenant atual (com checagens seguras)
    if (req.user && req.tenantId) {
      const userTenantId = req.user.tenantId ? req.user.tenantId.toString() : null;
      const currentTenantId = req.tenantId.toString();
      if (!userTenantId || userTenantId !== currentTenantId) {
        return res.status(403).json({ 
          error: 'Usuário não tem acesso a este tenant' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('Erro na validação de tenant do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para verificar limites do plano
const checkPlanLimits = (resource) => {
  return async (req, res, next) => {
    try {
      // SuperAdmins não têm limites
      if (req.user && req.user.isSuperAdmin) {
        return next();
      }

      if (!req.tenant) {
        return res.status(400).json({ error: 'Tenant não identificado' });
      }

      let canCreate = false;
      let limitMessage = '';

      switch (resource) {
        case 'user':
          canCreate = req.tenant.canCreateUser();
          limitMessage = `Limite de usuários atingido (${req.tenant.planLimits.users})`;
          break;
        case 'customer':
          canCreate = req.tenant.canCreateCustomer();
          limitMessage = `Limite de clientes atingido (${req.tenant.planLimits.customers})`;
          break;
        case 'product':
          canCreate = req.tenant.canCreateProduct();
          limitMessage = `Limite de produtos atingido (${req.tenant.planLimits.products})`;
          break;
        default:
          canCreate = true;
      }

      if (!canCreate) {
        return res.status(403).json({ 
          error: limitMessage,
          upgrade: true
        });
      }

      next();
    } catch (error) {
      console.error('Erro na verificação de limites:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

// Middleware para SuperAdmin apenas
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas Super Administradores.' 
    });
  }
  next();
};

module.exports = {
  extractTenant,
  validateTenantUser,
  checkPlanLimits,
  requireSuperAdmin
};
