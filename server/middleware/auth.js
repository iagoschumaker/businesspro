const jwt = require('jsonwebtoken');
<<<<<<< HEAD
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    if (user.status !== 'Ativo') {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const checkPermission = () => {
  return (req, res, next) => {
    try {
      if (!req?.user) return res.status(401).json({ error: 'Não autenticado' });
      const user = req.user;
      // Permitir SuperAdmin em todas as rotas
      if (user.isSuperAdmin) return next();
      // Admin-only: apenas Administrador acessa rotas protegidas
      if (user.role === 'Administrador') return next();
      return res.status(403).json({ error: 'Acesso permitido apenas para Administrador' });
    } catch (e) {
      return res.status(403).json({ error: 'Acesso permitido apenas para Administrador' });
    }
  };
};

module.exports = { auth, checkPermission };
=======
const db = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'businesspro_secret_key_2024';

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.get('SELECT * FROM users WHERE id = ? AND status = "Ativo"', [decoded.userId]);
        
        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: JSON.parse(user.permissions || '[]')
        };
        
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// Middleware de autorização por permissão
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        if (req.user.role === 'Administrador' || req.user.permissions.includes(permission)) {
            next();
        } else {
            res.status(403).json({ error: 'Permissão insuficiente' });
        }
    };
};

// Gerar token JWT
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

module.exports = {
    authenticateToken,
    requirePermission,
    generateToken,
    JWT_SECRET
};
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
