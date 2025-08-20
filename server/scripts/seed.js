const db = require('../database/connection');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        console.log('🌱 Iniciando seed do banco de dados...');

        // Forçando a recriação dos dados
        console.log('🔄 Recriando dados no banco...');
        
        // Remover dados existentes para evitar conflitos, mantendo usuários
        try {
            await db.run('DELETE FROM order_items');
            await db.run('DELETE FROM orders');
            await db.run('DELETE FROM billets');
            await db.run('DELETE FROM visits');
            await db.run('DELETE FROM customers');
            await db.run('DELETE FROM products');
            // Não excluímos os usuários para manter logins existentes
            console.log('✅ Dados existentes removidos com sucesso!');
        } catch (err) {
            console.error('❌ Erro ao limpar dados existentes:', err);
        }

        // Pulando criação de usuários para evitar conflitos
        console.log('🔔 Mantendo usuários existentes e pulando criação de novos usuários');

        // Criar clientes de exemplo
        const customers = [
            {
                name: 'João Silva',
                email: 'joao.silva@email.com',
                phone: '(11) 99999-9999',
                document: '123.456.789-00',
                address: 'Rua das Flores, 123 - Centro, São Paulo - SP',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '01234-567'
            },
            {
                name: 'Maria Santos',
                email: 'maria.santos@email.com',
                phone: '(11) 88888-8888',
                document: '987.654.321-00',
                address: 'Av. Paulista, 456 - Bela Vista, São Paulo - SP',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '01310-100'
            },
            {
                name: 'Empresa ABC Ltda',
                email: 'contato@empresaabc.com',
                phone: '(11) 77777-7777',
                document: '12.345.678/0001-90',
                address: 'Rua Comercial, 789 - Vila Madalena, São Paulo - SP',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '05433-000'
            }
        ];

        for (const customer of customers) {
            await db.run(`
                INSERT INTO customers (name, email, phone, document, address, city, state, zip_code)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [customer.name, customer.email, customer.phone, customer.document, 
                customer.address, customer.city, customer.state, customer.zip_code]);
        }

        // Criar produtos de exemplo
        const products = [
            {
                name: 'Produto Premium A',
                description: 'Produto de alta qualidade para clientes exigentes',
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
                description: 'Produto padrão com ótimo custo-benefício',
                code: 'PRD-002',
                ncm: '87654321',
                unit: 'UN',
                cost_price: 25.30,
                sale_price: 49.90,
                stock: 8,
                min_stock: 10,
                category: 'Standard'
            },
            {
                name: 'Produto Especial C',
                description: 'Produto especial para ocasiões específicas',
                code: 'PRD-003',
                ncm: '11223344',
                unit: 'UN',
                cost_price: 120.00,
                sale_price: 199.90,
                stock: 45,
                min_stock: 15,
                category: 'Especial'
            }
        ];

        for (const product of products) {
            await db.run(`
                INSERT INTO products (name, description, code, unit, cost_price, price, stock, min_stock, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [product.name, product.description, product.code, product.unit,
                product.cost_price, product.sale_price, product.stock, product.min_stock, product.category]);
        }

        // Criar configurações do sistema
        const settings = [
            { key: 'company_name', value: 'BusinessPro Ltda', description: 'Nome da empresa' },
            { key: 'company_document', value: '12.345.678/0001-90', description: 'CNPJ da empresa' },
            { key: 'company_address', value: 'Rua das Empresas, 123 - Centro, São Paulo - SP', description: 'Endereço da empresa' },
            { key: 'company_phone', value: '(11) 3333-4444', description: 'Telefone da empresa' },
            { key: 'company_email', value: 'contato@businesspro.com', description: 'E-mail da empresa' }
        ];

        for (const setting of settings) {
            await db.run(`
                INSERT OR REPLACE INTO settings (key, value, description)
                VALUES (?, ?, ?)
            `, [setting.key, setting.value, setting.description]);
        }

        console.log('✅ Seed do banco de dados concluído!');
        console.log('👤 Usuários criados:');
        console.log('   - admin@businesspro.com (senha: admin123)');
        console.log('   - joao@businesspro.com (senha: 123456)');
        console.log('   - maria@businesspro.com (senha: 123456)');

    } catch (error) {
        console.error('❌ Erro no seed:', error);
    }
}

// Executar seed se chamado diretamente
if (require.main === module) {
    seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;