const jwt = require('jsonwebtoken');
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