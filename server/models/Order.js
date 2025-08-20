const mongoose = require('mongoose');
const Counter = require('./Counter');

const orderItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const orderSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customer_name: {
    type: String,
    trim: true
  },
  customer_document: {
    type: String,
    trim: true
  },
  customer_deleted: {
    type: Boolean,
    default: false
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order_number: {
    type: String
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  due_date: {
    type: Date
  },
  payment_method: {
    type: String,
    required: true,
    enum: ['Boleto', 'PIX', 'Cartão', 'Cartão de Crédito', 'Dinheiro', 'Transferência', 'Promissória']
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  shipping: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  installments: {
    type: Number,
    min: 1,
    max: 12
  },
  installment_interval: {
    type: Number,
    enum: [7, 15, 30, 45, 60],
    default: 30
  },
  installment_details: [{
    number: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    due_date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending'
    },
    paid_amount: {
      type: Number,
      default: 0,
      min: 0
    },
    // Última data de pagamento (ISO string com offset, preserva fuso)
    payment_date: {
      type: String
    },
    // Histórico de pagamentos parciais
    payments: [{
      amount: { type: Number, required: true, min: 0 },
      // Guardar como string ISO com offset (vindo do front)
      date: { type: String, required: true }
    }],
    payment_method: {
      type: String
    }
  }],
  status: {
    type: String,
    enum: ['Pendente', 'Confirmado', 'Enviado', 'Entregue', 'Cancelado'],
    default: 'Pendente'
  },
  notes: {
    type: String,
    trim: true
  },
  // Assinatura do cliente (imagem base64 data URL: data:image/png;base64,...)
  signatureImage: {
    type: String,
    default: ''
  },
  paid_amount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Índices para multi-tenancy
orderSchema.index({ tenantId: 1 });
orderSchema.index({ tenantId: 1, order_number: 1 }, { unique: true });
orderSchema.index({ tenantId: 1, customer_id: 1 });
orderSchema.index({ tenantId: 1, user_id: 1 });
orderSchema.index({ tenantId: 1, date: -1 });
// Otimiza agregações/consultas por tenant + cliente, ordenadas por data
orderSchema.index({ tenantId: 1, customer_id: 1, date: -1 });

// Gerar número do pedido automaticamente (sequência atômica)
orderSchema.pre('save', async function(next) {
  try {
    // Se já tiver número, não gerar novamente
    if (this.order_number) return next();

    const OrderModel = mongoose.model('Order');

    // Garantir que exista um contador inicializado
    let counter = await Counter.findOne({ name: 'order_number' });
    if (!counter) {
      // Tentar inicializar com base no maior número já emitido
      const lastOrder = await OrderModel.findOne({ order_number: { $exists: true } })
        .sort({ createdAt: -1 })
        .select('order_number')
        .lean();

      let start = 0;
      if (lastOrder && typeof lastOrder.order_number === 'string') {
        const match = lastOrder.order_number.match(/#?0*(\d+)/);
        if (match) start = parseInt(match[1], 10) || 0;
      } else {
        // Fallback: usar quantidade atual de documentos
        const count = await OrderModel.countDocuments();
        start = count;
      }
      counter = await Counter.create({ name: 'order_number', seq: start });
    }

    // Incremento atômico
    const updated = await Counter.findOneAndUpdate(
      { name: 'order_number' },
      { $inc: { seq: 1 } },
      { new: true }
    );

    this.order_number = `#${String(updated.seq).padStart(5, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Order', orderSchema);