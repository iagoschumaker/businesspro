const express = require('express');
const { auth, checkPermission } = require('../middleware/auth');
const CompanyProfile = require('../models/CompanyProfile');

const router = express.Router();

// GET /api/company/profile
router.get('/profile', auth, checkPermission('Empresa:Ver'), async (req, res) => {
  try {
    const doc = await CompanyProfile.findOne().lean();
    res.json(doc || {});
  } catch (e) {
    console.error('Erro ao obter perfil da empresa:', e);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/company/profile
router.put('/profile', auth, checkPermission('Empresa:Editar'), async (req, res) => {
  try {
    const update = req.body || {};
    const doc = await CompanyProfile.findOneAndUpdate(
      {},
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (e) {
    console.error('Erro ao salvar perfil da empresa:', e);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
