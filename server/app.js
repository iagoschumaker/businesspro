const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Importar rotas
const authRoutes = require('./routes/auth');
const customersRoutes = require('./routes/customers');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const billetsRoutes = require('./routes/billets');
const visitsRoutes = require('./routes/visits');
const usersRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const notificationsRoutes = require('./routes/notifications');

// Importar serviços
const notificationService = require('./services/notificationService');
const backupService = require('./services/backupService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(helmet({
    contentSecurityPolicy: false, // Desabilitar para desenvolvimento
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));

// Middlewares gerais
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/billets', billetsRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);

// Rota de backup manual
app.post('/api/backup', async (req, res) => {
    try {
        const backupFileName = await backupService.createBackup();
        res.json({ 
            message: 'Backup criado com sucesso',
            fileName: backupFileName 
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar backup' });
    }
});

// Rota para listar backups
app.get('/api/backups', (req, res) => {
    try {
        const backups = backupService.listBackups();
        res.json(backups);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar backups' });
    }
});

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 API disponível em http://localhost:${PORT}/api`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

// Tratamento de sinais para encerramento graceful
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, encerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT, encerrando servidor...');
    process.exit(0);
});

module.exports = app;