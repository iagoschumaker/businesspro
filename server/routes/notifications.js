const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Listar notificações
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, unread_only, read_only } = req.query;
    const query = { tenantId: req.tenantId };

    // Filtrar por usuário ou notificações globais
    query.$or = [
      { user_id: req.user._id },
      { user_id: null }
    ];

    if (unread_only === 'true') {
      query.read = false;
    } else if (read_only === 'true') {
      query.read = true;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar notificação como lida
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id,
        tenantId: req.tenantId,
        $or: [
          { user_id: req.user._id },
          { user_id: null }
        ]
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar todas como lidas
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        tenantId: req.tenantId,
        $or: [
          { user_id: req.user._id },
          { user_id: null }
        ],
        read: false
      },
      { read: true }
    );

    res.json({ message: 'Todas as notificações foram marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar notificação
router.post('/', auth, async (req, res) => {
  try {
    const { user_id, type, title, message } = req.body;

    // Se user_id não for informado, salvar como null para ser considerada "global"
    const payload = {
      tenantId: req.tenantId,
      user_id: user_id || null,
      type,
      title,
      message,
    };

    const notification = new Notification(payload);

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover notificações lidas
router.delete('/read', auth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      tenantId: req.tenantId,
      $or: [
        { user_id: req.user._id },
        { user_id: null }
      ],
      read: true,
    });
    res.json({ deleted: result?.deletedCount || 0 });
  } catch (error) {
    console.error('Erro ao remover notificações lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;