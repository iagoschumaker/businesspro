const express = require('express');
<<<<<<< HEAD

const router = express.Router();

// Users API desativada: retorna 404 para qualquer requisição
router.all('*', (req, res) => {
  return res.status(404).json({ error: 'Users API desativada' });
=======
const bcrypt = require('bcryptjs');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const db = require('../database/connection');
const router = express.Router();

// Listar usuários (apenas admin)
router.get('/', authenticateToken, requirePermission('Usuários'), async (req, res) => {
    try {
        const { search, role, status, page = 1, limit = 50 } = req.query;
        let sql = 'SELECT id, name, email, role, permissions, status, created_at, last_login FROM users WHERE 1=1';
        const params = [];

        if (search) {
            sql += ' AND (name LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (role) {
            sql += ' AND role = ?';
            params.push(role);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const users = await db.all(sql, params);
        
        // Parse permissions JSON
        users.forEach(user => {
            user.permissions = JSON.parse(user.permissions || '[]');
        });

        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar usuário por ID
router.get('/:id', authenticateToken, requirePermission('Usuários'), async (req, res) => {
    try {
        const user = await db.get(
            'SELECT id, name, email, role, permissions, status, created_at, last_login FROM users WHERE id = ?', 
            [req.params.id]
        );
        
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        user.permissions = JSON.parse(user.permissions || '[]');

        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar usuário (apenas admin)
router.post('/', authenticateToken, requirePermission('Usuários'), async (req, res) => {
    try {
        const { name, email, password, role, permissions } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Campos obrigatórios: nome, e-mail, senha e cargo' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
        }

        // Verificar se e-mail já existe
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'Já existe um usuário com este e-mail' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.run(`
            INSERT INTO users (name, email, password, role, permissions)
            VALUES (?, ?, ?, ?, ?)
        `, [name, email, hashedPassword, role, JSON.stringify(permissions || [])]);

        const user = await db.get(
            'SELECT id, name, email, role, permissions, status, created_at FROM users WHERE id = ?', 
            [result.id]
        );
        
        user.permissions = JSON.parse(user.permissions || '[]');
        
        res.status(201).json(user);
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar usuário
router.put('/:id', authenticateToken, requirePermission('Usuários'), async (req, res) => {
    try {
        const { name, email, role, permissions, status } = req.body;

        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Não permitir que o usuário desative a si mesmo
        if (req.user.id === parseInt(req.params.id) && status === 'Inativo') {
            return res.status(400).json({ error: 'Você não pode desativar sua própria conta' });
        }

        await db.run(`
            UPDATE users 
            SET name = ?, email = ?, role = ?, permissions = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, email, role, JSON.stringify(permissions || []), status || user.status, req.params.id]);

        const updatedUser = await db.get(
            'SELECT id, name, email, role, permissions, status, created_at, last_login FROM users WHERE id = ?', 
            [req.params.id]
        );
        
        updatedUser.permissions = JSON.parse(updatedUser.permissions || '[]');
        
        res.json(updatedUser);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Alterar senha
router.patch('/:id/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Usuário só pode alterar sua própria senha, exceto admin
        if (req.user.role !== 'Administrador' && req.user.id !== parseInt(req.params.id)) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
        }

        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Se não for admin, verificar senha atual
        if (req.user.role !== 'Administrador') {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Senha atual é obrigatória' });
            }

            const validPassword = await bcrypt.compare(currentPassword, user.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'Senha atual incorreta' });
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await db.run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                    [hashedPassword, req.params.id]);
        
        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar usuário (apenas admin)
router.delete('/:id', authenticateToken, requirePermission('Usuários'), async (req, res) => {
    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Não permitir que o usuário exclua a si mesmo
        if (req.user.id === parseInt(req.params.id)) {
            return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
        }

        // Verificar se usuário tem dados associados
        const hasData = await db.get(`
            SELECT 
                (SELECT COUNT(*) FROM orders WHERE user_id = ?) +
                (SELECT COUNT(*) FROM visits WHERE user_id = ?) as total
        `, [req.params.id, req.params.id]);

        if (hasData.total > 0) {
            return res.status(400).json({ error: 'Não é possível excluir usuário com dados associados' });
        }

        await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
        
        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
});

module.exports = router;