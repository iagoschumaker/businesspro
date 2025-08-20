-- Schema para o Sistema de Gestão Empresarial
-- Criação das tabelas principais

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    permissions TEXT DEFAULT '{}',
    status TEXT DEFAULT 'Ativo',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    document TEXT NOT NULL UNIQUE,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    description TEXT,
    unit TEXT DEFAULT 'UN',
    price REAL NOT NULL,
    cost_price REAL,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    category TEXT,
    supplier TEXT,
    barcode TEXT,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    order_number TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    due_date TEXT,
    payment_method TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de itens dos pedidos
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabela de boletos
CREATE TABLE IF NOT EXISTS billets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    amount REAL NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'Pendente',
    payment_date TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Tabela de visitas a clientes
CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    purpose TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Agendado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0,
    entity_type TEXT,
    entity_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de registro de backups
CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuário admin padrão se não existir
INSERT OR IGNORE INTO users (name, email, password, role, permissions)
VALUES (
    'Administrador', 
    'admin@exemplo.com', 
    '$2a$10$r1gAragaAVtzAAl9YnP5tOK2y7bLy5U1k6vbJZqA1OhwgkqY4.are', -- senha: admin123
    'Administrador',
    '{"Clientes":true,"Produtos":true,"Pedidos":true,"Financeiro":true,"Relatórios":true,"Usuários":true,"Configurações":true}'
);

-- Inserir configurações iniciais
INSERT OR IGNORE INTO settings (key, value, description) 
VALUES 
    ('company_name', 'Minha Empresa', 'Nome da empresa'),
    ('company_cnpj', '00.000.000/0001-00', 'CNPJ da empresa'),
    ('company_address', 'Rua Exemplo, 123', 'Endereço da empresa'),
    ('company_phone', '(11) 1234-5678', 'Telefone da empresa'),
    ('company_email', 'contato@minhaempresa.com', 'Email da empresa'),
    ('notification_email', '1', 'Enviar notificações por email (0=não, 1=sim)'),
    ('backup_auto', '1', 'Backup automático diário (0=não, 1=sim)'),
    ('backup_time', '02:00', 'Horário do backup automático'),
    ('invoice_prefix', 'NFE-', 'Prefixo para notas fiscais'),
    ('decimal_places', '2', 'Casas decimais para valores monetários');

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_customers_document ON customers(document);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_billets_order ON billets(order_id);
CREATE INDEX IF NOT EXISTS idx_visits_customer ON visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
