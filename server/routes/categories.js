const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Listar todas as categorias
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Primeiro tenta buscar categorias existentes
        const categories = await db.all('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ""');
        
        // Extrai os nomes das categorias em um array
        const categoryNames = categories.map(item => item.category);
        
        // Categorias padrão para o caso de não haver categorias cadastradas
        const defaultCategories = [
            'Material de Escritório',
            'Informática',
            'Móveis',
            'Eletrônicos',
            'Ferramentas',
            'Material Elétrico',
            'Material Hidráulico'
        ];
        
        // Combina as categorias existentes com as padrão, eliminando duplicatas
        const allCategories = [...new Set([...categoryNames, ...defaultCategories])];
        
        res.json(allCategories);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Adicionar nova categoria
router.post('/', authenticateToken, requirePermission('Produtos'), async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
        }
        
        // Verificar se a categoria já existe
        const existingCategory = await db.get('SELECT 1 FROM products WHERE category = ? LIMIT 1', [name]);
        if (existingCategory) {
            return res.status(400).json({ error: 'Esta categoria já existe' });
        }
        
        // Cria um produto dummy com esta categoria para garantir que ela exista
        // Uma alternativa seria ter uma tabela de categorias, mas isso exigiria alteração no schema
        await db.run(`
            INSERT INTO products (name, code, unit, cost_price, price, stock, category) 
            VALUES ('__CATEGORY_PLACEHOLDER__', 'CAT_PLACEHOLDER', 'UN', 0, 0, 0, ?)
        `, [name]);
        
        res.status(201).json({ name });
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
