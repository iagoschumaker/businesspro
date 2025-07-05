const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken, authenticateToken } = require('../middleware/auth');
const db = require('../database/connection');
const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);

        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
        }

        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        console.log('User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('User not found');
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        console.log('User status:', user.status);
        if (user.status !== 'Ativo') {
            console.log('User inactive');
            return res.status(401).json({ error: 'Usuário inativo' });
        }

        console.log('Comparing password');
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', validPassword ? 'Yes' : 'No');
        
        if (!validPassword) {
            console.log('Invalid password');
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Atualizar último login
        await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        const token = generateToken(user.id);
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: JSON.parse(user.permissions || '[]')
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Logout (opcional - pode ser feito apenas no frontend)
router.post('/logout', authenticateToken, (req, res) => {
    res.json({ message: 'Logout realizado com sucesso' });
});

module.exports = router;