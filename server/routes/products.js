const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
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
});

module.exports = router;