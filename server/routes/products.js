const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
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
});

module.exports = router;