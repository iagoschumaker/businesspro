const express = require('express');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const db = require('../database/connection');
const router = express.Router();

// Gerar número do boleto
const generateBilletNumber = async () => {
    const year = new Date().getFullYear();
    const lastBillet = await db.get(
        'SELECT billet_number FROM billets WHERE billet_number LIKE ? ORDER BY id DESC LIMIT 1',
        [`BOL${year}%`]
    );
    
    let nextNumber = 1;
    if (lastBillet) {
        const lastNumber = parseInt(lastBillet.billet_number.slice(-6));
        nextNumber = lastNumber + 1;
    }
    
    return `BOL${year}${nextNumber.toString().padStart(6, '0')}`;
};

// Gerar código de barras (simulado)
const generateBarcode = (amount, dueDate) => {
    const bankCode = '237';
    const currency = '9';
    const dueDateCode = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const amountCode = Math.floor(amount * 100).toString().padStart(10, '0');
    const randomCode = Math.floor(Math.random() * 999999999999999).toString().padStart(15, '0');
    
    return `${bankCode}${currency}${dueDateCode}${amountCode}${randomCode}`;
};

// Listar boletos
router.get('/', authenticateToken, requirePermission('Boletos'), async (req, res) => {
    try {
        const { search, status, customer_id, page = 1, limit = 50 } = req.query;
        let sql = `
            SELECT b.*, c.name as customer_name, o.order_number
            FROM billets b
            LEFT JOIN customers c ON b.customer_id = c.id
            LEFT JOIN orders o ON b.order_id = o.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ' AND (b.billet_number LIKE ? OR c.name LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (status) {
            sql += ' AND b.status = ?';
            params.push(status);
        }

        if (customer_id) {
            sql += ' AND b.customer_id = ?';
            params.push(customer_id);
        }

        sql += ' ORDER BY b.due_date DESC, b.id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const billets = await db.all(sql, params);
        
        res.json(billets);
    } catch (error) {
        console.error('Erro ao buscar boletos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar boleto por ID
router.get('/:id', authenticateToken, requirePermission('Boletos'), async (req, res) => {
    try {
        const billet = await db.get(`
            SELECT b.*, c.name as customer_name, c.email as customer_email, 
                   c.phone as customer_phone, c.document as customer_document,
                   c.address as customer_address, o.order_number
            FROM billets b
            LEFT JOIN customers c ON b.customer_id = c.id
            LEFT JOIN orders o ON b.order_id = o.id
            WHERE b.id = ?
        `, [req.params.id]);
        
        if (!billet) {
            return res.status(404).json({ error: 'Boleto não encontrado' });
        }

        res.json(billet);
    } catch (error) {
        console.error('Erro ao buscar boleto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar boleto
router.post('/', authenticateToken, requirePermission('Boletos'), async (req, res) => {
    try {
        const { 
            customer_id, order_id, amount, due_date, instructions, 
            interest = 2.0, fine = 2.0, discount = 0, discount_date 
        } = req.body;

        if (!customer_id || !amount || !due_date) {
            return res.status(400).json({ error: 'Campos obrigatórios: cliente, valor e data de vencimento' });
        }

        // Verificar se cliente existe
        const customer = await db.get('SELECT id FROM customers WHERE id = ?', [customer_id]);
        if (!customer) {
            return res.status(400).json({ error: 'Cliente não encontrado' });
        }

        // Verificar se pedido existe (se informado)
        if (order_id) {
            const order = await db.get('SELECT id FROM orders WHERE id = ?', [order_id]);
            if (!order) {
                return res.status(400).json({ error: 'Pedido não encontrado' });
            }
        }

        const billetNumber = await generateBilletNumber();
        const barcode = generateBarcode(amount, due_date);
        const issueDate = new Date().toISOString().split('T')[0];

        const result = await db.run(`
            INSERT INTO billets (customer_id, order_id, billet_number, amount, due_date, issue_date, 
                               barcode, instructions, interest, fine, discount, discount_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [customer_id, order_id, billetNumber, amount, due_date, issueDate, 
            barcode, instructions, interest, fine, discount, discount_date]);

        const billet = await db.get(`
            SELECT b.*, c.name as customer_name
            FROM billets b
            LEFT JOIN customers c ON b.customer_id = c.id
            WHERE b.id = ?
        `, [result.id]);
        
        res.status(201).json(billet);
    } catch (error) {
        console.error('Erro ao criar boleto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Registrar pagamento do boleto
router.patch('/:id/payment', authenticateToken, requirePermission('Boletos'), async (req, res) => {
    try {
        const { payment_date, amount_paid } = req.body;
        
        if (!payment_date) {
            return res.status(400).json({ error: 'Data de pagamento é obrigatória' });
        }

        const billet = await db.get('SELECT * FROM billets WHERE id = ?', [req.params.id]);
        if (!billet) {
            return res.status(404).json({ error: 'Boleto não encontrado' });
        }

        if (billet.status === 'Pago') {
            return res.status(400).json({ error: 'Boleto já foi pago' });
        }

        await db.run(`
            UPDATE billets 
            SET status = 'Pago', payment_date = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [payment_date, req.params.id]);

        const updatedBillet = await db.get(`
            SELECT b.*, c.name as customer_name
            FROM billets b
            LEFT JOIN customers c ON b.customer_id = c.id
            WHERE b.id = ?
        `, [req.params.id]);
        
        res.json(updatedBillet);
    } catch (error) {
        console.error('Erro ao registrar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Cancelar boleto
router.patch('/:id/cancel', authenticateToken, requirePermission('Boletos'), async (req, res) => {
    try {
        const billet = await db.get('SELECT * FROM billets WHERE id = ?', [req.params.id]);
        if (!billet) {
            return res.status(404).json({ error: 'Boleto não encontrado' });
        }

        if (billet.status === 'Pago') {
            return res.status(400).json({ error: 'Não é possível cancelar boleto já pago' });
        }

        await db.run(`
            UPDATE billets 
            SET status = 'Cancelado', updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [req.params.id]);

        const updatedBillet = await db.get(`
            SELECT b.*, c.name as customer_name
            FROM billets b
            LEFT JOIN customers c ON b.customer_id = c.id
            WHERE b.id = ?
        `, [req.params.id]);
        
        res.json(updatedBillet);
    } catch (error) {
        console.error('Erro ao cancelar boleto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;