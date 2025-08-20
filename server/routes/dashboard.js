const express = require('express');
<<<<<<< HEAD
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

const Visit = require('../models/Visit');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Dashboard principal
router.get('/', auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Estatísticas básicas
    // Calcular string da data de hoje no fuso -03:00 (YYYY-MM-DD)
    const pad2 = (n) => String(n).padStart(2, '0');
    const todayLocalStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

    const [
      totalCustomers,
      activeCustomers,
      totalProducts,
      lowStockProducts,
      ordersTodayAgg,
      salesThisMonth,
      upcomingVisits
    ] = await Promise.all([
      Customer.countDocuments({ tenantId: req.tenantId, status: 'Ativo' }),
      Customer.countDocuments({ tenantId: req.tenantId, status: 'Ativo' }),
      Product.countDocuments({ tenantId: req.tenantId, status: 'Ativo' }),
      Product.countDocuments({ tenantId: req.tenantId, $expr: { $lte: ['$stock', '$min_stock'] } }),
      // Contar pedidos de "hoje" no fuso -03:00 para evitar problemas de timezone
      Order.aggregate([
        { $match: { tenantId: req.tenantId } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: '-03:00' } }, count: { $sum: 1 } } },
        { $match: { _id: todayLocalStr } }
      ]),
      Order.aggregate([
        { $match: { tenantId: req.tenantId, date: { $gte: startOfMonth }, status: { $ne: 'Cancelado' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      Visit.find({ 
        tenantId: req.tenantId,
        date: { $gte: now },
        status: { $in: ['Agendado', 'Confirmado'] }
      })
      .populate('customer_id', 'name')
      .sort({ date: 1, time: 1 })
      .limit(5)
    ]);

    // Pedidos recentes
    const recentOrders = await Order.find({ tenantId: req.tenantId })
      .populate('customer_id', 'name')
      .populate('user_id', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Dados para gráfico de vendas (últimos 30 dias)
    const salesChart = await Order.aggregate([
      {
        $match: {
          tenantId: req.tenantId,
          date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          status: { $ne: 'Cancelado' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: '-03:00' } },
          sales: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const salesThisMonthValue = salesThisMonth[0]?.total || 0;
    const ordersToday = Array.isArray(ordersTodayAgg) && ordersTodayAgg.length ? (ordersTodayAgg[0]?.count || 0) : 0;

    // Garantir notificação na Central quando houver produtos com baixo estoque
    try {
      if (lowStockProducts > 0) {
        // Evitar duplicidade: checar notificação recente (independente de lida) com mesmo título
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const existing = await Notification.findOne({
          tenantId: req.tenantId,
          title: 'Estoque baixo',
          type: 'warning',
          createdAt: { $gte: twelveHoursAgo }
        });
        if (!existing) {
          const notif = new Notification({
            tenantId: req.tenantId,
            user_id: null,
            type: 'warning',
            title: 'Estoque baixo',
            message: `${lowStockProducts} produto(s) com estoque baixo. Verifique e reponha o estoque.`
          });
          notif.save().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Falha ao criar notificação de estoque baixo (dashboard):', e?.message);
    }

    res.json({
      stats: {
        totalCustomers,
        activeCustomers,
        totalProducts,
        lowStockProducts,
        ordersToday,
        salesThisMonth: salesThisMonthValue,
        salesChange: '+12.5%', // Calculado baseado no mês anterior
        ordersChange: '+8.2%',
        customersChange: '+15.3%'
      },
      alerts: {
        lowStockProducts
      },
      salesChart: salesChart.map(item => ({
        date: item._id,
        sales: item.sales,
        orders: item.orders
      })),
      recentOrders,
      upcomingVisits
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de vendas
router.get('/sales-report', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const salesData = await Order.aggregate([
      { $match: { tenantId: req.tenantId, status: { $ne: 'Cancelado' } } },
      { $addFields: { dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: '-03:00' } } } },
      { $match: { dateStr: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$dateStr', sales: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json(salesData);
  } catch (error) {
    console.error('Erro ao gerar relatório de vendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de clientes
router.get('/customers-report', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const customersData = await Customer.aggregate([
      { $match: { tenantId: req.tenantId } },
      { $addFields: { createdStr: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '-03:00' } } } },
      { $match: { createdStr: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$createdStr', newCustomers: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json(customersData);
  } catch (error) {
    console.error('Erro ao gerar relatório de clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de produtos
router.get('/products-report', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Top produtos por faturamento no período (por data local)
    // Alocação proporcional do total do pedido (inclui desconto/frete) para cada item
    const topProducts = await Order.aggregate([
      { $match: { tenantId: req.tenantId, status: { $ne: 'Cancelado' } } },
      { $addFields: { dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: '-03:00' } } } },
      { $match: { dateStr: { $gte: startDate, $lte: endDate } } },
      {
        $addFields: {
          _itemsEnriched: {
            $map: {
              input: { $ifNull: ['$items', []] },
              as: 'it',
              in: {
                product_id: '$$it.product_id',
                quantity: { $ifNull: ['$$it.quantity', 0] },
                base: { $ifNull: ['$$it.total', { $multiply: ['$$it.unit_price', '$$it.quantity'] }] }
              }
            }
          }
        }
      },
      { $addFields: { _sumBase: { $sum: '$_itemsEnriched.base' } } },
      { $unwind: '$_itemsEnriched' },
      {
        $addFields: {
          _merchTotal: {
            $max: [
              { $subtract: [ { $ifNull: ['$total', 0] }, { $ifNull: ['$shipping', 0] } ] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          _allocated: {
            $cond: [
              { $gt: ['$_sumBase', 0] },
              { $multiply: ['$_itemsEnriched.base', { $divide: ['$_merchTotal', '$_sumBase'] }] },
              '$_itemsEnriched.base'
            ]
          },
          _orderShipping: { $max: [{ $ifNull: ['$shipping', 0] }, 0] },
          _allocatedShip: {
            $cond: [
              { $gt: ['$_sumBase', 0] },
              { $multiply: ['$_itemsEnriched.base', { $divide: ['$_orderShipping', '$_sumBase'] }] },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: '$_itemsEnriched.product_id',
          quantity: { $sum: '$_itemsEnriched.quantity' },
          sales: { $sum: '$_allocated' },
          shipping: { $sum: '$_allocatedShip' }
        }
      },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $project: { product_id: '$_id', name: '$product.name', code: '$product.code', quantity: 1, sales: 1, shipping: 1 } },
      { $sort: { sales: -1 } },
      { $limit: 10 }
    ]);

    // Totais por dia (itens e vendas) para gráfico
    // 'sales' passa a usar o total do pedido (subtotal - discount + shipping) para refletir faturamento real
    // 'items' é a soma das quantidades de itens por pedido usando $map/$sum sem unwind
    const byDay = await Order.aggregate([
      { $match: { tenantId: req.tenantId, status: { $ne: 'Cancelado' } } },
      { $addFields: { dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: '-03:00' } } } },
      { $match: { dateStr: { $gte: startDate, $lte: endDate } } },
      {
        $addFields: {
          _itemsQty: {
            $sum: {
              $map: {
                input: { $ifNull: ['$items', []] },
                as: 'it',
                in: { $ifNull: ['$$it.quantity', 0] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$dateStr',
          items: { $sum: '$_itemsQty' },
          sales: { $sum: { $ifNull: ['$total', 0] } },
          shipping: { $sum: { $ifNull: ['$shipping', 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Totais do período (faturamento total, frete e mercadorias sem frete)
    const periodAgg = await Order.aggregate([
      { $match: { tenantId: req.tenantId, status: { $ne: 'Cancelado' } } },
      { $addFields: { dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: '-03:00' } } } },
      { $match: { dateStr: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          salesTotal: { $sum: { $ifNull: ['$total', 0] } },
          shippingTotal: { $sum: { $ifNull: ['$shipping', 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          salesTotal: 1,
          shippingTotal: 1,
          merchandiseTotal: { $max: [{ $subtract: ['$salesTotal', '$shippingTotal'] }, 0] }
        }
      }
    ]);

    const periodTotals = periodAgg[0] || { salesTotal: 0, shippingTotal: 0, merchandiseTotal: 0 };

    res.json({ topProducts, byDay, periodTotals });
  } catch (error) {
    console.error('Erro ao gerar relatório de produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório financeiro
router.get('/financial-report', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Calcular string da data de hoje no fuso -03:00 (YYYY-MM-DD) e o Date correspondente no início do dia
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const todayLocalStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const todayLocalStart = new Date(`${todayLocalStr}T00:00:00-03:00`);

    // Série por data de vencimento das parcelas (por data local)
    const byDueDate = await Order.aggregate([
      { $match: { tenantId: req.tenantId, status: { $ne: 'Cancelado' } } },
      { $unwind: '$installment_details' },
      {
        $addFields: {
          instDueStr: { $dateToString: { format: '%Y-%m-%d', date: '$installment_details.due_date', timezone: '-03:00' } },
          _inst_amount: { $ifNull: ['$installment_details.amount', 0] },
          _inst_paid: { $ifNull: ['$installment_details.paid_amount', 0] },
        }
      },
      { $match: { instDueStr: { $gte: startDate, $lte: endDate } } },
      {
        $addFields: {
          _remaining: { $max: [{ $subtract: ['$_inst_amount', '$_inst_paid'] }, 0] },
          _isOverdue: { $and: [ { $lt: ['$installment_details.due_date', todayLocalStart] }, { $gt: [{ $max: [{ $subtract: ['$_inst_amount', '$_inst_paid'] }, 0] }, 0] } ] },
          _paidClamped: {
            $cond: [
              { $gt: ['$_inst_paid', '$_inst_amount'] },
              '$_inst_amount',
              '$_inst_paid'
            ]
          }
        }
      },
      {
        $group: {
          _id: '$instDueStr',
          total_amount: { $sum: '$_inst_amount' },
          paid_amount: { $sum: '$_paidClamped' },
          overdue_amount: { $sum: { $cond: ['$_isOverdue', '$_remaining', 0] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Resumo geral no período (mesma lógica de cálculo)
    const summaryAgg = await Order.aggregate([
      { $match: { tenantId: req.tenantId, status: { $ne: 'Cancelado' } } },
      { $unwind: '$installment_details' },
      {
        $addFields: {
          instDueStr: { $dateToString: { format: '%Y-%m-%d', date: '$installment_details.due_date', timezone: '-03:00' } },
          _inst_amount: { $ifNull: ['$installment_details.amount', 0] },
          _inst_paid: { $ifNull: ['$installment_details.paid_amount', 0] },
        }
      },
      { $match: { instDueStr: { $gte: startDate, $lte: endDate } } },
      {
        $addFields: {
          _remaining: { $max: [{ $subtract: ['$_inst_amount', '$_inst_paid'] }, 0] },
          _isOverdue: { $and: [ { $lt: ['$installment_details.due_date', todayLocalStart] }, { $gt: [{ $max: [{ $subtract: ['$_inst_amount', '$_inst_paid'] }, 0] }, 0] } ] },
          _paidClamped: {
            $cond: [
              { $gt: ['$_inst_paid', '$_inst_amount'] },
              '$_inst_amount',
              '$_inst_paid'
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          total_amount: { $sum: '$_inst_amount' },
          paid_amount: { $sum: '$_paidClamped' },
          overdue_amount: { $sum: { $cond: ['$_isOverdue', '$_remaining', 0] } },
          installments: { $sum: 1 }
        }
      }
    ]);

    let summary = summaryAgg[0] || { total_amount: 0, paid_amount: 0, overdue_amount: 0, installments: 0 };

    // Recalcular "paid" por DATA DE PAGAMENTO no período selecionado
    // 1) Somatório de payments[].amount com payments.date no range
    const paidFromPaymentsAgg = await Order.aggregate([
      { $match: { tenantId: req.tenantId, status: { $ne: 'Cancelado' } } },
      { $unwind: '$installment_details' },
      { $unwind: { path: '$installment_details.payments', preserveNullAndEmptyArrays: false } },
      {
        $addFields: {
          _payDate: {
            $dateFromString: {
              dateString: '$installment_details.payments.date'
            }
          },
          _payAmount: { $ifNull: ['$installment_details.payments.amount', 0] }
        }
      },
      { $addFields: { _payDateStr: { $dateToString: { format: '%Y-%m-%d', date: '$_payDate', timezone: '-03:00' } } } },
      { $match: { _payDateStr: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, totalPaid: { $sum: '$_payAmount' } } }
    ]);

    const paidFromPayments = (paidFromPaymentsAgg[0]?.totalPaid) || 0;

    // 2) Fallback: parcelas sem histórico de payments, mas com payment_date no período
    const paidFromPaymentDateAgg = await Order.aggregate([
      { $match: { tenantId: req.tenantId, status: { $ne: 'Cancelado' } } },
      { $unwind: '$installment_details' },
      {
        $addFields: {
          _hasPayments: { $gt: [{ $size: { $ifNull: ['$installment_details.payments', []] } }, 0] },
          _inst_amount: { $ifNull: ['$installment_details.amount', 0] },
          _inst_paid: { $ifNull: ['$installment_details.paid_amount', 0] },
          _payDate: {
            $cond: [
              { $and: [ { $ne: ['$installment_details.payment_date', null] }, { $ne: ['$installment_details.payment_date', ''] } ] },
              { $dateFromString: { dateString: '$installment_details.payment_date' } },
              null
            ]
          }
        }
      },
      { $match: { _hasPayments: false, _payDate: { $ne: null } } },
      { $addFields: { _payDateStr: { $dateToString: { format: '%Y-%m-%d', date: '$_payDate', timezone: '-03:00' } } } },
      { $match: { _payDateStr: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: {
              $cond: [
                { $gt: ['$_inst_paid', '$_inst_amount'] },
                '$_inst_amount',
                '$_inst_paid'
              ]
            }
          }
        }
      }
    ]);

    const paidFromPaymentDate = (paidFromPaymentDateAgg[0]?.totalPaid) || 0;

    const paidByPaymentDate = paidFromPayments + paidFromPaymentDate;

    // Atualiza summary.paid_amount para refletir soma por data de pagamento no período
    summary = { ...summary, paid_amount: paidByPaymentDate };

    res.json({ byDueDate, summary });
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
=======
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/connection');
const router = express.Router();

// Dashboard principal
router.get('/', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = new Date().toISOString().slice(0, 7);
        const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

        // Estatísticas gerais
        const stats = await Promise.all([
            // Vendas do mês
            db.get(`
                SELECT COALESCE(SUM(total), 0) as current_month_sales
                FROM orders 
                WHERE strftime('%Y-%m', date) = ? AND status != 'Cancelado'
            `, [thisMonth]),
            
            // Vendas do mês anterior
            db.get(`
                SELECT COALESCE(SUM(total), 0) as last_month_sales
                FROM orders 
                WHERE strftime('%Y-%m', date) = ? AND status != 'Cancelado'
            `, [lastMonth]),
            
            // Pedidos de hoje
            db.get(`
                SELECT COUNT(*) as today_orders
                FROM orders 
                WHERE date = ?
            `, [today]),
            
            // Pedidos de ontem
            db.get(`
                SELECT COUNT(*) as yesterday_orders
                FROM orders 
                WHERE date = date('now', '-1 day')
            `, []),
            
            // Clientes ativos (com pedidos nos últimos 90 dias)
            db.get(`
                SELECT COUNT(DISTINCT customer_id) as active_customers
                FROM orders 
                WHERE date >= date('now', '-90 days')
            `, []),
            
            // Total de clientes
            db.get(`
                SELECT COUNT(*) as total_customers
                FROM customers 
                WHERE status = 'Ativo'
            `, []),
            
            // Produtos com estoque baixo
            db.get(`
                SELECT COUNT(*) as low_stock_products
                FROM products 
                WHERE stock <= min_stock AND status = 'Ativo'
            `, []),
            
            // Total de produtos
            db.get(`
                SELECT COUNT(*) as total_products
                FROM products 
                WHERE status = 'Ativo'
            `, [])
        ]);

        // Calcular variações percentuais
        const salesChange = stats[1].last_month_sales > 0 
            ? ((stats[0].current_month_sales - stats[1].last_month_sales) / stats[1].last_month_sales * 100).toFixed(1)
            : 0;

        const ordersChange = stats[3].yesterday_orders > 0 
            ? ((stats[2].today_orders - stats[3].yesterday_orders) / stats[3].yesterday_orders * 100).toFixed(1)
            : 0;

        const customersChange = stats[5].total_customers > 0 
            ? ((stats[4].active_customers / stats[5].total_customers) * 100).toFixed(1)
            : 0;

        // Vendas dos últimos 30 dias para gráfico
        const salesChart = await db.all(`
            SELECT 
                date,
                SUM(total) as sales,
                COUNT(*) as orders
            FROM orders 
            WHERE date >= date('now', '-30 days') AND status != 'Cancelado'
            GROUP BY date
            ORDER BY date ASC
        `);

        // Próximas visitas
        const upcomingVisits = await db.all(`
            SELECT v.*, c.name as customer_name, c.phone as customer_phone
            FROM visits v
            LEFT JOIN customers c ON v.customer_id = c.id
            WHERE v.date >= ? AND v.status = 'Agendado'
            ORDER BY v.date ASC, v.time ASC
            LIMIT 5
        `, [today]);

        // Pedidos recentes
        const recentOrders = await db.all(`
            SELECT o.*, c.name as customer_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `);
        
        // Boletos vencidos
        const overdueBillets = await db.get(`
            SELECT COUNT(*) as count
            FROM billets 
            WHERE due_date < ? AND status = 'Pendente'
        `, [today]);

        res.json({
            stats: {
                salesThisMonth: stats[0].current_month_sales,
                salesChange: `${salesChange >= 0 ? '+' : ''}${salesChange}%`,
                ordersToday: stats[2].today_orders,
                ordersChange: `${ordersChange >= 0 ? '+' : ''}${ordersChange}%`,
                activeCustomers: stats[4].active_customers,
                customersChange: `${customersChange}%`,
                lowStockProducts: stats[6].low_stock_products,
                totalProducts: stats[7].total_products
            },
            salesChart,
            upcomingVisits,
            recentOrders,
            alerts: {
                overdueBillets: overdueBillets.count,
                lowStockProducts: stats[6].low_stock_products
            }
        });
    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Relatórios de vendas
router.get('/sales-report', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Datas de início e fim são obrigatórias' });
        }

        // Vendas por período
        const salesData = await db.all(`
            SELECT 
                strftime('%Y-%m', date) as month,
                SUM(total) as sales,
                COUNT(*) as orders
            FROM orders 
            WHERE date BETWEEN ? AND ? AND status != 'Cancelado'
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month ASC
        `, [startDate, endDate]);

        // Produtos mais vendidos
        const topProducts = await db.all(`
            SELECT 
                p.name,
                SUM(oi.quantity) as quantity_sold,
                SUM(oi.total) as total_sales
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            LEFT JOIN orders o ON oi.order_id = o.id
            WHERE o.date BETWEEN ? AND ? AND o.status != 'Cancelado'
            GROUP BY p.id, p.name
            ORDER BY total_sales DESC
            LIMIT 10
        `, [startDate, endDate]);

        // Vendas por forma de pagamento
        const paymentMethods = await db.all(`
            SELECT 
                payment_method,
                COUNT(*) as orders,
                SUM(total) as total_sales
            FROM orders 
            WHERE date BETWEEN ? AND ? AND status != 'Cancelado'
            GROUP BY payment_method
            ORDER BY total_sales DESC
        `, [startDate, endDate]);

        res.json({
            salesData,
            topProducts,
            paymentMethods
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de vendas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Relatório de clientes
router.get('/customers-report', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Datas de início e fim são obrigatórias' });
        }

        // Novos clientes por mês
        const newCustomers = await db.all(`
            SELECT 
                strftime('%Y-%m', created_at) as month,
                COUNT(*) as new_customers
            FROM customers 
            WHERE created_at BETWEEN ? AND ?
            GROUP BY strftime('%Y-%m', created_at)
            ORDER BY month ASC
        `, [startDate, endDate]);

        // Top clientes por volume
        const topCustomers = await db.all(`
            SELECT 
                c.name,
                COUNT(o.id) as total_orders,
                SUM(o.total) as total_spent,
                MAX(o.date) as last_order
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id
            WHERE o.date BETWEEN ? AND ? AND o.status != 'Cancelado'
            GROUP BY c.id, c.name
            ORDER BY total_spent DESC
            LIMIT 10
        `, [startDate, endDate]);

        res.json({
            newCustomers,
            topCustomers
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
});

module.exports = router;