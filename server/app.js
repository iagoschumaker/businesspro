const express = require('express');
<<<<<<< HEAD
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');

// Importar rotas
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const companyRoutes = require('./routes/company');

const categoriesRoutes = require('./routes/categories');
const visitRoutes = require('./routes/visits');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const superAdminRoutes = require('./routes/super-admin');
const meRoutes = require('./routes/me');

// Importar middlewares de tenant
const { extractTenant, validateTenantUser } = require('./middleware/tenant');
const { auth } = require('./middleware/auth');

const app = express();

// Conectar ao MongoDB
connectDB();

// Middlewares de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Rate limiting
// Limite geral mais alto para evitar bloqueio de IPs compartilhados (ex: redes móveis)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // aumenta o limite geral
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições. Tente novamente em alguns minutos.',
  // Ignorar rotas específicas (health e login) no limitador geral
  skip: (req) => req.path.startsWith('/api/health') || req.path.startsWith('/api/auth/login')
});

// Limitador específico para tentativas de login para evitar brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // até 20 tentativas por IP nesse período
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.'
});

// Aplicar limitador de login antes do geral para não contar duas vezes
app.use('/api/auth/login', loginLimiter);
app.use('/api/', generalLimiter);

// CORS - Permitir acesso de dispositivos na rede local
app.use(cors({
  origin: true,
  credentials: true
}));

// Garantir preflight para todas as rotas
app.options('*', cors());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos de uploads (ex.: avatares)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/me', auth, meRoutes);

// Aplicar middlewares de tenant para rotas que precisam de isolamento
app.use('/api/customers', auth, extractTenant, validateTenantUser, customerRoutes);
app.use('/api/products', auth, extractTenant, validateTenantUser, productRoutes);
app.use('/api/orders', auth, extractTenant, validateTenantUser, orderRoutes);
app.use('/api/company', auth, extractTenant, validateTenantUser, companyRoutes);
app.use('/api/categories', auth, extractTenant, validateTenantUser, categoriesRoutes);
app.use('/api/visits', auth, extractTenant, validateTenantUser, visitRoutes);
app.use('/api/users', auth, extractTenant, validateTenantUser, userRoutes);
app.use('/api/dashboard', auth, extractTenant, validateTenantUser, dashboardRoutes);
app.use('/api/notifications', auth, extractTenant, validateTenantUser, notificationRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
=======
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Importar rotas
const authRoutes = require('./routes/auth');
const customersRoutes = require('./routes/customers');
const productsRoutes = require('./routes/products');
const categoriesRoutes = require('./routes/categories');
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
app.use('/api/categories', categoriesRoutes);
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
<<<<<<< HEAD
  console.error('Erro:', err);
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: 'Dados inválidos', details: errors });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'ID inválido' });
  }
  
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`📱 Acesso na rede local: http://[SEU_IP]:${PORT}/api/health`);
  console.log(`💡 Configure o frontend para usar http://[SEU_IP]:${PORT}/api`);
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
});

module.exports = app;