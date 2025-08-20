const express = require('express');

const router = express.Router();

// Users API desativada: retorna 404 para qualquer requisição
router.all('*', (req, res) => {
  return res.status(404).json({ error: 'Users API desativada' });
});

module.exports = router;