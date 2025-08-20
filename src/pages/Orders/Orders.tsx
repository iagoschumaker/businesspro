<<<<<<< HEAD
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { formatBRFlexible, formatBRDateTime } from '../../utils/date';
import { Search, FileText, DollarSign, Clock, Send, CheckCircle, ChevronDown, Trash2, Receipt } from 'lucide-react';
=======
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, Loader, Edit, FileText, Eye, Trash } from 'lucide-react';
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import OrderForm from './OrderForm';
<<<<<<< HEAD
import { generateOrderPDF, OrderPDFData } from '../../utils/pdfGenerator';
 
// import StatsHeader from '../../components/Common/StatsHeader'; // removed: inlined period selector

import { toast } from 'react-hot-toast';
import FloatingActionButton from '../../components/Common/FloatingActionButton';
import { customersService } from '../../services/api';

const Orders: React.FC = () => {
  const navigate = useNavigate();
  // --- Estados para pagamento de parcelas ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState<number[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  // Expandir detalhes inline (mobile)
  const [expandedMobile, setExpandedMobile] = useState<Record<string, boolean>>({});
  // Expandir detalhes inline (desktop)
  const [expandedDesktop, setExpandedDesktop] = useState<Record<string, boolean>>({});

  // Tabs por status do pedido (todos/pendente/enviado/entregue)
  const [activeTab, setActiveTab] = useState<'todos' | 'pendente' | 'enviado' | 'entregue'>('todos');

   

  // Helper: Data/hora ISO com fuso local (ex.: 2025-08-10T12:34:56-03:00)
  const isoNow = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    const offsetMin = d.getTimezoneOffset();
    const sign = offsetMin > 0 ? '-' : '+';
    const abs = Math.abs(offsetMin);
    const offH = pad(Math.floor(abs / 60));
    const offM = pad(abs % 60);
    return `${y}-${M}-${day}T${h}:${m}:${s}${sign}${offH}:${offM}`;
  };

  // Função para registrar pagamento das parcelas selecionadas
  const handleRegisterPayment = async () => {
    if (!orderToView || !Array.isArray(orderToView.installment_details)) return;
    if (selectedInstallments.length === 0) {
      toast.error('Selecione pelo menos uma parcela');
      return;
    }
    setPaymentLoading(true);
    try {
      // Atualiza status e paid_amount das parcelas selecionadas
      const updatedInstallments = orderToView.installment_details.map((inst: any) => {
        if (selectedInstallments.includes(inst.number)) {
          return {
            ...inst,
            paid_amount: inst.amount,
            status: 'paid',
            payment_date: new Date().toISOString().slice(0, 10),
          };
        }
        return inst;
      });
      // Soma total pago
      const newPaidAmount = updatedInstallments.reduce((sum: number, inst: any) => sum + (inst.paid_amount || 0), 0);
      // PATCH para backend
      const mod = await import('../../services/api');
      await mod.ordersService.update(orderToView._id || orderToView.id, {
        installment_details: updatedInstallments,
        paid_amount: newPaidAmount,
      });
      // Se totalmente pago, não alteramos mais o status do pedido automaticamente
      // Atualiza apenas os campos de pagamento/local
      setOrderToView({ ...orderToView, installment_details: updatedInstallments, paid_amount: newPaidAmount });
      setOrdersList((curr: any[]) => curr.map((o: any) =>
        (o.id === (orderToView.id || orderToView._id) || o._id === (orderToView.id || orderToView._id) || o.order_number === (orderToView.order_number))
          ? { ...o, installment_details: updatedInstallments, paid_amount: newPaidAmount }
          : o
      ));
      toast.success('Pagamento registrado com sucesso!');
      setIsPaymentModalOpen(false);
    } catch (e) {
      toast.error('Erro ao registrar pagamento');
    } finally {
      setPaymentLoading(false);
    }
  };

  // --- Modal de seleção de parcelas ---
  const PaymentModal = () => {
    if (!orderToView || !Array.isArray(orderToView.installment_details)) return null;
    return (
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Registrar Pagamento">
        <div className="space-y-4">
          <div className="font-semibold">Selecione as parcelas a marcar como pagas:</div>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {orderToView.installment_details.map((inst: any) => (
              <label key={inst.number} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedInstallments.includes(inst.number)}
                  disabled={inst.status === 'paid'}
                  onChange={e => {
                    if (e.target.checked) setSelectedInstallments(prev => [...prev, inst.number]);
                    else setSelectedInstallments(prev => prev.filter(n => n !== inst.number));
                  }}
                />
                <span>
                  Parcela {inst.number}: R$ {inst.amount?.toFixed(2)} | Venc: {inst.due_date ? formatBRFlexible(inst.due_date) : '-'} |
                  Status: <b>{inst.status === 'paid' ? 'Paga' : inst.status === 'overdue' ? 'Atrasada' : 'Pendente'}</b>
                </span>
              </label>
            ))}
          </div>
          <Button onClick={handleRegisterPayment} loading={paymentLoading} disabled={selectedInstallments.length === 0}>
            Confirmar Pagamento
          </Button>
        </div>
      </Modal>
    );
=======
import { ordersService, customersService } from '../../services/api';
import { generateOrderPDF, OrderPDFData } from '../../utils/pdfGenerator';

interface Order {
  id: string;
  customer_id: number;
  customer_name?: string;
  date: string;
  subtotal?: number;
  discount?: number;
  shipping?: number;
  total: number;
  status: string;
  items: number;
  payment_method?: string;
  due_date?: string;
  notes?: string;
  items_count?: number;
}

