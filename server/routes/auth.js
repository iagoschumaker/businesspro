const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Registro simples (apenas email e senha)
router.post('/register-simple', async (req, res) => {
  try {
    const { email, password, tenantSubdomain, role, isSuperAdmin } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Se não houver tenantSubdomain, somente permitir criação como SuperAdmin
    if (!tenantSubdomain && !isSuperAdmin) {
      return res.status(400).json({ error: 'Informe tenantSubdomain ou defina isSuperAdmin=true para criar sem tenant' });
    }

    let tenantId = undefined;
    if (tenantSubdomain) {
      const Tenant = require('../models/Tenant');
      const tenant = await Tenant.findOne({ subdomain: String(tenantSubdomain).toLowerCase() });
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant não encontrado' });
      }
      if (!tenant.isActive()) {
        return res.status(403).json({ error: 'Tenant inativo ou assinatura expirada' });
      }
      tenantId = tenant._id;

      // Verificar duplicidade por email + tenant
      const existingTenantUser = await User.findOne({ email: email.toLowerCase(), tenantId });
      if (existingTenantUser) {
        return res.status(409).json({ error: 'Usuário já existe neste tenant' });
      }
    } else {
      // Criando SuperAdmin sem tenant: prevenir duplicidade de superadmin por email
      const existingSuper = await User.findOne({ email: email.toLowerCase(), isSuperAdmin: true });
      if (existingSuper) {
        return res.status(409).json({ error: 'Já existe um SuperAdmin com este email' });
      }
    }

    // Garantir coerência: se isSuperAdmin=true, forçar role 'SuperAdmin' e não exigir tenantId
    const finalRole = isSuperAdmin ? 'SuperAdmin' : (role || 'Vendedor');

    const newUser = new User({
      email: email.toLowerCase(),
      password,
      role: finalRole,
      tenantId,
      isSuperAdmin: Boolean(isSuperAdmin),
      status: 'Ativo'
    });

    await newUser.save();

    return res.status(201).json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId,
        isSuperAdmin: newUser.isSuperAdmin,
        permissions: newUser.permissions
      }
    });
  } catch (error) {
    console.error('Erro no registro simples:', error);
    // Erros de validação (ex.: tenantId requerido quando role não é SuperAdmin)
    if (error && error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
    }
    // Duplicidade de chave (índices únicos)
    if (error && (error.code === 11000 || error.code === '11000')) {
      return res.status(409).json({ error: 'Registro duplicado', details: error.keyValue });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, tenantSubdomain } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    let user;

    if (!tenantSubdomain) {
      // 1) Permitir SuperAdmin sem tenant
      const superAdmin = await User.findOne({ email: email.toLowerCase(), isSuperAdmin: true });
      if (superAdmin) {
        user = superAdmin;
      } else {
        // 2) Tentar localizar usuário de tenant por email
        const candidates = await User.find({ email: email.toLowerCase(), isSuperAdmin: { $ne: true } });
        if (!candidates || candidates.length === 0) {
          return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        if (candidates.length > 1) {
          return res.status(400).json({ error: 'E-mail vinculado a múltiplos tenants. Informe o subdomínio para continuar.' });
        }
        user = candidates[0];

        // Validar tenant ativo
        if (user.tenantId) {
          const Tenant = require('../models/Tenant');
          const tenant = await Tenant.findById(user.tenantId);
          if (!tenant) {
            return res.status(404).json({ error: 'Tenant não encontrado' });
          }
          if (!tenant.isActive()) {
            return res.status(403).json({ error: 'Tenant inativo ou assinatura expirada' });
          }
        }
      }
    } else {
      // Buscar tenant explicitamente pelo subdomínio
      const Tenant = require('../models/Tenant');
      const tenant = await Tenant.findOne({ subdomain: tenantSubdomain.toLowerCase() });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant não encontrado' });
      }

      if (!tenant.isActive()) {
        return res.status(403).json({ error: 'Tenant inativo ou assinatura expirada' });
      }

      // Buscar usuário do tenant
      user = await User.findOne({ email: email.toLowerCase(), tenantId: tenant._id });
      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (user.status !== 'Ativo') {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    // Atualizar último login
    user.last_login = new Date();
    await user.save();

    const token = jwt.sign(
      { 
        id: user._id,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Tentar expor o subdomínio do tenant no payload de resposta para o frontend
    let resolvedTenantSubdomain = null;
    try {
      if (user.tenantId) {
        const Tenant = require('../models/Tenant');
        const t = await Tenant.findById(user.tenantId);
        if (t && t.subdomain) {
          resolvedTenantSubdomain = String(t.subdomain).toLowerCase();
        }
      }
    } catch (_) {
      // silêncio: informação auxiliar apenas
    }

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin,
        permissions: user.permissions
      },
      tenantSubdomain: resolvedTenantSubdomain
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
router.get('/verify', auth, async (req, res) => {
  try {
    // Resolver subdomínio do tenant para que o frontend possa persistir
    let resolvedTenantSubdomain = null;
    try {
      if (req.user && req.user.tenantId) {
        const Tenant = require('../models/Tenant');
        const t = await Tenant.findById(req.user.tenantId);
        if (t && t.subdomain) {
          resolvedTenantSubdomain = String(t.subdomain).toLowerCase();
        }
      }
    } catch (_) {
      // silencioso
    }

    res.json({ user: req.user, tenantSubdomain: resolvedTenantSubdomain });
  } catch (error) {
    console.error('Erro na verificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Renovar token (somente com token válido)
router.post('/refresh', auth, async (req, res) => {
  try {
    const user = req.user;
    const token = jwt.sign(
      {
        id: user._id,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.json({ token });
  } catch (error) {
    console.error('Erro no refresh:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;