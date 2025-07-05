const express = require('express');
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
});

module.exports = router;