const Orders: React.FC<{}> = () => {
  // Função para exclusão em massa de pedidos
  const deleteAllOrders = async () => {
    if (!orders.length) {
      alert('Nenhum pedido para excluir.');
      return;
    }
    if (!window.confirm('ATENÇÃO: Isso tentará excluir TODOS os pedidos do banco de dados. Deseja continuar?')) {
      return;
    }
    setLoading(true);
    let deleted = 0;
    let failed = 0;
    for (const order of orders) {
      try {
        // Excluir o pedido diretamente
        await ordersService.delete(Number(order.id));
        deleted++;
      } catch (error) {
        failed++;
        console.error('Erro ao excluir pedido ID', order.id, error);
      }
    }
    setLoading(false);
    alert(`Total excluídos: ${deleted}\nFalharam: ${failed}`);
    refreshOrderList();
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
<<<<<<< HEAD
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [orderToView, setOrderToView] = useState<any | null>(null);
  // Destacar e rolar até o pedido aberto via query (?open=)
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const desktopRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const mobileCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [statsRange, setStatsRange] = useState<'today' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'custom' | 'all'>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchParams] = useSearchParams();

  // Opções de status permitidas (valores em minúsculas)
  const statusOptions = ['pendente', 'enviado', 'entregue', 'pago'] as const;

  const toTitle = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

  // Visual meta para exibir o select como um "badge" (pílula), alinhado ao padrão do Dashboard/CustomerDetail
  const getStatusMeta = (status: string) => {
    const key = (status || '').toLowerCase();
    switch (key) {
      case 'pendente':
        return {
          classes:
            'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
        };
      case 'enviado':
        return {
          classes:
            'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
        };
      case 'entregue':
        return {
          classes:
            'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
        };
      case 'pago':
        return {
          classes:
            'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
        };
      default:
        return {
          classes:
            'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700',
        };
    }
  };

  // Componente de Select custom (não usa <select>) para controle total do dropdown no dark mode
  const StatusSelect: React.FC<{
    value: string;
    onChange: (val: string) => void;
  }> = ({ value, onChange }) => {
    const current = (value || 'pendente').toLowerCase();
    const meta = getStatusMeta(current);
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const btnRef = React.useRef<HTMLButtonElement | null>(null);
    const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

    React.useEffect(() => {
      const listener = (e: MouseEvent) => {
        const target = e.target as Node;
        const insideButton = ref.current?.contains(target);
        const insideMenu = menuRef.current?.contains(target);
        if (!insideButton && !insideMenu) {
          setOpen(false);
        }
      };
      const handleResize = () => setOpen(false);
      document.addEventListener('mousedown', listener);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('mousedown', listener);
        window.removeEventListener('resize', handleResize);
      };
    }, []);

    const handleSelect = (opt: string) => {
      onChange(opt);
      setOpen(false);
    };

    return (
      <div ref={ref} className="relative inline-block text-left">
        <button
          type="button"
          ref={btnRef}
          className={`inline-flex items-center rounded-full px-3 py-1.5 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${meta.classes}`}
          onClick={() => {
            if (!btnRef.current) return;
            const r = btnRef.current.getBoundingClientRect();
            // Estimar altura do menu (3 itens * 40px aprox)
            const estHeight = 140;
            const below = r.bottom + 4 + estHeight <= window.innerHeight;
            const top = below ? r.bottom + 4 : Math.max(8, r.top - 8 - estHeight);
            const left = Math.min(Math.max(8, r.left), window.innerWidth - Math.max(160, r.width) - 8);
            setPos({ top: Math.round(top), left: Math.round(left), width: Math.round(r.width) });
            setOpen((v) => !v);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="text-current">{toTitle(current)}</span>
          <ChevronDown className={`w-4 h-4 absolute right-2 opacity-80 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-auto max-h-60"
            style={{ top: pos.top, left: pos.left, width: Math.max(pos.width, 160) }}
            role="listbox"
          >
            {statusOptions.map((opt) => {
              const active = opt === current;
              return (
                <button
                  type="button"
                  key={opt}
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {toTitle(opt)}
                </button>
              );
            })}
          </div>,
          document.body
        )}
      </div>
    );
  };

  // Carrega pedidos do backend
  const loadOrders = async () => {
    try {
      // Adapte os parâmetros conforme necessário para sua API
      const orders = await import('../../services/api').then(mod => mod.ordersService.getAll());
      setOrdersList(orders);
    } catch (error) {
      toast.error('Erro ao carregar pedidos');
    }
  };

  // Abre automaticamente (expande inline) um pedido quando chegar via query string ?open=<id>
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId) return;
    // Tenta encontrar o pedido na lista e expandir inline em mobile e desktop
    const idx = ordersList.findIndex((o: any) => String(o?.id || o?._id || o?.order_number) === String(openId));
    if (idx >= 0) {
      const order = ordersList[idx];
      const stableId = String(order?.id || order?._id || order?.order_number || idx);
      // Expandir ambos os modos para consistência
      setExpandedDesktop((prev) => ({ ...prev, [stableId]: true }));
      setExpandedMobile((prev) => ({ ...prev, [stableId]: true }));
      setHighlightId(stableId);
      // Scroll até o elemento após próximo paint
      setTimeout(() => {
        const elDesktop = desktopRowRefs.current[stableId];
        const elMobile = mobileCardRefs.current[stableId];
        const el = elDesktop || elMobile;
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, ordersList]);

  // Helpers para itens do pedido
  // (removidos helpers não utilizados: getItemName, getItemQty, getItemPrice)

  // Extrai itens independente do formato retornado pela API
  const getOrderItems = (order: any): any[] => {
    if (!order) return [];
    // Possíveis caminhos comuns
    const candidates: any[] = [
      order.items,
      order.order_items,
      order.products,
      order.itens, // variação em pt-BR
      order.cart_items,
      order.lines,
      order.order?.items,
      order.data?.items,
      order.details?.items,
    ].filter(Boolean);

    let items: any[] | Record<string, any> = [];
    if (candidates.length > 0) {
      items = candidates[0] as any[];
    }

    // Suporta formato objeto (mapa) -> converte para array
    if (items && !Array.isArray(items) && typeof items === 'object') {
      items = Object.values(items as Record<string, any>);
    }

    // Alguns backends retornam objeto com { items: { data: [...] } }
    if ((!items || (Array.isArray(items) && items.length === 0)) && order.items?.data && Array.isArray(order.items.data)) {
      items = order.items.data;
    }

    // Alguns modelos aninham dentro de um primeiro elemento
    if (Array.isArray(items) && items.length === 1 && Array.isArray((items as any)[0]?.items)) {
      items = (items as any)[0].items;
    }

    // Normalização final
    if (!Array.isArray(items)) return [];
    return items as any[];
  };

  // (removida função não utilizada: handleViewOrder)

  const cancelDeleteOrder = () => {
    setOrderToDelete(null);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    const id = orderToDelete.id || orderToDelete._id;
    setDeletingId(id);
    try {
      const mod = await import('../../services/api');
      if (mod?.ordersService?.delete) {
        await mod.ordersService.delete(id);
      }
      setOrdersList(prev => prev.filter(o => (o.id || o._id) !== id));
      toast.success('Pedido excluído com sucesso!');
      setOrderToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast.error('Erro ao excluir pedido.');
    } finally {
      setDeletingId(null);
    }
  };

  // Carrega pedidos ao montar
  React.useEffect(() => {
    loadOrders();
  }, []);

  // (removed) Outside-click handler for filters dropdown

  // Handler para OrderForm
  const handleOrderSave = () => {
    loadOrders();
    setIsModalOpen(false);
  };

  // Utilitário: obter data do pedido
  // Prefer creation timestamp to display time even when business date is YMD-only
  const getOrderDate = (o: any) => new Date(o?.createdAt || o?.created_at || o?.date || Date.now());

// Quantidade de parcelas do pedido (vários formatos de backend)
const getInstallmentsCount = (o: any): number | undefined => {
  return (
    o?.installments ??
    o?.parcelas ??
    (Array.isArray(o?.installment_details) ? o.installment_details.length : undefined) ??
    (Array.isArray(o?.installmentDetails) ? o.installmentDetails.length : undefined) ??
    (Array.isArray(o?.payment_plan?.installments) ? o.payment_plan.installments.length : undefined)
  );
};

  // Categoriza pedidos por status
  const categorized = useMemo(() => {
    const groups = {
      todos: ordersList,
      pendente: [] as any[],
      enviado: [] as any[],
      entregue: [] as any[],
    };
    ordersList.forEach((o: any) => {
      const s = String(o?.status || '').toLowerCase();
      if (s === 'pendente') groups.pendente.push(o);
      else if (s === 'enviado') groups.enviado.push(o);
      else if (s === 'entregue') groups.entregue.push(o);
    });
    return groups;
  }, [ordersList]);

  const baseForTab = activeTab === 'todos' ? ordersList : (categorized as any)[activeTab];

  const filteredOrders = baseForTab
    .filter((order: any) => {
      const orderId = order.order_number || order.id || order._id || '';
      const customerName = order.customer || order.customer_id?.name || '';
      const searchLower = searchTerm.toLowerCase();
      
      return (
        orderId.toString().toLowerCase().includes(searchLower) ||
        customerName.toString().toLowerCase().includes(searchLower)
      );
    })
    .filter((order: any) => {
      // Apply the same period filter logic as used in statistics
      const d = getOrderDate(order);
      const now = new Date();
      const cutoff7d = new Date(now);
      cutoff7d.setDate(now.getDate() - 7);
      const cutoff30d = new Date(now);
      cutoff30d.setDate(now.getDate() - 30);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      
      switch (statsRange) {
        case 'today':
          return d >= startOfToday && d <= now;
        case '7d':
          return d >= cutoff7d && d <= now;
        case '30d':
          return d >= cutoff30d && d <= now;
        case 'thisMonth':
          return d >= startOfThisMonth && d <= now;
        case 'lastMonth':
          return d >= startOfLastMonth && d <= endOfLastMonth;
        case 'custom':
          if (!customStartDate || !customEndDate) return true;
          const startDate = new Date(customStartDate + 'T00:00:00');
          const endDate = new Date(customEndDate + 'T23:59:59');
          return d >= startDate && d <= endDate;
        case 'all':
        default:
          return true;
      }
    });

  // Exemplo de uso correto de map/reduce com tipagem:
  // const total = ordersList.reduce((sum: number, order: any) => sum + order.total, 0);

  // Filtra pedidos para estatísticas conforme período selecionado
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const cutoff7d = new Date(now);
  cutoff7d.setDate(now.getDate() - 7);
  const cutoff30d = new Date(now);
  cutoff30d.setDate(now.getDate() - 30);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const ordersForStats = ordersList.filter((o: any) => {
    const d = getOrderDate(o);
    switch (statsRange) {
      case 'today':
        return d >= startOfToday && d <= now;
      case '7d':
        return d >= cutoff7d && d <= now;
      case '30d':
        return d >= cutoff30d && d <= now;
      case 'thisMonth':
        return d >= startOfThisMonth && d <= now;
      case 'lastMonth':
        return d >= startOfLastMonth && d <= endOfLastMonth;
      case 'custom':
        if (!customStartDate || !customEndDate) return true;
        const startDate = new Date(customStartDate + 'T00:00:00');
        const endDate = new Date(customEndDate + 'T23:59:59');
        return d >= startDate && d <= endDate;
      case 'all':
      default:
        return true;
    }
  });

  // Contadores por status (normalizados)
  const statusCounts = ordersForStats.reduce(
    (acc: { pendente: number; enviado: number; entregue: number }, o: any) => {
      const s = String(o?.status || '').toLowerCase();
      if (s === 'pendente') acc.pendente += 1;
      if (s === 'enviado') acc.enviado += 1;
      if (s === 'entregue' || s === 'pago' || s === 'paid') acc.entregue += 1;
      return acc;
    },
    { pendente: 0, enviado: 0, entregue: 0 }
  );

  const totalValue = ordersForStats.reduce(
    (sum: number, order: any) => sum + (Number(order?.total) || 0),
    0
  );

  const statusTotals = ordersForStats.reduce(
    (
      acc: { pendente: number; enviado: number; entregue: number },
      o: any
    ) => {
      const s = String(o?.status || '').toLowerCase();
      const val = Number(o?.total) || 0;
      if (s === 'pendente') acc.pendente += val;
      if (s === 'enviado') acc.enviado += val;
      if (s === 'entregue' || s === 'pago' || s === 'paid') acc.entregue += val;
      return acc;
    },
    { pendente: 0, enviado: 0, entregue: 0 }
  );

  // Compara pedidos por identificador estável; se ausente, usa referência
  const sameOrder = (a: any, b: any) => {
    if (!a || !b) return false;
    const ida = a?.order_number ?? a?.id ?? a?._id;
    const idb = b?.order_number ?? b?.id ?? b?._id;
    if (ida && idb) return ida === idb;
    return a === b;
  };

  // Atualiza status do pedido (com atualização otimista)
  const handleChangeStatus = async (order: any, nextStatus: string) => {
    const id = order?.id || order?._id || order?.order_number;
    if (!id) return;
    const prev = order.status;
    // Otimista: atualiza na lista
    setOrdersList((curr: any[]) => curr.map((o: any) => (sameOrder(o, order) ? { ...o, status: nextStatus } : o)));
    // Se estiver aberto no modal, atualiza também
    setOrderToView((curr: any | null) => (curr && sameOrder(curr, order) ? { ...curr, status: nextStatus } : curr));
    try {
      const mod = await import('../../services/api');
      if (mod?.ordersService?.updateStatus) {
        await mod.ordersService.updateStatus(id as any, nextStatus);
        toast.success('Status atualizado');
      }

      // Se marcado como pago, registrar pagamento total automaticamente
      if (['pago', 'paid'].includes(String(nextStatus).toLowerCase())) {
        try {
          // Buscar pedido completo para garantir acesso às parcelas
          const full = mod?.ordersService?.getById ? await mod.ordersService.getById(id as any) : order;
          const total = Number(full?.total) || 0;
          const now = isoNow();
          const normalizeDue = (raw: any): string => {
            if (!raw) return new Date(full?.createdAt || full?.created_at || Date.now()).toISOString().slice(0, 10);
            const s = String(raw);
            return s.includes('T') ? s.slice(0, 10) : s;
          };
          let installments: any[] = Array.isArray(full?.installment_details) ? [...full.installment_details] : [];
          if (!installments.length) {
            // Criar parcela única
            installments = [{ number: 1, amount: total, due_date: normalizeDue((full as any)?.due_date || (full as any)?.dueDate), status: 'paid', paid_amount: total, payment_date: now, payments: [{ amount: total, date: now }] }];
          } else {
            // Quitar todas as parcelas
            installments = installments.map((inst: any, idx: number) => {
              const amt = Number(inst?.amount) || 0;
              return {
                ...inst,
                number: inst?.number ?? idx + 1,
                amount: amt,
                due_date: normalizeDue(inst?.due_date || inst?.dueDate || inst?.vencimento),
                paid_amount: amt,
                status: 'paid',
                payment_date: now,
                payments: [...(Array.isArray(inst?.payments) ? inst.payments : []), { amount: Math.max(0, amt - (Number(inst?.paid_amount) || 0)), date: now }].filter((p: any) => (p?.amount || 0) > 0),
              };
            });
          }
          const newPaid = installments.reduce((s, i) => s + (Number(i?.paid_amount) || 0), 0);
          const payload: any = { installment_details: installments, paid_amount: newPaid, remaining_amount: Math.max(0, total - newPaid) };
          if (mod?.ordersService?.update) {
            await mod.ordersService.update(id as any, payload);
          }
          // Atualiza estados locais
          setOrdersList((curr: any[]) => curr.map((o: any) => (sameOrder(o, order) ? { ...o, ...payload } : o)));
          setOrderToView((curr: any | null) => (curr && sameOrder(curr, order) ? { ...curr, ...payload } : curr));
          toast.success('Pagamento total registrado automaticamente.');
        } catch (payErr) {
          console.warn('Falha ao registrar pagamento automático:', payErr);
          // Mantém status entregue mesmo se falhar pagamento; UX otimista
        }
      }
    } catch (e) {
      console.error('Erro ao atualizar status:', e);
      toast.error('Não foi possível atualizar o status');
      // Reverte em caso de erro
      setOrdersList((curr: any[]) => curr.map((o: any) => (sameOrder(o, order) ? { ...o, status: prev } : o)));
      setOrderToView((curr: any | null) => (curr && sameOrder(curr, order) ? { ...curr, status: prev } : curr));
    }
  };

  // Helpers para ID de exibição e cópia
  const getDisplayOrderId = (o: any) => (o?.order_number || o?.id || o?._id || 'N/A').toString();
  const truncateId = (id: string) => (id && id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);


  const generatePDF = async (lookupId: string) => {
    const order = ordersList.find((o: any) => o.id === lookupId || o._id === lookupId || o.order_number === lookupId);
    if (!order) {
      toast.error('Pedido não encontrado');
      return;
    }
    // Try to resolve full customer details
    let customerObj: any = (order as any).customer || (order as any).customer_id || (order as any).client || (order as any).cliente || (order as any).customer_name || (order as any).cliente_nome;
    try {
      const hasBasicOnly = typeof customerObj === 'string' || (customerObj && typeof customerObj === 'object' && !(
        customerObj.document || customerObj.cpf || customerObj.cnpj || customerObj.address || customerObj.endereco || customerObj.phone || customerObj.telefone || customerObj.email
      ));
      // Normalize customer_id to a string ObjectId if possible
      const rawCid: any = (order as any).customer_id;
      let cid: string | undefined;
      if (typeof rawCid === 'string') {
        cid = rawCid;
      } else if (rawCid && typeof rawCid === 'object') {
        cid = rawCid._id || rawCid.id;
      } else if (customerObj && typeof customerObj === 'object') {
        cid = customerObj._id || customerObj.id;
      }
      const isValidObjectId = (s?: string) => !!s && /^[0-9a-fA-F]{24}$/.test(s);
      if (isValidObjectId(cid) && hasBasicOnly) {
        const fetched = await customersService.getById(cid as string);
        if (fetched) customerObj = { ...(typeof customerObj === 'object' ? customerObj : {}), ...fetched };
      }
    } catch (e) {
      // Silent fallback; keep existing data
    }

    // Prefer injecting company profile using service (mobile + API fallback)
    let injectedCompany: any = undefined;
    try {
      const mod = await import('../../services/api');
      injectedCompany = await mod.companyService.getProfile();
    } catch {}

    const orderData: OrderPDFData = {
      id: order.order_number || order.id || order._id,
      customer: customerObj,
      date: order.date || order.createdAt,
      createdAt: (order as any).createdAt || (order as any).created_at || (order as any).date,
      dueDate: order.dueDate || order.due_date,
      paymentMethod: order.paymentMethod || order.payment_method,
      items: order.items || [],
      subtotal: order.subtotal || 0,
      discount: order.discount || 0,
      shipping: (order as any).shipping || (order as any).frete || (order as any).freight || 0,
      total: order.total || 0,
      notes: order.notes || '',
      installment_details: (order as any).installment_details || undefined,
      installments: (order as any).installments || (order as any).parcelas || undefined,
      // Include persisted signature image if present
      signatureImage: (order as any).signatureImage || (order as any).signature_image || (order as any).signature || undefined,
      companyProfile: injectedCompany,
    };
    await generateOrderPDF(orderData);
=======
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewOrderDetails, setViewOrderDetails] = useState<Order | null>(null);

  const refreshOrderList = async () => {
    try {
      setLoading(true);
      console.log('Buscando pedidos do banco de dados...');
      const response = await ordersService.getAll();
      console.log('Resposta bruta da API de pedidos:', response);
      
      if (response) {
        console.log('Pedidos recebidos:', response);
        
        // Formatar os dados recebidos para o formato esperado pelo componente
        const formattedOrders = await Promise.all((Array.isArray(response) ? response : [response]).map(async (order: any) => {
          // Para cada pedido, buscar os dados do cliente se necessário
          let customerName = order.customer_name || '';
          
          if (!customerName && order.customer_id) {
            try {
              const customerResponse = await customersService.getById(order.customer_id);
              if (customerResponse) {
                customerName = customerResponse.name || 'Cliente sem nome';
              }
            } catch (err) {
              console.error('Erro ao buscar dados do cliente:', err);
            }
          }
          
          return {
            id: order.id ? String(order.id) : '',
            customer_id: order.customer_id || 0,
            customer_name: customerName,
            date: order.date || new Date().toISOString().split('T')[0],
            total: order.total || 0,
            status: order.status || 'Pendente',
            items: order.items_count || 0,
            payment_method: order.payment_method || '',
            due_date: order.due_date || '',
            notes: order.notes || ''
          };
        }));
        
        setOrders(formattedOrders);
        setError(null);
      } else {
        console.error('Resposta da API não contém dados de pedidos');
        setError('Não há pedidos cadastrados no banco de dados.');
        setOrders([]);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
      setError('Erro ao carregar pedidos do banco de dados');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar pedidos quando o componente montar
  useEffect(() => {
    refreshOrderList();
  }, []);
  
  const filteredOrders = orders.filter(order => {
    // Garante que o ID é tratado como string antes de chamar toLowerCase()
    const orderId = String(order.id).toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();
    
    return orderId.includes(searchTermLower) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(searchTermLower));
  });

  const statusOptions = ['Pendente', 'Confirmado', 'Enviado', 'Entregue', 'Cancelado'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Enviado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Entregue':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Cancelado':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };
  
  // Função para atualizar o status de um pedido
  const updateOrderStatus = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      await ordersService.updateStatus(Number(id), newStatus);
      // Atualiza o pedido na lista local sem precisar recarregar todos os pedidos
      setOrders(orders.map(order => {
        if (order.id === id) {
          return { ...order, status: newStatus };
        }
        return order;
      }));
    } catch (err) {
      console.error('Erro ao atualizar status do pedido:', err);
      alert('Erro ao atualizar status. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para tentar forçar a exclusão de um pedido diretamente via API
  const forceDeleteOrder = async (id: string) => {
    if (window.confirm('ATENÇÃO: Você está tentando excluir um pedido.\n\nTem certeza que deseja continuar?')) {
      try {
        setLoading(true);
        const orderId = Number(id);
        
        // Excluir pedido diretamente
        await ordersService.delete(orderId);
        alert('Pedido excluído com sucesso!');
        refreshOrderList();
      } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        alert('Erro ao excluir pedido. Verifique o console para mais detalhes.');
      } finally {
        setLoading(false);
      }
    }
  }


  // Função para gerar PDF de um pedido
  const generatePDF = async (order: Order) => {
    try {
      // Obter dados completos do pedido se necessário
      let orderDetails = order;
      let customerDetails = null;
      
      if (!orderDetails.items_count) {
        const response = await ordersService.getById(Number(order.id));
        if (response) {
          orderDetails = response;
        }
      }
      
      // Tentar buscar dados completos do cliente se tivermos o customer_id
      if (orderDetails.customer_id) {
        try {
          const customerResponse = await customersService.getById(Number(orderDetails.customer_id));
          if (customerResponse) {
            customerDetails = customerResponse;
          }
        } catch (customerError) {
          console.warn('Não foi possível obter detalhes do cliente:', customerError);
        }
      }
      
      // Como não temos uma função getItems no serviço, usamos um array vazio para os itens
      let orderItems: Array<{id?: number; product_name?: string; product_id?: number; product_code?: string; quantity?: number; unit?: string; unit_price?: number; total?: number}> = [];
      
      // Formatar os dados para o PDF
      const pdfData: OrderPDFData = {
        id: orderDetails.id,
        date: orderDetails.date,
        dueDate: orderDetails.due_date,
        paymentMethod: orderDetails.payment_method || 'Não especificado',
        customer: {
          id: orderDetails.customer_id,
          name: orderDetails.customer_name || 'Cliente não identificado',
          document: customerDetails?.document || customerDetails?.cpf || customerDetails?.cnpj || 'Documento não informado',
          address: customerDetails?.address || 'Endereço não informado',
          phone: customerDetails?.phone || 'Telefone não informado',
          email: customerDetails?.email || 'E-mail não informado',
        },
        items: orderItems.length > 0 ? 
          orderItems.map((item: any) => ({
            codigo: item.product_code || '',
            productName: item.product_name || `Produto ${item.product_id}`,
            quantity: item.quantity || 1,
            unitPrice: item.unit_price || 0,
            total: item.total || 0,
            unidade: item.unit || 'un'
          })) : [
            {
              productName: `Pedido #${orderDetails.id}`,
              quantity: 1,
              unitPrice: orderDetails.total,
              total: orderDetails.total
            }
          ],
        // Incluindo subtotal, desconto e frete corretamente
        subtotal: orderDetails.subtotal || orderDetails.total,
        discount: orderDetails.discount || 0,
        shipping: orderDetails.shipping || 0,
        total: orderDetails.total,
        notes: orderDetails.notes
      };
      
      // Gerar e abrir o PDF
      await generateOrderPDF(pdfData);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o PDF do pedido.');
    }
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  };

  return (
    <div className="space-y-6">
<<<<<<< HEAD
      {/* Header removido; texto movido para o filtro abaixo */}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Vendas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-green-600 dark:text-green-400">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
              <div className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{ordersForStats.length} pedidos</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-yellow-600 dark:text-yellow-400">R$ {statusTotals.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
              <div className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{statusCounts.pendente} pedidos</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Enviados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-blue-600 dark:text-blue-400">R$ {statusTotals.enviado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
              <div className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{statusCounts.enviado} pedidos</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Send className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Concluídos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-green-600 dark:text-green-400">R$ {statusTotals.entregue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
              <div className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{statusCounts.entregue} pedidos</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Period selector moved next to search (no labels/text) */}

      {/* Search + Period */}
      <Card padding="sm">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar pedidos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <select
              className="shrink-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:text-white"
              value={statsRange}
              onChange={(e) => setStatsRange(e.target.value as any)}
            >
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="thisMonth">Este mês</option>
              <option value="lastMonth">Mês passado</option>
              <option value="all">Todos</option>
              <option value="custom">Personalizado</option>
            </select>
            {statsRange === 'custom' && (
              <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="date"
                  value={customStartDate || ''}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full sm:w-auto rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:text-white"
                />
                <input
                  type="date"
                  value={customEndDate || ''}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full sm:w-auto rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Orders List: Mobile cards + Desktop table */}
      <Card padding="sm">
        {/* Tabs (mobile) */}
        <div className="md:hidden border-b border-gray-200 dark:border-gray-700 -mx-3 px-3 mb-2">
          <div className="flex space-x-6 overflow-x-auto overflow-y-hidden">
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'todos'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Todos ({categorized.todos.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('pendente')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'pendente'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Pendente ({categorized.pendente.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('enviado')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'enviado'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Send className="h-4 w-4" />
              <span>Enviado ({categorized.enviado.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('entregue')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'entregue'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              <span>Entregue ({categorized.entregue.length})</span>
            </button>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3 overflow-x-hidden">
          {filteredOrders.map((order: any, idx: number) => {
            const orderId = order.order_number || order.id || order._id || 'N/A';
            const installments = getInstallmentsCount(order);
            const orderDate = getOrderDate(order);
            const created = order.createdAt || order.created_at || orderDate;
            const timeBR = formatBRDateTime(created).split(' ')[1] || '';
            const dueDate = order.dueDate || order.due_date || orderDate;
            const customerName = order.customer || order.customer_id?.name || 'Cliente não informado';
            const stableId = String(order.id || order._id || order.order_number || idx);
            const isExpanded = !!expandedMobile[stableId];
            return (
              <div
                key={`${orderId}-${idx}`}
                ref={(el) => { mobileCardRefs.current[stableId] = el; }}
                className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${highlightId === stableId ? 'ring-2 ring-blue-400/60' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setExpandedMobile((prev) => ({ ...prev, [stableId]: !prev[stableId] }))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedMobile((prev) => ({ ...prev, [stableId]: !prev[stableId] })); } }}
                aria-label={`Expandir detalhes do pedido ${order.order_number || orderId}`}
                title="Expandir detalhes"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-gray-900 dark:text-white break-words">{order.order_number ? order.order_number : truncateId(getDisplayOrderId(order))}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 break-words">{customerName}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      {(order.paymentMethod || order.payment_method || '—')}{installments ? ` (${installments}x)` : ''}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{formatBRFlexible(order.date || order.createdAt || order.created_at || orderDate)} • Hora: {timeBR} • Venc: {formatBRFlexible(dueDate)}</div>
                  </div>
                  <div className="text-right shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">R$ {(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className="mt-1"><StatusSelect value={(order.status || 'Pendente') as string} onChange={(val: string) => handleChangeStatus(order, val)} /></div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-0 pt-0">
                    {/* Bloco único: Informações + Itens (alinhados) */}
                    <div className="p-3 mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/60">
                      {/* Informações do pedido (espelha cabeçalho do PDF) - 4 colunas para alinhar com a tabela */}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Itens</div>
                      {getOrderItems(order).length > 0 ? (
                        <div className="max-h-56 overflow-y-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 dark:text-gray-400">
                                <th className="text-left py-1 pr-2">Produto</th>
                                <th className="text-center py-1">Qtd</th>
                                <th className="text-center py-1">Preço</th>
                                <th className="text-center py-1">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getOrderItems(order).map((it: any, i: number) => {
                                const displayName = it?.name || it?.product_name || it?.product?.name || it?.product_id?.name || '-';
                                const qty = it?.quantity ?? it?.qty ?? it?.qtd ?? it?.quantidade ?? 0;
                                const price = it?.unit_price ?? it?.unitPrice ?? it?.price ?? 0;
                                const total = (Number(qty) || 0) * (Number(price) || 0);
                                return (
                                  <tr key={i} className="text-gray-900 dark:text-gray-100">
                                    <td className="py-1 pr-2 break-words">{displayName}</td>
                                    <td className="py-1 text-center">{qty}</td>
                                    <td className="py-1 text-center">R$ {Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-1 text-center">R$ {Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 dark:text-gray-400">Sem itens para exibir.</div>
                      )}
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 gap-y-2 mt-3 text-sm text-right place-items-end md:divide-x md:divide-gray-700/40">
                        <div className="px-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Subtotal</div>
                          <div className="text-sm text-gray-900 dark:text-white">R$ {(order.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="px-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Desconto</div>
                          <div className="text-sm text-gray-900 dark:text-white">R$ {(order.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="px-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Frete</div>
                          <div className="text-sm text-gray-900 dark:text-white">R$ {(order.shipping || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="col-span-3 md:col-span-4 flex justify-end items-center px-2">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Total</div>
                            <div className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">R$ {(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mr-2"
                    aria-label="Gerar PDF"
                    onClick={() => generatePDF(getDisplayOrderId(order))}
                  >
                    <FileText size={16} className="mr-1" /> Gerar PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label="Excluir pedido"
                    onClick={() => setOrderToDelete(order)}
                    loading={deletingId === (order.id || order._id)}
                  >
                    <Trash2 size={16} className="mr-1" /> Excluir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto overflow-y-hidden">
          <table className="min-w-full">
            <caption className="text-left bg-white dark:bg-gray-800 mb-2">
              <div className="">
                <div className="flex space-x-8 overflow-x-auto overflow-y-hidden px-4">
                  <button
                    onClick={() => setActiveTab('todos')}
                    className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'todos'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Receipt className="h-4 w-4" />
                    <span>Todos pedidos ({categorized.todos.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('pendente')}
                    className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'pendente'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span>Pendente ({categorized.pendente.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('enviado')}
                    className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'enviado'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    <span>Enviado ({categorized.enviado.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('entregue')}
                    className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === 'entregue'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Entregue ({categorized.entregue.length})</span>
                  </button>
                </div>
              </div>
            </caption>
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pedido</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order: any, idx: number) => {
                const orderId = order.order_number || order.id || order._id || 'N/A';
                const customerName = order.customer || order.customer_id?.name || 'Cliente não informado';
                const paymentMethod = order.paymentMethod || order.payment_method || 'N/A';
                const orderDate = getOrderDate(order);
                const dueDate = order.dueDate || order.due_date || orderDate;
                const stableId = String(order.id || order._id || order.order_number || idx);
                const isExpanded = !!expandedDesktop[stableId];
                return (
                  <React.Fragment key={`${orderId}-${idx}`}>
                  <tr
                    role="button"
                    tabIndex={0}
                    ref={(el) => { desktopRowRefs.current[stableId] = el; }}
                    onClick={() => setExpandedDesktop((prev) => ({ ...prev, [stableId]: !prev[stableId] }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDesktop((prev) => ({ ...prev, [stableId]: !prev[stableId] })); } }}
                    aria-expanded={isExpanded}
                    aria-controls={`row-details-${stableId}`}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${highlightId === stableId ? 'ring-2 ring-blue-400/60' : ''}`}
                  >
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-white" title={getDisplayOrderId(order)}>
                          {order.order_number ? order.order_number : truncateId(getDisplayOrderId(order))}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{paymentMethod}{getInstallmentsCount(order) ? ` (${getInstallmentsCount(order)}x)` : ''}</div>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">{customerName}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">{formatBRFlexible(order.date || order.createdAt || order.created_at || orderDate)} • Hora: {formatBRDateTime(order.createdAt || order.created_at || orderDate).split(' ')[1] || ''}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Venc: {formatBRFlexible(dueDate)}</div>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-center">R$ {(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                      <StatusSelect value={(order.status || 'Pendente') as string} onChange={(val: string) => handleChangeStatus(order, val)} />
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        aria-label="Registrar pagamento"
                        onClick={() =>
                          navigate(`/financial?orderId=${encodeURIComponent(getDisplayOrderId(order))}&action=registerPayment`)
                        }
                      >
                        <DollarSign size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label="Gerar PDF"
                        onClick={() => generatePDF(getDisplayOrderId(order))}
                      >
                        <FileText size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        aria-label="Excluir pedido"
                        onClick={() => setOrderToDelete(order)}
                        loading={deletingId === (order.id || order._id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                  </tr>
                  {isExpanded && (
                    <tr id={`row-details-${stableId}`} className="bg-transparent">
                      <td colSpan={6} className="px-3 pt-0 pb-3 sm:px-6 sm:pt-0 sm:pb-4">
                        <div className="text-sm">
                          {/* Bloco único: Itens */}
                          <div className="p-3 rounded-b-md rounded-t-none bg-gray-100 dark:bg-gray-900/60 -mt-px">
                            {getOrderItems(order).length > 0 ? (
                              <div className="max-h-64 overflow-y-auto">
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-500 dark:text-gray-400">
                                      <th className="text-left py-1 pr-2">Produto</th>
                                      <th className="text-center py-1 pr-2">Qtd</th>
                                      <th className="text-center py-1 pr-2">Preço</th>
                                      <th className="text-center py-1">Total do Item</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {getOrderItems(order).map((it: any, i: number) => {
                                      const displayName = it?.name || it?.product_name || it?.product?.name || it?.product_id?.name || '-';
                                      const qty = it?.quantity ?? it?.qty ?? it?.qtd ?? it?.quantidade ?? 0;
                                      const price = it?.unit_price ?? it?.unitPrice ?? it?.price ?? 0;
                                      const total = (Number(qty) || 0) * (Number(price) || 0);
                                      return (
                                        <tr key={i} className="text-gray-900 dark:text-gray-100">
                                          <td className="py-1 pr-2 break-words">{displayName}</td>
                                          <td className="py-1 pr-2 text-center">{qty}</td>
                                          <td className="py-1 pr-2 text-center">R$ {Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                          <td className="py-1 text-center">R$ {Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-gray-500 dark:text-gray-400 text-xs">Sem itens</div>
                            )}
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 gap-y-2 mt-3 text-right place-items-end md:divide-x md:divide-gray-700/40">
                              <div className="px-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Subtotal</div>
                                <div className="text-sm text-gray-900 dark:text-white">R$ {(order.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                              </div>
                              <div className="px-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Desconto</div>
                                <div className="text-sm text-gray-900 dark:text-white">R$ {(order.discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                              </div>
                              <div className="px-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Frete</div>
                                <div className="text-sm text-gray-900 dark:text-white">R$ {(order.shipping || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                              </div>
                              <div className="col-span-3 md:col-span-4 flex justify-end items-center px-2">
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Total</div>
                                  <div className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">R$ {(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Form Modal */}
=======
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pedidos
        </h1>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={refreshOrderList}
          >
            Atualizar
          </Button>
          <Button 
            variant="primary"
            size="sm"
            icon={Plus} 
            onClick={() => setIsModalOpen(true)}
          >
            Novo Pedido
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative flex-grow max-w-sm">
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 sm:text-sm"
                placeholder="Buscar pedidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              icon={Filter}
            >
              Filtrar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">Carregando pedidos...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="secondary" onClick={refreshOrderList}>Tentar novamente</Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhum pedido encontrado</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              {searchTerm ? 'Tente outro termo de busca ou' : 'Cadastre seu primeiro pedido.'}
            </p>
            {searchTerm && (
              <Button 
                variant="secondary" 
                className="mb-2"
                onClick={() => setSearchTerm('')}
              >
                Limpar busca
              </Button>
            )}
            <Button 
              variant="primary" 
              icon={Plus}
              onClick={() => setIsModalOpen(true)}
            >
              Novo Pedido
            </Button>
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%]">
                    Pedido
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[20%]">
                    Cliente
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[15%]">
                    Data
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%]">
                    Itens
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[12%]">
                    Total
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[13%]">
                    Status
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[20%]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {order.id}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white truncate">
                        {order.customer_name}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(order.date).toLocaleDateString('pt-BR')}
                      </div>
                      {order.due_date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Venc: {new Date(order.due_date).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {order.items} item(s)
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="relative inline-block text-left">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className={`appearance-none inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium border-none cursor-pointer text-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${getStatusColor(order.status)}`}
                          style={{ textAlign: 'center', textAlignLast: 'center' }}
                        >
                          {statusOptions.map(status => (
                            <option 
                              key={status} 
                              value={status}
                              className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center`}
                              style={{ textAlign: 'center' }}
                            >
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Eye}
                          onClick={() => {
                            setViewOrderDetails(order);
                            setIsViewModalOpen(true);
                          }}
                          className="px-1 py-0.5 text-xs"
                        >
                          Ver
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit}
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsEditModalOpen(true);
                          }}
                          className="px-1 py-0.5 text-xs"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Trash}
                          onClick={() => forceDeleteOrder(order.id)}
                          className="px-1 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white"
                        >
                          EXCLUIR
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Order Form Modal - Novo Pedido */}
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Pedido"
<<<<<<< HEAD
        size="md"
      >
        <OrderForm onClose={() => setIsModalOpen(false)} onSave={handleOrderSave} />
      </Modal>

      {/* (Removido) Modal de detalhes do pedido: agora os detalhes abrem inline na tabela/cartões. */}

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={!!orderToDelete}
        onClose={cancelDeleteOrder}
        title="Excluir Pedido"
        size="sm"
      >
        <div className="py-2">
          <p className="text-lg text-gray-900 dark:text-white mb-4">
            Deseja realmente excluir o pedido <span className="font-bold">{getDisplayOrderId(orderToDelete)}</span>? Esta ação não poderá ser desfeita.
          </p>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="secondary" onClick={cancelDeleteOrder}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDeleteOrder} loading={deletingId === (orderToDelete?.id || orderToDelete?._id)}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Action Button */}
      <FloatingActionButton
        ariaLabel="Novo Pedido"
        onClick={() => setIsModalOpen(true)}
      />

      <PaymentModal />
=======
        size="xl"
      >
        <OrderForm 
          onClose={() => {
            setIsModalOpen(false);
            refreshOrderList();
          }} 
        />
      </Modal>
      
      {/* Order Form Modal - Editar Pedido */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Editar Pedido: ${selectedOrder?.id || ''}`}
        size="xl"
      >
        <OrderForm 
          order={selectedOrder!}
          onClose={() => {
            setIsEditModalOpen(false);
            refreshOrderList();
          }} 
        />
      </Modal>
      
      {/* Order View Modal - Visualizar Detalhes do Pedido */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Detalhes do Pedido: ${viewOrderDetails?.id || ''}`}
        size="lg"
      >
        {viewOrderDetails && (
          <div className="space-y-6">
            {/* Dados do cliente */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 border-b pb-2">Dados do Cliente</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewOrderDetails.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ID do Cliente:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewOrderDetails.customer_id}</p>
                </div>
              </div>
            </div>
            
            {/* Dados do pedido */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 border-b pb-2">Informações do Pedido</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{new Date(viewOrderDetails.date).toLocaleDateString('pt-BR')}</p>
                </div>
                {viewOrderDetails.due_date && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Vencimento:</p>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(viewOrderDetails.due_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status:</p>
                  <p className="text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewOrderDetails.status)}`}>
                      {viewOrderDetails.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Forma de Pagamento:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewOrderDetails.payment_method || 'Não especificado'}</p>
                </div>
              </div>
            </div>
            
            {/* Valores */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 border-b pb-2">Valores</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantidade de Itens:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewOrderDetails.items} item(s)</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total:</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">R$ {viewOrderDetails.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            
            {/* Observações */}
            {viewOrderDetails.notes && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 border-b pb-2">Observações</h3>
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{viewOrderDetails.notes}</p>
              </div>
            )}
            
            {/* Botões de ação */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Fechar
              </Button>
              <Button
                variant="primary"
                icon={FileText}
                onClick={() => {
                  generatePDF(viewOrderDetails);
                }}
              >
                Gerar PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b

    </div>
  );
};

<<<<<<< HEAD
export default Orders;
=======
export default Orders;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
