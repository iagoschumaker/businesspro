const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
<<<<<<< HEAD
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const { auth, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Configurar multer para upload de arquivos
const upload = multer({ dest: 'uploads/' });

// Listar produtos
router.get('/', auth, checkPermission('Produtos:Ver'), async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 10 } = req.query;
    const query = { tenantId: req.tenantId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar produto por ID
router.get('/:id', auth, checkPermission('Produtos:Ver'), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar produto
router.post('/', auth, checkPermission('Produtos:Criar'), async (req, res) => {
  try {
    // Nunca aceitar tenantId do cliente
    if ('tenantId' in req.body) delete req.body.tenantId;
    const product = new Product({ ...req.body, tenantId: req.tenantId });
    await product.save();
    // Notificação de baixo estoque ao criar
    try {
      if (product.stock <= product.min_stock) {
        const title = product.stock <= 0 ? 'Produto sem estoque' : 'Estoque baixo';
        const message = `${product.name} (${product.code || 'sem código'}) criado com estoque ${product.stock <= 0 ? 'zerado' : 'baixo'} (atual: ${product.stock}, mínimo: ${product.min_stock}).`;
        new Notification({ user_id: null, type: product.stock <= 0 ? 'error' : 'warning', title, message }).save().catch(() => {});
      }
    } catch (e) {
      console.warn('Falha ao notificar (criação de produto):', e?.message);
    }
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Código do produto já existe' });
    }
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar produto
router.put('/:id', auth, checkPermission('Produtos:Editar'), async (req, res) => {
  try {
    // Não permitir alterar tenantId
    if ('tenantId' in req.body) delete req.body.tenantId;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    // Notificação de baixo estoque ao atualizar
    try {
      if (product.stock <= product.min_stock) {
        const title = product.stock <= 0 ? 'Produto sem estoque' : 'Estoque baixo';
        const message = `${product.name} (${product.code || 'sem código'}) está com estoque ${product.stock <= 0 ? 'zerado' : 'baixo'} (atual: ${product.stock}, mínimo: ${product.min_stock}).`;
        new Notification({ user_id: null, type: product.stock <= 0 ? 'error' : 'warning', title, message }).save().catch(() => {});
      }
    } catch (e) {
      console.warn('Falha ao notificar (atualização de produto):', e?.message);
    }
    res.json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Código do produto já existe' });
    }
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar produto
router.delete('/:id', auth, checkPermission('Produtos:Excluir'), async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    res.json({ message: 'Produto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Importar produtos via CSV
router.post('/import', auth, checkPermission('Produtos:Criar'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }

    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let successCount = 0;

        for (const row of results) {
          try {
            const product = new Product({
              name: row.nome || row.name,
              code: row.codigo || row.code,
              description: row.descricao || row.description,
              category: row.categoria || row.category,
              ncm: row.ncm,
              cest: row.cest,
              unit: row.unidade || row.unit || 'UN',
              cost_price: parseFloat(row.preco_custo || row.cost_price) || 0,
              sale_price: parseFloat(row.preco_venda || row.sale_price) || 0,
              stock: parseInt(row.estoque_atual || row.stock) || 0,
              min_stock: parseInt(row.estoque_minimo || row.min_stock) || 0,
              tenantId: req.tenantId
            });

            await product.save();
            successCount++;

            // Notificação de baixo estoque na importação
            try {
              if (product.stock <= product.min_stock) {
                const title = product.stock <= 0 ? 'Produto sem estoque' : 'Estoque baixo';
                const message = `${product.name} (${product.code || 'sem código'}) importado com estoque ${product.stock <= 0 ? 'zerado' : 'baixo'} (atual: ${product.stock}, mínimo: ${product.min_stock}).`;
                new Notification({ user_id: null, type: product.stock <= 0 ? 'error' : 'warning', title, message }).save().catch(() => {});
              }
            } catch (e) {
              console.warn('Falha ao notificar (importação de produto):', e?.message);
            }
          } catch (error) {
            errors.push(`Linha ${results.indexOf(row) + 1}: ${error.message}`);
          }
        }

        // Remover arquivo temporário
        fs.unlinkSync(req.file.path);

        res.json({
          success: successCount,
          errors,
          message: `${successCount} produtos importados com sucesso`
        });
      });
  } catch (error) {
    console.error('Erro ao importar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
=======
const { authenticateToken, requirePermission } = require('../middleware/auth');
const db = require('../database/connection');
const router = express.Router();

// Configuração do multer para upload de arquivos
const upload = multer({ dest: 'uploads/' });

// Listar produtos
router.get('/', authenticateToken, requirePermission('Produtos'), async (req, res) => {
    try {
        const { search, category, status, page = 1, limit = 50 } = req.query;
        let sql = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        if (search) {
            sql += ' AND (name LIKE ? OR code LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const products = await db.all(sql, params);
        
        // Adicionar status de estoque
        products.forEach(product => {
            if (product.stock <= product.min_stock) {
                product.stockStatus = 'Baixo Estoque';
            } else {
                product.stockStatus = 'Normal';
            }
        });

        res.json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar produto por ID
router.get('/:id', authenticateToken, requirePermission('Produtos'), async (req, res) => {
    try {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        res.json(product);
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar produto
router.post('/', authenticateToken, requirePermission('Produtos'), async (req, res) => {
    try {
        const { 
            name, description, code, ncm, cest, unit, 
            cost_price, sale_price, stock, min_stock, category 
        } = req.body;

        console.log('Recebendo request para criar produto:');
        console.log('Campos:', { name, code, category, unit, cost_price, sale_price });

        if (!name || !code || !unit || cost_price === undefined || sale_price === undefined) {
            return res.status(400).json({ error: 'Campos obrigatórios: nome, código, unidade, preço de custo e preço de venda' });
        }

        // Verificar se código já existe
        const existingProduct = await db.get('SELECT id FROM products WHERE code = ?', [code]);
        if (existingProduct) {
            return res.status(400).json({ error: 'Já existe um produto com este código' });
        }

        // Garantindo que a categoria não seja undefined ou null
        const categoryToSave = category || 'Sem categoria';
        console.log('Categoria a ser salva:', categoryToSave);
        
        const result = await db.run(`
            INSERT INTO products (name, description, code, unit, cost_price, price, stock, min_stock, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, description, code, unit, cost_price, sale_price, stock || 0, min_stock || 0, categoryToSave]);

        const product = await db.get('SELECT * FROM products WHERE id = ?', [result.id]);
        
        res.status(201).json(product);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar produto
router.put('/:id', authenticateToken, requirePermission('Produtos'), async (req, res) => {
    try {
        const { 
            name, description, code, ncm, cest, unit, 
            cost_price, sale_price, stock, min_stock, category, status 
        } = req.body;

        const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        await db.run(`
            UPDATE products 
            SET name = ?, description = ?, code = ?, unit = ?, 
                cost_price = ?, price = ?, stock = ?, min_stock = ?, category = ?, 
                status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, description, code, unit, cost_price, sale_price, 
            stock, min_stock, category, status || product.status, req.params.id]);

        const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        
        res.json(updatedProduct);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Importar produtos via CSV
router.post('/import', authenticateToken, requirePermission('Produtos'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Arquivo não enviado' });
        }

        const results = [];
        const errors = [];

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                let imported = 0;
                
                for (const [index, row] of results.entries()) {
                    try {
                        const { nome, codigo, descricao, categoria, ncm, cest, unidade, preco_custo, preco_venda, estoque_atual, estoque_minimo } = row;
                        
                        if (!nome || !codigo) {
                            errors.push(`Linha ${index + 2}: Nome e código são obrigatórios`);
                            continue;
                        }

                        // Verificar se código já existe
                        const existing = await db.get('SELECT id FROM products WHERE code = ?', [codigo]);
                        if (existing) {
                            errors.push(`Linha ${index + 2}: Código ${codigo} já existe`);
                            continue;
                        }

                        await db.run(`
                            INSERT INTO products (name, description, code, ncm, cest, unit, cost_price, sale_price, stock, min_stock, category)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            nome,
                            descricao || '',
                            codigo,
                            ncm || '',
                            cest || '',
                            unidade || 'UN',
                            parseFloat(preco_custo) || 0,
                            parseFloat(preco_venda) || 0,
                            parseInt(estoque_atual) || 0,
                            parseInt(estoque_minimo) || 0,
                            categoria || ''
                        ]);

                        imported++;
                    } catch (error) {
                        errors.push(`Linha ${index + 2}: ${error.message}`);
                    }
                }

                // Remover arquivo temporário
                fs.unlinkSync(req.file.path);

                res.json({
                    success: imported,
                    errors: errors,
                    message: `${imported} produtos importados com sucesso`
                });
            });
    } catch (error) {
        console.error('Erro ao importar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar produto
router.delete('/:id', authenticateToken, requirePermission('Produtos'), async (req, res) => {
    try {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        // Verificar se produto tem itens em pedidos
        const hasOrderItems = await db.get('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?', [req.params.id]);
        if (hasOrderItems.count > 0) {
            return res.status(400).json({ error: 'Não é possível excluir produto com pedidos associados' });
        }

        await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
        
        res.json({ message: 'Produto excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
});

module.exports = router;