const express = require('express');
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
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
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
});

module.exports = app;