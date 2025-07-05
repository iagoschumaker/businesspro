const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const db = require('../database/connection');
const router = express.Router();

// Gerar número do pedido
const generateOrderNumber = async () => {
    const year = new Date().getFullYear();
    const lastOrder = await db.get(
        'SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1',
        [`${year}%`]
    );
    
    let nextNumber = 1;
    if (lastOrder) {
        const lastNumber = parseInt(lastOrder.order_number.slice(-6));
        nextNumber = lastNumber + 1;
    }
    
    return `${year}${nextNumber.toString().padStart(6, '0')}`;
};

// Listar pedidos
router.get('/', authenticateToken, requirePermission('Pedidos'), async (req, res) => {
    try {
        const { search, status, customer_id, page = 1, limit = 50 } = req.query;
        let sql = `
            SELECT o.*, c.name as customer_name, u.name as user_name,
                   COUNT(oi.id) as items_count
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ' AND (o.order_number LIKE ? OR c.name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (status) {
            sql += ' AND o.status = ?';
            params.push(status);
        }

        if (customer_id) {
            sql += ' AND o.customer_id = ?';
            params.push(customer_id);
        }

        sql += ' GROUP BY o.id ORDER BY o.date DESC, o.id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const orders = await db.all(sql, params);
        
        res.json(orders);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar pedido por ID
router.get('/:id', authenticateToken, requirePermission('Pedidos'), async (req, res) => {
    try {
        const order = await db.get(`
            SELECT o.*, c.name as customer_name, c.email as customer_email, 
                   c.phone as customer_phone, c.document as customer_document,
                   c.address as customer_address, u.name as user_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [req.params.id]);
        
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // Buscar itens do pedido
        const items = await db.all(`
            SELECT oi.*, p.name as product_name, p.code as product_code, p.unit
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [order.id]);

        order.items = items;

        res.json(order);
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar pedido
router.post('/', authenticateToken, requirePermission('Pedidos'), async (req, res) => {
    try {
        const { customer_id, date, due_date, payment_method, items, notes, discount = 0 } = req.body;

        if (!customer_id || !date || !payment_method || !items || items.length === 0) {
            return res.status(400).json({ error: 'Campos obrigatórios: cliente, data, forma de pagamento e itens' });
        }

        // Verificar se cliente existe
        const customer = await db.get('SELECT id FROM customers WHERE id = ?', [customer_id]);
        if (!customer) {
            return res.status(400).json({ error: 'Cliente não encontrado' });
        }

        // Calcular totais
        let subtotal = 0;
        for (const item of items) {
            if (!item.product_id || !item.quantity || !item.unit_price) {
                return res.status(400).json({ error: 'Todos os itens devem ter produto, quantidade e preço unitário' });
            }
            subtotal += item.quantity * item.unit_price;
        }

        const total = subtotal - discount;
        const orderNumber = await generateOrderNumber();

        // Iniciar transação
        const queries = [];

        // Inserir pedido
        queries.push({
            sql: `INSERT INTO orders (customer_id, user_id, order_number, date, due_date, payment_method, subtotal, discount, total, notes)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [customer_id, req.user.id, orderNumber, date, due_date, payment_method, subtotal, discount, total, notes]
        });

        const results = await db.transaction(queries);
        const orderId = results[0].id;

        // Inserir itens do pedido
        for (const item of items) {
            await db.run(`
                INSERT INTO order_items (order_id, product_id, quantity, unit_price, total)
                VALUES (?, ?, ?, ?, ?)
            `, [orderId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]);

            // Atualizar estoque do produto
            await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
        }

        const order = await db.get(`
            SELECT o.*, c.name as customer_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `, [orderId]);
        
        res.status(201).json(order);
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar status do pedido
router.patch('/:id/status', authenticateToken, requirePermission('Pedidos'), async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'Status é obrigatório' });
        }

        const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        await db.run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);

        const updatedOrder = await db.get(`
            SELECT o.*, c.name as customer_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `, [req.params.id]);
        
        res.json(updatedOrder);
    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar pedido
router.delete('/:id', authenticateToken, requirePermission('Pedidos'), async (req, res) => {
    try {
        const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // Verificar se pedido pode ser excluído (apenas se status for Pendente)
        if (order.status !== 'Pendente') {
            return res.status(400).json({ error: 'Apenas pedidos pendentes podem ser excluídos' });
        }

        // Restaurar estoque dos produtos
        const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
        for (const item of items) {
            await db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }

        // Excluir pedido (itens serão excluídos automaticamente por CASCADE)
        await db.run('DELETE FROM orders WHERE id = ?', [req.params.id]);
        
        res.json({ message: 'Pedido excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;