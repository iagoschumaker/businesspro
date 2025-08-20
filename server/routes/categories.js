const express = require('express');
const router = express.Router();

// Mock de categorias em memória (substitua por integração com banco se desejar)
let categories = [
  { id: 1, name: 'Alimentos' },
  { id: 2, name: 'Bebidas' },
  { id: 3, name: 'Limpeza' }
];

// GET /api/categories
router.get('/', (req, res) => {
  res.json({ categories });
});

// GET /api/categories/:id
router.get('/:id', (req, res) => {
  const category = categories.find(c => c.id == req.params.id);
  if (category) {
    res.json(category);
  } else {
    res.status(404).json({ message: 'Categoria não encontrada' });
  }
});

// POST /api/categories
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Nome é obrigatório' });
  const newCategory = { id: Date.now(), name };
  categories.push(newCategory);
  res.status(201).json(newCategory);
});

// PUT /api/categories/:id
router.put('/:id', (req, res) => {
  const { name } = req.body;
  const category = categories.find(c => c.id == req.params.id);
  if (category) {
    category.name = name;
    res.json(category);
  } else {
    res.status(404).json({ message: 'Categoria não encontrada' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  categories = categories.filter(c => c.id != req.params.id);
  res.status(204).send();
});

module.exports = router;
