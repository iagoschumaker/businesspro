const jwt = require('jsonwebtoken');
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