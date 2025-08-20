const mongoose = require('mongoose');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Billet = require('../models/Billet');
const Visit = require('../models/Visit');
const Notification = require('../models/Notification');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado para seed');
  } catch (error) {
    console.error('Erro ao conectar MongoDB:', error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    // Limpar dados existentes
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Billet.deleteMany({}),
      Visit.deleteMany({}),
      Notification.deleteMany({})
    ]);

    console.log('Dados existentes removidos');

    // Criar usuários
    const users = await User.create([
      {
        name: 'Administrador',
        email: 'admin@businesspro.com',
        password: 'admin123',
        role: 'Administrador',
        permissions: ['Dashboard', 'Clientes', 'Produtos', 'Pedidos', 'Agenda', 'Boletos', 'Financeiro', 'Usuários', 'Relatórios']
      },
      {
        name: 'João Vendedor',
        email: 'joao@businesspro.com',
        password: '123456',
        role: 'Vendedor',
        permissions: ['Dashboard', 'Clientes', 'Produtos', 'Pedidos', 'Agenda']
      },
      {
        name: 'Maria Financeiro',
        email: 'maria@businesspro.com',
        password: '123456',
        role: 'Financeiro',
        permissions: ['Dashboard', 'Boletos', 'Financeiro', 'Relatórios']
      }
    ]);

    console.log('Usuários criados');

    // Criar clientes
    const customers = await Customer.create([
      {
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        document: '123.456.789-00',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '01234-567'
      },
      {
        name: 'Maria Santos',
        email: 'maria@email.com',
        phone: '(11) 88888-8888',
        document: '987.654.321-00',
        address: 'Av. Paulista, 456',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '01310-100'
      },
      {
        name: 'Carlos Oliveira',
        email: 'carlos@empresa.com',
        phone: '(11) 77777-7777',
        document: '12.345.678/0001-90',
        address: 'Rua Comercial, 789',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '04567-890'
      }
    ]);

    console.log('Clientes criados');

    // Criar produtos
    const products = await Product.create([
      {
        name: 'Produto Premium A',
        description: 'Produto de alta qualidade',
        code: 'PRD-001',
        ncm: '12345678',
        unit: 'UN',
        cost_price: 45.50,
        sale_price: 89.90,
        stock: 150,
        min_stock: 20,
        category: 'Premium'
      },
      {
        name: 'Produto Standard B',
        description: 'Produto padrão',
        code: 'PRD-002',
        ncm: '87654321',
        unit: 'KG',
        cost_price: 25.30,
        sale_price: 49.90,
        stock: 8,
        min_stock: 10,
        category: 'Standard'
      },
      {
        name: 'Produto Especial C',
        description: 'Produto especial',
        code: 'PRD-003',
        ncm: '11223344',
        unit: 'UN',
        cost_price: 120.00,
        sale_price: 199.90,
        stock: 45,
        min_stock: 15,
        category: 'Especial'
      }
    ]);

    console.log('Produtos criados');

    // Criar pedidos
    const orders = await Order.create([
      {
        customer_id: customers[0]._id,
        user_id: users[1]._id,
        date: new Date(),
        payment_method: 'Boleto',
        items: [
          {
            product_id: products[0]._id,
            quantity: 2,
            unit_price: 89.90,
            total: 179.80
          }
        ],
        subtotal: 179.80,
        discount: 0,
        total: 179.80,
        status: 'Confirmado'
      },
      {
        customer_id: customers[1]._id,
        user_id: users[1]._id,
        date: new Date(),
        payment_method: 'PIX',
        items: [
          {
            product_id: products[1]._id,
            quantity: 3,
            unit_price: 49.90,
            total: 149.70
          }
        ],
        subtotal: 149.70,
        discount: 0,
        total: 149.70,
        status: 'Pendente'
      }
    ]);

    console.log('Pedidos criados');

    // Criar boletos
    const billets = await Billet.create([
      {
        customer_id: customers[0]._id,
        order_id: orders[0]._id,
        amount: 179.80,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        instructions: 'Não receber após o vencimento'
      },
      {
        customer_id: customers[1]._id,
        amount: 500.00,
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        instructions: 'Pagamento de serviços'
      }
    ]);

    console.log('Boletos criados');

    // Criar visitas
    const visits = await Visit.create([
      {
        customer_id: customers[0]._id,
        user_id: users[1]._id,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        time: '09:00',
        location: 'Centro, São Paulo',
        type: 'Visita Comercial',
        notes: 'Apresentação de novos produtos'
      },
      {
        customer_id: customers[1]._id,
        user_id: users[1]._id,
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        time: '14:30',
        location: 'Vila Olímpia, São Paulo',
        type: 'Apresentação',
        notes: 'Demonstração do sistema'
      }
    ]);

    console.log('Visitas criadas');

    // Criar notificações
    await Notification.create([
      {
        type: 'warning',
        title: 'Estoque Baixo',
        message: '1 produto está com estoque abaixo do mínimo'
      },
      {
        user_id: users[0]._id,
        type: 'info',
        title: 'Bem-vindo!',
        message: 'Sistema BusinessPro configurado com sucesso'
      }
    ]);

    console.log('Notificações criadas');
    console.log('✅ Seed concluído com sucesso!');

  } catch (error) {
    console.error('Erro durante o seed:', error);
  } finally {
    mongoose.connection.close();
  }
};

const runSeed = async () => {
  await connectDB();
  await seedDatabase();
};

runSeed();