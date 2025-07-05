const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const db = require('../database/connection');
const router = express.Router();

// Listar clientes
router.get('/', authenticateToken, requirePermission('Clientes'), async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        let sql = 'SELECT * FROM customers WHERE 1=1';
        const params = [];

        if (search) {
            sql += ' AND (name LIKE ? OR document LIKE ? OR phone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const customers = await db.all(sql, params);
        
        // Buscar estatísticas de cada cliente
        for (let customer of customers) {
            const stats = await db.get(`
                SELECT 
                    COUNT(o.id) as total_orders,
                    COALESCE(SUM(o.total), 0) as total_value,
                    MAX(o.date) as last_order
                FROM orders o 
                WHERE o.customer_id = ?
            `, [customer.id]);
            
            customer.orders = stats.total_orders || 0;
            customer.totalValue = stats.total_value || 0;
            customer.lastOrder = stats.last_order;
        }

        res.json(customers);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar cliente por ID
router.get('/:id', authenticateToken, requirePermission('Clientes'), async (req, res) => {
    try {
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        
        if (!customer) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Buscar pedidos do cliente
        const orders = await db.all(`
            SELECT o.*, COUNT(oi.id) as items_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.customer_id = ?
            GROUP BY o.id
            ORDER BY o.date DESC
            LIMIT 10
        `, [customer.id]);

        customer.recentOrders = orders;

        res.json(customer);
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar cliente
router.post('/', authenticateToken, requirePermission('Clientes'), async (req, res) => {
    try {
        const { name, email, phone, document, address, city, state, zip_code, notes } = req.body;

        if (!name || !phone || !document) {
            return res.status(400).json({ error: 'Nome, telefone e documento são obrigatórios' });
        }

        // Verificar se documento já existe
        const existingCustomer = await db.get('SELECT id FROM customers WHERE document = ?', [document]);
        if (existingCustomer) {
            return res.status(400).json({ error: 'Já existe um cliente com este documento' });
        }

        const result = await db.run(`
            INSERT INTO customers (name, email, phone, document, address, city, state, zip_code, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, email, phone, document, address, city, state, zip_code, notes]);

        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [result.id]);
        
        res.status(201).json(customer);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar cliente
router.put('/:id', authenticateToken, requirePermission('Clientes'), async (req, res) => {
    try {
        const { name, email, phone, document, address, city, state, zip_code, notes, status } = req.body;

        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        if (!customer) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        await db.run(`
            UPDATE customers 
            SET name = ?, email = ?, phone = ?, document = ?, address = ?, 
                city = ?, state = ?, zip_code = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, email, phone, document, address, city, state, zip_code, notes, status || customer.status, req.params.id]);

        const updatedCustomer = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        
        res.json(updatedCustomer);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar cliente
router.delete('/:id', authenticateToken, requirePermission('Clientes'), async (req, res) => {
    try {
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        if (!customer) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Verificar se cliente tem pedidos
        const hasOrders = await db.get('SELECT COUNT(*) as count FROM orders WHERE customer_id = ?', [req.params.id]);
        if (hasOrders.count > 0) {
            return res.status(400).json({ error: 'Não é possível excluir cliente com pedidos associados' });
        }

        await db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
        
        res.json({ message: 'Cliente excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;