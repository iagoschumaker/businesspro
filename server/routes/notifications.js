const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/connection');
const router = express.Router();

// Listar notificações do usuário
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, unread_only = false } = req.query;
        let sql = `
            SELECT * FROM notifications 
            WHERE user_id = ? OR user_id IS NULL
        `;
        const params = [req.user.id];

        if (unread_only === 'true') {
            sql += ' AND read = FALSE';
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const notifications = await db.all(sql, params);
        
        res.json(notifications);
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Marcar notificação como lida
router.patch('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await db.get('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
        
        if (!notification) {
            return res.status(404).json({ error: 'Notificação não encontrada' });
        }

        // Verificar se a notificação pertence ao usuário
        if (notification.user_id && notification.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        await db.run('UPDATE notifications SET read = TRUE WHERE id = ?', [req.params.id]);
        
        res.json({ message: 'Notificação marcada como lida' });
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Marcar todas as notificações como lidas
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        await db.run(`
            UPDATE notifications 
            SET read = TRUE 
            WHERE (user_id = ? OR user_id IS NULL) AND read = FALSE
        `, [req.user.id]);
        
        res.json({ message: 'Todas as notificações foram marcadas como lidas' });
    } catch (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar notificação (sistema interno)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { user_id, type, title, message } = req.body;

        if (!type || !title || !message) {
            return res.status(400).json({ error: 'Tipo, título e mensagem são obrigatórios' });
        }

        const result = await db.run(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, ?, ?, ?)
        `, [user_id, type, title, message]);

        const notification = await db.get('SELECT * FROM notifications WHERE id = ?', [result.id]);
        
        res.status(201).json(notification);
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;