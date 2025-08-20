const express = require('express');
const Visit = require('../models/Visit');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const { auth, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Listar visitas
router.get('/', auth, checkPermission('Agenda'), async (req, res) => {
  try {
    const { date, user_id, status, page = 1, limit = 10 } = req.query;
    const query = { tenantId: req.tenantId };

    if (date) {
      // Since date is stored as string (YYYY-MM-DD), compare directly as string
      query.date = date;
    }

    if (user_id) {
      query.user_id = user_id;
    }

    if (status) {
      query.status = status;
    }

    const visits = await Visit.find(query)
      .populate('customer_id', 'name phone')
      .populate('user_id', 'name')
      .sort({ date: 1, time: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Visit.countDocuments(query);

    res.json({
      visits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar visitas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar visita por ID
router.get('/:id', auth, checkPermission('Agenda'), async (req, res) => {
  try {
    const visit = await Visit.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('customer_id')
      .populate('user_id', 'name');

    if (!visit) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }
    // Notificações por mudança de status (não bloqueante)
    try {
      let type = 'info';
      let title = 'Status da visita atualizado';
      if (status === 'Concluída') { type = 'success'; title = 'Visita concluída'; }
      if (status === 'Atrasada') { type = 'warning'; title = 'Visita atrasada'; }
      const message = `Visita com ${visit.customer_id?.name || 'cliente'} agora está como "${status}".`;
      const notif = new Notification({ user_id: req.user?._id || null, type, title, message });
      notif.save().catch(() => {});
    } catch (e) {
      console.warn('Falha ao notificar mudança de status de visita:', e?.message);
    }

    res.json(visit);
  } catch (error) {
    console.error('Erro ao buscar visita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar visita
router.post('/', auth, checkPermission('Agenda'), async (req, res) => {
  try {
    const { customer_id, date, time, location, type, notes, reminder } = req.body;

    // Validar se o cliente existe
    const customer = await Customer.findOne({ _id: customer_id, tenantId: req.tenantId });
    if (!customer) {
      return res.status(400).json({ error: 'Cliente não encontrado' });
    }

    const visit = new Visit({
      customer_id,
      user_id: req.user._id,
      date,
      time,
      location,
      type,
      notes,
      reminder,
      tenantId: req.tenantId
    });

    await visit.save();
    await visit.populate('customer_id', 'name phone');
    await visit.populate('user_id', 'name');

    // Notificação: nova visita agendada (não bloqueante)
    try {
      const title = 'Nova visita agendada';
      const message = `Visita com ${visit.customer_id?.name || 'cliente'} em ${visit.date}${visit.time ? ` às ${visit.time}` : ''}.`;
      const notif = new Notification({
        user_id: req.user?._id || null,
        type: 'info',
        title,
        message,
      });
      notif.save().catch(() => {});
    } catch (e) {
      console.warn('Falha ao criar notificação de nova visita:', e?.message);
    }

    res.status(201).json(visit);
  } catch (error) {
    console.error('Erro ao criar visita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar visita
router.put('/:id', auth, checkPermission('Agenda'), async (req, res) => {
  try {
    if ('tenantId' in req.body) delete req.body.tenantId;
    const visit = await Visit.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    ).populate('customer_id', 'name phone').populate('user_id', 'name');
    
    if (!visit) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }
    
    res.json(visit);
  } catch (error) {
    console.error('Erro ao atualizar visita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar status da visita
router.patch('/:id/status', auth, checkPermission('Agenda'), async (req, res) => {
  try {
    const { status } = req.body;
    
    const visit = await Visit.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status },
      { new: true }
    ).populate('customer_id', 'name');

    if (!visit) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }

    res.json(visit);
  } catch (error) {
    console.error('Erro ao atualizar status da visita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar visita
router.delete('/:id', auth, checkPermission('Agenda'), async (req, res) => {
  try {
    const visit = await Visit.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!visit) {
      return res.status(404).json({ error: 'Visita não encontrada' });
    }
    
    res.json({ message: 'Visita excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar visita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;