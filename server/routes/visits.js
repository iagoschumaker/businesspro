const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const db = require('../database/connection');
const router = express.Router();

// Listar visitas
router.get('/', authenticateToken, requirePermission('Agenda'), async (req, res) => {
    try {
        const { date, user_id, status, page = 1, limit = 50 } = req.query;
        let sql = `
            SELECT v.*, c.name as customer_name, c.phone as customer_phone, 
                   u.name as user_name
            FROM visits v
            LEFT JOIN customers c ON v.customer_id = c.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (date) {
            sql += ' AND v.date = ?';
            params.push(date);
        }

        if (user_id) {
            sql += ' AND v.user_id = ?';
            params.push(user_id);
        }

        if (status) {
            sql += ' AND v.status = ?';
            params.push(status);
        }

        // Se não for admin, mostrar apenas visitas do próprio usuário
        if (req.user.role !== 'Administrador') {
            sql += ' AND v.user_id = ?';
            params.push(req.user.id);
        }

        sql += ' ORDER BY v.date DESC, v.time ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const visits = await db.all(sql, params);
        
        res.json(visits);
    } catch (error) {
        console.error('Erro ao buscar visitas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar visita por ID
router.get('/:id', authenticateToken, requirePermission('Agenda'), async (req, res) => {
    try {
        const visit = await db.get(`
            SELECT v.*, c.name as customer_name, c.email as customer_email, 
                   c.phone as customer_phone, c.address as customer_address,
                   u.name as user_name
            FROM visits v
            LEFT JOIN customers c ON v.customer_id = c.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `, [req.params.id]);
        
        if (!visit) {
            return res.status(404).json({ error: 'Visita não encontrada' });
        }

        // Verificar permissão (apenas admin ou dono da visita)
        if (req.user.role !== 'Administrador' && visit.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        res.json(visit);
    } catch (error) {
        console.error('Erro ao buscar visita:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar visita
router.post('/', authenticateToken, requirePermission('Agenda'), async (req, res) => {
    try {
        const { customer_id, date, time, location, type, notes, reminder = 30 } = req.body;

        if (!customer_id || !date || !time || !location || !type) {
            return res.status(400).json({ error: 'Campos obrigatórios: cliente, data, horário, local e tipo' });
        }

        // Verificar se cliente existe
        const customer = await db.get('SELECT id FROM customers WHERE id = ?', [customer_id]);
        if (!customer) {
            return res.status(400).json({ error: 'Cliente não encontrado' });
        }

        // Verificar conflito de horário para o usuário
        const conflictingVisit = await db.get(`
            SELECT id FROM visits 
            WHERE user_id = ? AND date = ? AND time = ? AND status != 'Cancelado'
        `, [req.user.id, date, time]);

        if (conflictingVisit) {
            return res.status(400).json({ error: 'Já existe uma visita agendada para este horário' });
        }

        const result = await db.run(`
            INSERT INTO visits (customer_id, user_id, date, time, location, type, notes, reminder)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [customer_id, req.user.id, date, time, location, type, notes, reminder]);

        const visit = await db.get(`
            SELECT v.*, c.name as customer_name, u.name as user_name
            FROM visits v
            LEFT JOIN customers c ON v.customer_id = c.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `, [result.id]);
        
        res.status(201).json(visit);
    } catch (error) {
        console.error('Erro ao criar visita:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar visita
router.put('/:id', authenticateToken, requirePermission('Agenda'), async (req, res) => {
    try {
        const { customer_id, date, time, location, type, notes, reminder, status } = req.body;

        const visit = await db.get('SELECT * FROM visits WHERE id = ?', [req.params.id]);
        if (!visit) {
            return res.status(404).json({ error: 'Visita não encontrada' });
        }

        // Verificar permissão (apenas admin ou dono da visita)
        if (req.user.role !== 'Administrador' && visit.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        await db.run(`
            UPDATE visits 
            SET customer_id = ?, date = ?, time = ?, location = ?, type = ?, 
                notes = ?, reminder = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [customer_id, date, time, location, type, notes, reminder, 
            status || visit.status, req.params.id]);

        const updatedVisit = await db.get(`
            SELECT v.*, c.name as customer_name, u.name as user_name
            FROM visits v
            LEFT JOIN customers c ON v.customer_id = c.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `, [req.params.id]);
        
        res.json(updatedVisit);
    } catch (error) {
        console.error('Erro ao atualizar visita:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar status da visita
router.patch('/:id/status', authenticateToken, requirePermission('Agenda'), async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'Status é obrigatório' });
        }

        const visit = await db.get('SELECT * FROM visits WHERE id = ?', [req.params.id]);
        if (!visit) {
            return res.status(404).json({ error: 'Visita não encontrada' });
        }

        // Verificar permissão (apenas admin ou dono da visita)
        if (req.user.role !== 'Administrador' && visit.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        await db.run('UPDATE visits SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);

        const updatedVisit = await db.get(`
            SELECT v.*, c.name as customer_name, u.name as user_name
            FROM visits v
            LEFT JOIN customers c ON v.customer_id = c.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `, [req.params.id]);
        
        res.json(updatedVisit);
    } catch (error) {
        console.error('Erro ao atualizar status da visita:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar visita
router.delete('/:id', authenticateToken, requirePermission('Agenda'), async (req, res) => {
    try {
        const visit = await db.get('SELECT * FROM visits WHERE id = ?', [req.params.id]);
        if (!visit) {
            return res.status(404).json({ error: 'Visita não encontrada' });
        }

        // Verificar permissão (apenas admin ou dono da visita)
        if (req.user.role !== 'Administrador' && visit.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        await db.run('DELETE FROM visits WHERE id = ?', [req.params.id]);
        
        res.json({ message: 'Visita excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir visita:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;