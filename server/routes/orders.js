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
        // Vamos verificar a estrutura da tabela orders primeiro
        console.log('Verificando estrutura da tabela orders...');
        const tableInfo = await db.all("PRAGMA table_info(orders)");
        console.log('Estrutura da tabela orders:', JSON.stringify(tableInfo, null, 2));
        
        console.log('Dados recebidos para criar pedido:', JSON.stringify(req.body, null, 2));
        const { customer_id, date, date_time, due_date, payment_method, items, notes, discount = 0, shipping = 0 } = req.body;
        
        console.log('Dados extraídos:', { customer_id, date, date_time, payment_method, items: items?.length || 0 });

        if (!customer_id || !date || !payment_method || !items || items.length === 0) {
            console.log('Erro de validação: campos obrigatórios faltando');
            return res.status(400).json({ error: 'Campos obrigatórios: cliente, data, forma de pagamento e itens' });
        }

        // Verificar se cliente existe
        const customer = await db.get('SELECT id FROM customers WHERE id = ?', [customer_id]);
        if (!customer) {
            return res.status(400).json({ error: 'Cliente não encontrado' });
        }

        // Calcular totais
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        // Cálculo do valor de desconto
        let discountValue = 0;
        if (discount > 0) {
            discountValue = (subtotal * discount) / 100;
        }
        
        // Cálculo do total
        const total = subtotal - discountValue + shipping;
        const orderNumber = await generateOrderNumber();
        
        // Definindo orderId fora do bloco try interno para que esteja acessível em todo o escopo
        let orderId;

        // Iniciar transação
        const queries = [];
        console.log('Cálculo de valores - subtotal:', subtotal, 'discount:', discount, 'discountValue:', discountValue, 'shipping:', shipping, 'total:', total);

        // Versão simplificada sem o campo date_time
        console.log('Preparando query SQL sem o campo date_time');
        
        // Preparar a query para inserir o pedido usando apenas colunas existentes
        // Removendo os campos discount_value e shipping que não existem na tabela
        // O valor do shipping está sendo adicionado ao total diretamente
        queries.push({
            sql: `INSERT INTO orders (customer_id, user_id, order_number, date, due_date, payment_method, subtotal, discount, total, notes)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [customer_id, req.user.id, orderNumber, date, due_date, payment_method, subtotal, discount, total, notes]
        });
        
        console.log('Query SQL preparada:', queries[0].sql);
        console.log('Parâmetros da query:', JSON.stringify(queries[0].params));
        
        // Executar a transação
        console.log('Iniciando transação...');
        const results = await db.transaction(queries);
        console.log('Transação concluída com sucesso, resultados:', JSON.stringify(results));
        
        orderId = results[0].id;
        console.log('ID do pedido criado:', orderId);
    
        // Inserir itens do pedido
        console.log('Inserindo itens do pedido...');
        for (const item of items) {
            console.log('Inserindo item:', JSON.stringify(item));
            await db.run(`
                INSERT INTO order_items (order_id, product_id, quantity, unit_price, total)
                VALUES (?, ?, ?, ?, ?)
            `, [orderId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]);
        }
        console.log('Todos os itens inseridos com sucesso');

        // Atualizar estoque do produto
        console.log('Atualizando estoque dos produtos...');
        for (const item of items) {
            console.log(`Atualizando estoque do produto ${item.product_id}, reduzindo em ${item.quantity} unidades`);
            try {
                await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
            } catch (stockError) {
                console.error(`Erro ao atualizar estoque do produto ${item.product_id}:`, stockError);
                // Continuar mesmo com erro no estoque para não falhar o pedido inteiro
            }
        }
        console.log('Estoque atualizado com sucesso');

        const order = await db.get(`
            SELECT o.*, c.name as customer_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
        `, [orderId]);
        
        res.status(201).json(order);
    } catch (error) {
        console.error('ERRO DETALHADO AO CRIAR PEDIDO:');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        
        if (error.code) {
            console.error('Código de erro:', error.code);
        }
        
        if (error.errno) {
            console.error('Número do erro:', error.errno);
        }
        
        // Erro mais detalhado para o cliente
        res.status(500).json({ 
            error: 'Erro interno do servidor', 
            details: error.message,
            code: error.code || 'unknown'
        });
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