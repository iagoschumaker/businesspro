const express = require('express');
<<<<<<< HEAD
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const { auth, checkPermission } = require('../middleware/auth');
const User = require('../models/User');
const { generatePixPayloadAndQr, buildTxid, sanitize } = require('../utils/pix');
const CompanyProfile = require('../models/CompanyProfile');

const router = express.Router();

// Listar pedidos
router.get('/', auth, checkPermission('Pedidos:Ver'), async (req, res) => {
  try {
    const { search, status, customer_id, page = 1, limit = 10 } = req.query;
    const query = { tenantId: req.tenantId };

    if (search) {
      query.order_number = { $regex: search, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    if (customer_id) {
      query.customer_id = customer_id;
    }

    const orders = await Order.find(query)
      .populate('customer_id', 'name document')
      .populate('user_id', 'name')
      .populate('items.product_id', 'name code unit')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    // Garantir que nome/documento do cliente estejam presentes no payload
    const shaped = orders.map((o) => {
      const obj = o.toObject();
      const cname = obj.customer_name || obj.customer_id?.name || '';
      const cdoc = obj.customer_document || obj.customer_id?.document || '';
      obj.customer_name = cname;
      obj.customer_document = cdoc;
      return obj;
    });

    res.json({
      orders: shaped,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar pedido por ID
router.get('/:id', auth, checkPermission('Pedidos:Ver'), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('customer_id')
      .populate('user_id', 'name')
      .populate('items.product_id');

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    res.json(order);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar pedido
router.post('/', auth, checkPermission('Pedidos:Criar'), async (req, res) => {
  try {
    console.log('=== CRIANDO PEDIDO ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      customer_id, 
      date, 
      due_date, 
      payment_method, 
      items, 
      notes, 
      discount = 0,
      shipping = 0,
      installments,
      installment_interval,
      installment_details,
      signatureImage
    } = req.body;
    
    console.log('Extracted fields:', {
      customer_id,
      date,
      due_date,
      payment_method,
      items: items?.length || 0,
      discount,
      shipping,
      installments,
      installment_interval,
      hasSignature: typeof signatureImage === 'string' && signatureImage.startsWith('data:image') && signatureImage.length > 100
    });

    // Validar se o cliente existe (no mesmo tenant)
    console.log('Validando cliente com ID:', customer_id);
    const customer = await Customer.findOne({ _id: customer_id, tenantId: req.tenantId });
    if (!customer) {
      console.log('Cliente não encontrado:', customer_id);
      return res.status(400).json({ error: 'Cliente não encontrado' });
    }
    console.log('Cliente encontrado:', customer.name);

    // Validar e processar itens
    console.log('Processando', items?.length || 0, 'itens');
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      console.log('Processando item:', item);
      const product = await Product.findOne({ _id: item.product_id, tenantId: req.tenantId });
      if (!product) {
        console.log('Produto não encontrado:', item.product_id);
        return res.status(400).json({ error: `Produto ${item.product_id} não encontrado` });
      }
      console.log('Produto encontrado:', product.name);

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Estoque insuficiente para ${product.name}` });
      }

      const itemTotal = item.quantity * item.unit_price;
      subtotal += itemTotal;

      processedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: itemTotal
      });

      // Atualizar estoque
      product.stock -= item.quantity;
      await product.save();

      // Notificação de baixo estoque (não bloqueante)
      try {
        if (product.stock <= product.min_stock) {
          const title = product.stock <= 0 ? 'Produto sem estoque' : 'Estoque baixo';
          const message = `${product.name} (${product.code || 'sem código'}) está com estoque ${product.stock <= 0 ? 'zerado' : 'baixo'} (atual: ${product.stock}, mínimo: ${product.min_stock}).`;
          const notif = new Notification({
            user_id: null, // global
            type: product.stock <= 0 ? 'error' : 'warning',
            title,
            message,
          });
          notif.save().catch(() => {});
        }
      } catch (e) {
        console.warn('Falha ao criar notificação de estoque baixo:', e?.message);
      }
    }

    const total = subtotal - discount + shipping;
    console.log('Totais calculados:', { subtotal, discount, shipping, total });

    // Normalizar a data do pedido para preservar o dia local quando vier em formato 'YYYY-MM-DD'
    // Evita que '2025-08-16' seja interpretado como 00:00 UTC e vire '15/08' no fuso -03 no dashboard
    const normalizeLocalDate = (input) => {
      if (!input) return undefined;
      if (typeof input === 'string') {
        // Se vier somente a data (YYYY-MM-DD), forçar horário no fuso -03:00
        const ymd = input.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
          // Meio-dia para evitar qualquer ajuste de horário de verão
          return new Date(`${ymd}T12:00:00-03:00`);
        }
        // Outros formatos: deixar o JS interpretar
        const d = new Date(ymd);
        return isNaN(d.getTime()) ? undefined : d;
      }
      // Já é Date ou timestamp
      const d = new Date(input);
      return isNaN(d.getTime()) ? undefined : d;
    };

    const normalizedDate = normalizeLocalDate(date) || new Date();
    const normalizedDueDate = normalizeLocalDate(due_date);

    const orderData = {
      customer_id,
      user_id: req.user._id,
      date: normalizedDate,
      due_date: normalizedDueDate,
      payment_method,
      items: processedItems,
      subtotal,
      discount,
      shipping,
      total,
      notes,
      tenantId: req.tenantId,
      ...(signatureImage ? { signatureImage } : {}),
      ...(installments && { installments }),
      ...(installment_interval && { installment_interval }),
      ...(installment_details && { installment_details })
    };
    
    console.log('Dados do pedido para criar:', JSON.stringify(orderData, null, 2));
    const order = new Order(orderData);

    console.log('Salvando pedido...');
    await order.save();
    console.log('Pedido salvo com sucesso, ID:', order._id);
    
    await order.populate('customer_id', 'name');
    await order.populate('user_id', 'name');
    console.log('Pedido populado, enviando resposta');

    // Notificação de novo pedido (não bloqueante)
    try {
      const notif = new Notification({
        user_id: req.user?._id || null,
        type: 'success',
        title: 'Novo pedido criado',
        message: `Pedido ${order.order_number} para ${order.customer_id?.name || 'cliente'} no valor de R$ ${Number(order.total || 0).toFixed(2)}`
      });
      notif.save().catch(() => {});
    } catch (e) {
      console.warn('Falha ao criar notificação de novo pedido:', e?.message);
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('=== ERRO AO CRIAR PEDIDO ===');
    console.error('Tipo do erro:', error.constructor.name);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    if (error.errors) {
      console.error('Erros de validação:', JSON.stringify(error.errors, null, 2));
    }
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Atualizar status do pedido
router.patch('/:id/status', auth, checkPermission('Pedidos:Editar'), async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status },
      { new: true }
    ).populate('customer_id', 'name');

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    res.json(order);
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar pedido
router.delete('/:id', auth, checkPermission('Pedidos'), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Restaurar estoque dos produtos
    for (const item of order.items) {
      const product = await Product.findOne({ _id: item.product_id, tenantId: req.tenantId });
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    await Order.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    res.json({ message: 'Pedido excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar pedido inteiro (parcelas, pagamentos, etc)
router.patch('/:id', auth, checkPermission('Pedidos:Editar'), async (req, res) => {
  console.log('PATCH /api/orders/:id body:', req.body);
  try {
    // Buscar pedido atual para obter total atual e estado
    const current = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!current) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const update = { ...req.body };
    // Coleção de notificações a serem criadas após a atualização
    const notificationsToCreate = [];

    // Se vierem parcelas, padronizar campos e derivar valores de payments
    if (Array.isArray(update.installment_details)) {
      // Mapa de status anterior por número da parcela
      const prevStatusMap = new Map((current.installment_details || []).map(i => [Number(i.number), String(i.status || '')]));
      update.installment_details = update.installment_details.map((inst) => {
        const amount = Number(inst?.amount) || 0;
        const due_date = inst?.due_date ? new Date(inst.due_date) : undefined;
        let paid_amount = Number(inst?.paid_amount) || 0;
        const payment_date = inst?.payment_date ? String(inst.payment_date) : undefined;
        let status;

        // Se vierem payments, recalcular paid_amount, payment_date e status
        const payments = Array.isArray(inst?.payments) ? inst.payments.map(p => ({ amount: Number(p.amount) || 0, date: String(p.date) })) : undefined;
        if (payments && payments.length) {
          paid_amount = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
          // última data de pagamento como string
          const last = payments[payments.length - 1];
          const computedPaymentDate = last?.date ? String(last.date) : payment_date;
          if (paid_amount >= amount && amount > 0) status = 'paid';
          else if (due_date && due_date < new Date()) status = 'overdue';
          else status = 'pending';
          const newInst = { ...inst, amount, due_date, paid_amount, payment_date: computedPaymentDate, status, payments };
          // Detectar transição de status para notificação
          const prev = prevStatusMap.get(Number(inst?.number));
          if (prev !== status) {
            if (status === 'overdue') {
              notificationsToCreate.push({
                user_id: req.user?._id || null,
                type: 'warning',
                title: 'Parcela em atraso',
                message: `Parcela ${inst?.number} do pedido ${current.order_number || req.params.id} ficou em atraso. Valor: R$ ${(amount || 0).toFixed(2)}${due_date ? `, venc.: ${due_date.toISOString().slice(0,10)}` : ''}.`
              });
            } else if (status === 'paid') {
              notificationsToCreate.push({
                user_id: req.user?._id || null,
                type: 'success',
                title: 'Parcela paga',
                message: `Parcela ${inst?.number} do pedido ${current.order_number || req.params.id} foi quitada. Total pago: R$ ${(paid_amount || 0).toFixed(2)}.`
              });
            }
          }
          return newInst;
        }

        // Sem payments: manter comportamento anterior
        if (paid_amount >= amount && amount > 0) status = 'paid';
        else if (due_date && due_date < new Date()) status = 'overdue';
        else status = 'pending';
        const newInst = { ...inst, amount, due_date, paid_amount, payment_date, status };
        const prev = prevStatusMap.get(Number(inst?.number));
        if (prev !== status) {
          if (status === 'overdue') {
            notificationsToCreate.push({
              user_id: req.user?._id || null,
              type: 'warning',
              title: 'Parcela em atraso',
              message: `Parcela ${inst?.number} do pedido ${current.order_number || req.params.id} ficou em atraso. Valor: R$ ${(amount || 0).toFixed(2)}${due_date ? `, venc.: ${due_date.toISOString().slice(0,10)}` : ''}.`
            });
          } else if (status === 'paid') {
            notificationsToCreate.push({
              user_id: req.user?._id || null,
              type: 'success',
              title: 'Parcela paga',
              message: `Parcela ${inst?.number} do pedido ${current.order_number || req.params.id} foi quitada. Total pago: R$ ${(paid_amount || 0).toFixed(2)}.`
            });
          }
        }
        return newInst;
      });
    }

    // Determinar total do pedido (preferir body.total se enviado)
    const orderTotal = Number(
      update.total !== undefined ? update.total : current.total || 0
    ) || 0;

    // Determinar pago: preferir body.paid_amount, senão inferir de installment_details
    let newPaidAmount = update.paid_amount !== undefined ? Number(update.paid_amount) : undefined;

    if (newPaidAmount === undefined) {
      // Se vierem parcelas no body, somar valores marcados como pagos
      if (Array.isArray(update.installment_details)) {
        newPaidAmount = update.installment_details.reduce((sum, inst) => {
          const amount = Number(inst?.amount) || 0;
          const paidPart = Number(inst?.paid_amount);
          if (!isNaN(paidPart) && paidPart > 0) return sum + paidPart;
          // fallback: status 'paid' conta como valor cheio
          if (String(inst?.status).toLowerCase() === 'paid') return sum + amount;
          return sum;
        }, 0);
      }
    }

    // Se calculamos paid_amount, persistir. Não alterar status automaticamente ao quitar
    if (typeof newPaidAmount === 'number' && !isNaN(newPaidAmount)) {
      update.paid_amount = newPaidAmount;
      const isFullyPaid = newPaidAmount >= orderTotal && orderTotal > 0;
      if (isFullyPaid) {
        // Status não será alterado automaticamente quando totalmente pago
      }
    }

    if ('tenantId' in update) delete update.tenantId;
    const updatedOrder = await Order.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, update, { new: true })
      .populate('customer_id', 'name');

    // Criar notificações de forma não bloqueante
    if (notificationsToCreate.length) {
      try {
        notificationsToCreate.forEach(p => new Notification(p).save().catch(() => {}));
      } catch (e) {
        console.warn('Falha ao criar notificações de mudança de parcelas:', e?.message);
      }
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar pagamento parcial a uma parcela específica
router.post('/:id/installments/:number/payments', auth, checkPermission('Pedidos'), async (req, res) => {
  try {
    const { amount, date } = req.body || {};
    const number = Number(req.params.number);
    if (!number || !amount || amount <= 0 || !date) {
      return res.status(400).json({ error: 'Parâmetros inválidos: amount>0 e date são obrigatórios' });
    }

    const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    const inst = (order.installment_details || []).find((i) => Number(i.number) === number);
    if (!inst) return res.status(404).json({ error: 'Parcela não encontrada' });

    // Garantir array
    if (!Array.isArray(inst.payments)) inst.payments = [];
    inst.payments.push({ amount: Number(amount), date: String(date) });

    // Recalcular campos derivados
    inst.paid_amount = inst.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    inst.payment_date = inst.payments[inst.payments.length - 1].date;
    const due = inst.due_date ? new Date(inst.due_date) : undefined;
    if (inst.paid_amount >= (Number(inst.amount) || 0) && (Number(inst.amount) || 0) > 0) inst.status = 'paid';
    else if (due && due < new Date()) inst.status = 'overdue';
    else inst.status = 'pending';

    // Atualizar agregados do pedido
    order.paid_amount = (order.installment_details || []).reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
    if (order.total) {
      // Não alterar status do pedido automaticamente ao atingir pagamento total
    }

    await order.save();
    await order.populate('customer_id', 'name');
    // Notificação: pagamento registrado (não bloqueante)
    try {
      const notif = new Notification({
        user_id: req.user?._id || null,
        type: 'success',
        title: 'Pagamento registrado',
        message: `Pagamento de R$ ${Number(amount).toFixed(2)} na parcela ${number} do pedido ${order.order_number || req.params.id}.`
      });
      notif.save().catch(() => {});
    } catch (e) {
      console.warn('Falha ao criar notificação de pagamento registrado:', e?.message);
    }
    res.json(order);
  } catch (error) {
    console.error('Erro ao registrar pagamento parcial:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir pedido e restaurar estoque de produtos
router.delete('/:id', auth, checkPermission('Pedidos:Excluir'), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    // Restaurar estoque de produtos
    for (const item of order.items) {
      const product = await Product.findOne({ _id: item.product_id, tenantId: req.tenantId });
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    await Order.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    res.json({ message: 'Pedido excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerar payload e QRCode PIX para um pedido específico
router.get('/:id/pix-qrcode', auth, checkPermission('Pedidos:Ver'), async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenantId }).populate('user_id', 'name pix_key pix_key_type pix_merchant_name pix_merchant_city');
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    // Prefer company PIX key if configured; fallback to seller's
    const company = await CompanyProfile.findOne().lean();
    const seller = order.user_id;
    const pixKey = (company?.pixKey && String(company.pixKey).trim()) || seller?.pix_key;
    if (!pixKey) return res.status(400).json({ error: 'Nenhuma chave PIX configurada (empresa ou usuário)' });

    const txid = buildTxid(order);
    const message = `Pedido ${order.order_number || order._id}`;

    // Merchant info: prefer company profile, then user settings; fallback to defaults
    const companyName = company?.nome_fantasia || company?.razao_social;
    const companyCity = company?.cidade;
    const merchantName = sanitize(companyName || seller?.pix_merchant_name || seller?.name || 'VENDEDOR');
    const merchantCity = sanitize(companyCity || seller?.pix_merchant_city || 'BRASIL');

    const { payload, qrDataUrl } = await generatePixPayloadAndQr({
      amount: Number(order.total) || 0,
      key: pixKey,
      merchantName,
      merchantCity,
      txid,
      message,
    });

    return res.json({
      orderId: String(order._id),
      orderNumber: order.order_number,
      amount: Number(order.total) || 0,
      payload,
      qrDataUrl,
      txid,
      message,
    });
  } catch (error) {
    console.error('Erro ao gerar QRCode PIX do pedido:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
});

module.exports = router;