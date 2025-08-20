const express = require('express');
<<<<<<< HEAD
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { auth, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Listar clientes
router.get('/', auth, checkPermission('Clientes:Ver'), async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = { tenantId: req.tenantId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { document: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Evita N+1: agrega estatísticas de pedidos em uma consulta
    const customerIds = customers.map((c) => c._id);
    const stats = await Order.aggregate([
      { $match: { customer_id: { $in: customerIds } } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: '$customer_id',
          orders: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ['$total', 0] } },
          lastOrder: { $first: '$date' }
        }
      }
    ]);
    const statsMap = new Map(stats.map((s) => [String(s._id), s]));
    const customersWithStats = customers.map((customer) => {
      const s = statsMap.get(String(customer._id)) || { orders: 0, totalValue: 0, lastOrder: null };
      return {
        ...customer.toObject(),
        orders: s.orders || 0,
        totalValue: s.totalValue || 0,
        lastOrder: s.lastOrder || null,
      };
    });

    const total = await Customer.countDocuments(query);

    res.json({
      customers: customersWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar cliente por ID (ObjectId) ou por nome/documento (string)
router.get('/:id', auth, checkPermission('Clientes:Ver'), async (req, res) => {
  try {
    const { id } = req.params; // Express já decodifica %20 -> espaço
    let customer = null;

    // Se for um ObjectId válido, busca direto por ID
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (isObjectId) {
      customer = await Customer.findOne({ _id: id, tenantId: req.tenantId });
    } else {
      // Caso contrário, tentar por nome/documento
      // 1) match exato por nome (case-insensitive)
      customer = await Customer.findOne({ tenantId: req.tenantId, name: { $regex: `^${id}$`, $options: 'i' } });
      // 2) se não achou, tentar documento exato
      if (!customer) {
        customer = await Customer.findOne({ tenantId: req.tenantId, document: id });
      }
      // 3) fallback: regex por nome contém (case-insensitive)
      if (!customer) {
        customer = await Customer.findOne({ tenantId: req.tenantId, name: { $regex: id, $options: 'i' } });
      }
    }

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    return res.json(customer);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    // Se der CastError por algum motivo, responder com 400 ao invés de 500
    if (error?.name === 'CastError') {
      return res.status(400).json({ error: 'Parâmetro inválido' });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar cliente
router.post('/', auth, checkPermission('Clientes:Criar'), async (req, res) => {
  try {
    const customer = new Customer({ ...req.body, tenantId: req.tenantId });
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    if (error.code === 11000) {
      // Debug temporário: mostrar detalhes do índice conflitante
      console.log('[DEBUG] Erro 11000 - Detalhes:', {
        indexName: error.keyPattern ? Object.keys(error.keyPattern).join('_') : 'unknown',
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        tenantId: req.tenantId
      });
      return res.status(400).json({ 
        error: 'CPF/CNPJ já cadastrado',
        debug: {
          indexName: error.keyPattern ? Object.keys(error.keyPattern).join('_') : 'unknown',
          keyPattern: error.keyPattern,
          keyValue: error.keyValue,
          tenantId: req.tenantId
        }
      });
    }
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar cliente
router.put('/:id', auth, checkPermission('Clientes:Editar'), async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json(customer);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'CPF/CNPJ já cadastrado' });
    }
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar cliente
router.delete('/:id', auth, checkPermission('Clientes:Excluir'), async (req, res) => {
  try {
    // Verificar se o ID é válido
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }

    // Verificar se o cliente existe
    const customer = await Customer.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Preservar o nome do cliente nos pedidos associados antes de excluir
    const ordersCount = await Order.countDocuments({ customer_id: req.params.id });
    if (ordersCount > 0) {
      // Atualizar todos os pedidos para incluir o nome do cliente
      await Order.updateMany(
        { customer_id: req.params.id },
        { 
          $set: { 
            customer_name: customer.name,
            customer_document: customer.document,
            customer_deleted: true 
          }
        }
      );
      console.log(`Preservado nome do cliente em ${ordersCount} pedido(s) antes da exclusão`);
    }

    // Excluir o cliente
    await Customer.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    
    res.status(200).json({ 
      message: 'Cliente excluído com sucesso',
      ordersPreserved: ordersCount
    });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
});

module.exports = router;