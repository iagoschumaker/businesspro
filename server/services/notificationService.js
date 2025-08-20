const db = require('../database/connection');
const cron = require('node-cron');

class NotificationService {
    constructor() {
        this.startScheduledTasks();
    }

    // Criar notificação
    async createNotification(userId, type, title, message) {
        try {
            await db.run(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES (?, ?, ?, ?)
            `, [userId, type, title, message]);
        } catch (error) {
            console.error('Erro ao criar notificação:', error);
        }
    }

    // Criar notificação global (para todos os usuários)
    async createGlobalNotification(type, title, message) {
        try {
            await db.run(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES (NULL, ?, ?, ?)
            `, [type, title, message]);
        } catch (error) {
            console.error('Erro ao criar notificação global:', error);
        }
    }

    // Verificar boletos vencidos
    async checkOverdueBillets() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const overdueBillets = await db.all(`
                SELECT b.*, c.name as customer_name
                FROM billets b
                LEFT JOIN customers c ON b.customer_id = c.id
                WHERE b.due_date < ? AND b.status = 'Em Aberto'
            `, [today]);

            if (overdueBillets.length > 0) {
                await this.createGlobalNotification(
                    'warning',
                    'Boletos Vencidos',
                    `${overdueBillets.length} boleto(s) vencido(s) encontrado(s)`
                );
            }
        } catch (error) {
            console.error('Erro ao verificar boletos vencidos:', error);
        }
    }

    // Verificar estoque baixo
    async checkLowStock() {
        try {
            const lowStockProducts = await db.all(`
                SELECT * FROM products 
                WHERE stock <= min_stock AND status = 'Ativo'
            `);

            if (lowStockProducts.length > 0) {
                await this.createGlobalNotification(
                    'warning',
                    'Estoque Baixo',
                    `${lowStockProducts.length} produto(s) com estoque abaixo do mínimo`
                );
            }
        } catch (error) {
            console.error('Erro ao verificar estoque baixo:', error);
        }
    }

    // Verificar visitas do dia
    async checkTodayVisits() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const todayVisits = await db.all(`
                SELECT v.*, c.name as customer_name, u.name as user_name
                FROM visits v
                LEFT JOIN customers c ON v.customer_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.date = ? AND v.status = 'Agendado'
            `, [today]);

            for (const visit of todayVisits) {
                await this.createNotification(
                    visit.user_id,
                    'info',
                    'Visita Agendada Hoje',
                    `Visita com ${visit.customer_name} às ${visit.time}`
                );
            }
        } catch (error) {
            console.error('Erro ao verificar visitas do dia:', error);
        }
    }

    // Iniciar tarefas agendadas
    startScheduledTasks() {
        // Verificar boletos vencidos - todo dia às 9h
        cron.schedule('0 9 * * *', () => {
            console.log('🔔 Verificando boletos vencidos...');
            this.checkOverdueBillets();
        });

        // Verificar estoque baixo - todo dia às 8h
        cron.schedule('0 8 * * *', () => {
            console.log('📦 Verificando estoque baixo...');
            this.checkLowStock();
        });

        // Verificar visitas do dia - todo dia às 7h
        cron.schedule('0 7 * * *', () => {
            console.log('📅 Verificando visitas do dia...');
            this.checkTodayVisits();
        });

        console.log('✅ Tarefas de notificação agendadas');
    }
}

module.exports = new NotificationService();