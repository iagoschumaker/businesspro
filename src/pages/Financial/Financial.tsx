  // Parser numérico robusto (BR e US): aceita '4.605,00', '4605.00', 4605
  const parseCurrency = (v: any): number => {
    if (v == null) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (typeof v !== 'string') return 0;
    const s = v.trim();
    if (!s) return 0;
    // Se contém vírgula, assume formato BR: milhar '.' e decimal ','
    if (s.includes(',')) {
      const cleaned = s.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.\-]/g, '');
      const n = Number(cleaned);
      return isNaN(n) ? 0 : n;
    }
    // Caso geral: remove não numéricos exceto ponto/menos
    const cleaned = s.replace(/[^0-9.\-]/g, '');
    const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
};
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, DollarSign, CheckCircle, Clock, AlertTriangle, Receipt, ChevronDown, FileText } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import { toast } from 'react-hot-toast';
import { formatBRFlexible, formatBRDateTime } from '../../utils/date';
import { useAuth } from '../../contexts/AuthContext';
import { generateFinancialPDF } from '../../utils/pdfGeneratorFinancial';

// Data/hora atual em ISO com fuso local (ex: 2025-08-09T00:12:34-03:00)
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
  const sign = offsetMin > 0 ? '-' : '+'; // getTimezoneOffset: minutes behind UTC; for -03:00 returns 180
  const abs = Math.abs(offsetMin);
  const offH = pad(Math.floor(abs / 60));
  const offM = pad(abs % 60);
  return `${y}-${M}-${day}T${h}:${m}:${s}${sign}${offH}:${offM}`;
};

type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'partial';

interface Installment {
  number: number;
  amount: number;
  due_date: string; // YYYY-MM-DD
  status: InstallmentStatus;
  paid_amount?: number;
  payment_date?: string; // ISO datetime do último pagamento
  payments?: { amount: number; date: string }[]; // histórico de pagamentos
}

interface FinancialOrder {
  _id?: string;
  id?: string;
  order_number?: string;
  customer?: { _id?: string; id?: string; name?: string } | string;
  total: number;
  payment_method: string;
  installments?: number;
  installment_interval?: number;
  installment_details?: Installment[];
  status?: string;
  created_at?: string;
  createdAt?: string;
  paid_amount?: number;
  remaining_amount?: number;
}

const getOrderId = (o: FinancialOrder) => (o._id || o.id || '');
const getOrderNumber = (o: FinancialOrder) => (o.order_number || '#—');
// Alinha com Orders: obtém Date a partir de createdAt/created_at/date
const getOrderDate = (o: any) => new Date(o?.createdAt || o?.created_at || o?.date || Date.now());

// helper de próximo vencimento será definido dentro do componente (após normalizeInstallments)

const Financial: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [orders, setOrders] = useState<FinancialOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'pendentes' | 'atrasadas' | 'pagas'>('pendentes');
  const [statsRange, setStatsRange] = useState<'today' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'custom' | 'all'>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<FinancialOrder | null>(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState<number[]>([]);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggleOpen = (id: string) => setOpenMap((s) => ({ ...s, [id]: !s[id] }));

  // Seleciona pedido e parcela a partir dos parâmetros da URL
  // Ex.: /financial?orderId=12345&inst=2
  useEffect(() => {
    const oidRaw = (searchParams.get('orderId') || '').toString().trim();
    if (!oidRaw) return;
    const instRaw = (searchParams.get('inst') || '').toString().trim();

    // Normalizadores para comparar ids/números (#12345 vs 12345, etc.)
    const norm = (s: string) => s.toString().trim().toLowerCase();
    const stripHash = (s: string) => s.replace(/^#/, '');
    const digitsOnly = (s: string) => (s.match(/\d+/g)?.join('') || s);
    const stripLeadingZeros = (s: string) => s.replace(/^0+/, '') || '0';
    const variants = (s: string) => {
      const base = norm(s);
      const noHash = norm(stripHash(s));
      const onlyDigits = norm(digitsOnly(s));
      const noLeadZeros = norm(stripLeadingZeros(onlyDigits));
      return new Set([base, noHash, onlyDigits, noLeadZeros]);
    };

    const wanted = variants(oidRaw);

    // Tenta localizar por _id, id ou order_number com normalização
    let found = orders.find((o) => {
      const cand = [o._id, o.id, o.order_number]
        .map((v) => (v == null ? '' : String(v)))
        .filter(Boolean);
      for (const c of cand) {
        const v = variants(c);
        for (const w of wanted) {
          if (v.has(w)) return true;
        }
      }
      return false;
    });
    // Fallback extra: tenta por sufixo numérico do order_number (ex.: PED-2025-00001 vs 00001)
    if (!found) {
      const numericTarget = stripLeadingZeros(digitsOnly(oidRaw));
      if (numericTarget) {
        found = orders.find((o) => {
          const num = String(o.order_number || '');
          const numDigits = stripLeadingZeros(digitsOnly(num));
          return numDigits.endsWith(numericTarget);
        });
      }
    }
    // Fallback: se não encontrado, tenta buscar via API e inserir/selecionar
    if (!found) {
      (async () => {
        try {
          const mod = await import('../../services/api');
          const tryIds: string[] = Array.from(wanted);
          // tenta primeiro como está, depois apenas dígitos (e sem zeros à esquerda)
          const digits = digitsOnly(oidRaw);
          const noLead = stripLeadingZeros(digits);
          if (!tryIds.includes(digits)) tryIds.push(digits);
          if (!tryIds.includes(noLead)) tryIds.push(noLead);
          // Defensivo: validadores locais para IDs reais
          const isLikelyObjectIdLocal = (s: string) => /^[0-9a-fA-F]{24}$/.test(s);
          const isLikelyUUIDLocal = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
          for (const candidate of tryIds) {
            if (!candidate) continue;
            // Evita chamadas que geram 500: só consulta API quando parece um ID real (ObjectId/UUID)
            if (!(isLikelyObjectIdLocal(candidate) || isLikelyUUIDLocal(candidate))) continue;
            const data = await mod.ordersService.getById(candidate).catch(() => null);
            if (data) {
              setOrders((prev) => {
                const exists = prev.some((o) => variants(o._id || o.id || o.order_number || '').has(candidate));
                return exists ? prev : [data, ...prev];
              });
              found = data as any;
              break;
            }
          }
        } catch {
          // silencioso
        }
        if (!found) return;
        // Seleciona e expande após inserção
        setSelectedOrder(found);
        const oid = getOrderId(found);
        const keys = new Set<string>();
        if (oid) keys.add(String(oid));
        if ((found as any)._id) keys.add(String((found as any)._id));
        if ( (found as any).id) keys.add(String((found as any).id));
        if ((found as any).order_number) {
          const on = String((found as any).order_number);
          keys.add(on);
          const d = digitsOnly(on);
          keys.add(d);
          keys.add(stripLeadingZeros(d));
        }
        if (keys.size) setOpenMap((s) => ({ ...s, ...Object.fromEntries(Array.from(keys).map((k) => [k, true])) }));
        // Garante visibilidade: limpa filtros e escolhe a aba adequada
        try {
          setSearchTerm('');
          setPaymentFilter('');
          const insts = (found.installment_details || []) as any[];
          const now = new Date();
          const hasOverdue = insts.some((i) => {
            const unpaid = (Number(i.amount || 0) - Number(i.paid_amount || 0)) > 0;
            const due = i?.due_date ? new Date(i.due_date) : null;
            return unpaid && due && due < now;
          });
          const allPaid = insts.length > 0
            ? insts.every((i) => Number(i.paid_amount || 0) >= Number(i.amount || 0))
            : Number((found as any).remaining_amount || 0) === 0;
          const tab: 'pendentes' | 'atrasadas' | 'pagas' = hasOverdue ? 'atrasadas' : (allPaid ? 'pagas' : 'pendentes');
          setActiveTab(tab);
        } catch {}
        const instNum = Number(instRaw);
        if (!Number.isNaN(instNum) && instNum > 0) {
          setSelectedInstallments([instNum]);
          setTimeout(() => {
            try {
              const selectorA = `[data-order-id="${oid}"][data-inst="${instNum}"]`;
              const selectorB = `#order-${oid}-inst-${instNum}`;
              const el = document.querySelector(selectorA) || document.querySelector(selectorB);
              if (el && 'scrollIntoView' in el) {
                (el as any).scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            } catch {}
          }, 250);
        }
      })();
      return; // aguarda fallback async
    }

    // Seleciona e expande o pedido
    setSelectedOrder(found);
    const oid = getOrderId(found);
    const keys = new Set<string>();
    if (oid) keys.add(String(oid));
    if ((found as any)._id) keys.add(String((found as any)._id));
    if ((found as any).id) keys.add(String((found as any).id));
    if ((found as any).order_number) {
      const on = String((found as any).order_number);
      keys.add(on);
      const d = digitsOnly(on);
      keys.add(d);
      keys.add(stripLeadingZeros(d));
    }
    if (keys.size) setOpenMap((s) => ({ ...s, ...Object.fromEntries(Array.from(keys).map((k) => [k, true])) }));
    // Garante visibilidade: limpa filtros e escolhe a aba adequada
    try {
      setSearchTerm('');
      setPaymentFilter('');
      // Heurística de aba: atrasadas > pendentes > pagas
      const insts = (found.installment_details || []) as any[];
      const now = new Date();
      const hasOverdue = insts.some((i) => {
        const unpaid = (Number(i.amount || 0) - Number(i.paid_amount || 0)) > 0;
        const due = i?.due_date ? new Date(i.due_date) : null;
        return unpaid && due && due < now;
      });
      const allPaid = insts.length > 0
        ? insts.every((i) => Number(i.paid_amount || 0) >= Number(i.amount || 0))
        : Number(found.remaining_amount || 0) === 0;
      const tab: 'pendentes' | 'atrasadas' | 'pagas' = hasOverdue ? 'atrasadas' : (allPaid ? 'pagas' : 'pendentes');
      setActiveTab(tab);
    } catch {}

    // Seleciona a parcela, se fornecida
    const instNum = Number(instRaw);
    if (!Number.isNaN(instNum) && instNum > 0) {
      setSelectedInstallments([instNum]);
      // Tenta rolar até o elemento da parcela (best-effort, não quebra se não existir)
      setTimeout(() => {
        try {
          const selectorA = `[data-order-id="${oid}"][data-inst="${instNum}"]`;
          const selectorB = `#order-${oid}-inst-${instNum}`;
          const el = document.querySelector(selectorA) || document.querySelector(selectorB);
          if (el && 'scrollIntoView' in el) {
            (el as any).scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch {
          // silencioso
        }
      }, 250);
    }
  }, [searchParams, orders]);

  // Permissões
  const hasPermission = (required: string) => {
    if (!user) return false;
    if (['Administrador', 'SuperAdmin'].includes((user as any).role)) return true;
    const perms = Array.isArray((user as any).permissions) ? (user as any).permissions : [];
    const [mod, action] = String(required).split(':');
    if (action) {
      return perms.includes(required) || perms.includes(mod);
    }
    return perms.includes(mod) || perms.some((p: string) => p.startsWith(`${mod}:`));
  };
  const canRegisterPayment = hasPermission('Financeiro:RegistrarPagamento');
  const canRefundPayment = hasPermission('Financeiro:EstornarPagamento');

  // PDF helpers: filtrar parcelas para o PDF (abertas, atrasadas ou todas)
  type PdfFilterMode = 'all' | 'open' | 'overdue';
  const buildPDFOrder = (o: FinancialOrder, mode: PdfFilterMode): FinancialOrder => {
    const insts = normalizeInstallments(o);
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const hasRemaining = (i: Installment) => Number(i.amount || 0) - Number(i.paid_amount || 0) > 0;
    const isOverdue = (i: Installment) => hasRemaining(i) && i.due_date ? new Date(i.due_date) < todayOnly : false;
    const filtered = insts.filter((i) => {
      if (mode === 'all') return true;
      if (mode === 'open') return hasRemaining(i);
      return isOverdue(i);
    });
    const total = filtered.reduce((s, i) => s + Number(i.amount || 0), 0);
    const paid = filtered.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    const remaining = Math.max(0, total - paid);
    return {
      ...o,
      installment_details: filtered,
      total,
      paid_amount: paid,
      remaining_amount: remaining,
    } as FinancialOrder;
  };
  const handleGeneratePDF = (o: FinancialOrder, mode: PdfFilterMode) => {
    const data = buildPDFOrder(o, mode);
    generateFinancialPDF(data as any);
  };

  // Garante uma única parcela quando o pedido não possui installment_details (ex.: PIX, 1x, Dinheiro)
  const ensureSingleInstallment = async (order: FinancialOrder): Promise<Installment> => {
    const existing = (order.installment_details || []);
    if (existing.length > 0) return existing[0];

    // Helper: formata Date -> 'YYYY-MM-DD' (local)
    const ymdLocal = (d: Date): string => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    // Helper: parse 'YYYY-MM-DD' como data local (sem UTC shift)
    const parseYMDLocal = (s: string): Date => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    };

    // Resolve a due_date do pedido, priorizando o campo enviado pelo OrderForm
    const fromOrderDue = (() => {
      const raw = (order as any).due_date || (order as any).dueDate || '';
      if (!raw) return '';
      return typeof raw === 'string' && raw.includes('T') ? raw.slice(0, 10) : String(raw);
    })();

    const amount = order.total || 0;
    const paid = order.paid_amount || 0;
    const remaining = Math.max(0, amount - paid);

    // Se existir due_date no pedido, usa-o; senão, usa a data do pedido
    const dueStr = fromOrderDue || ymdLocal(getOrderDate(order));
    const dueLocal = parseYMDLocal(dueStr);
    const todayLocal = new Date();
    const todayOnly = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());

    const status: InstallmentStatus = remaining === 0
      ? 'paid'
      : (dueLocal < todayOnly ? 'overdue' : 'pending');

    const inst: Installment = {
      number: 1,
      amount,
      due_date: dueStr, // manter 'YYYY-MM-DD' para evitar timezone issues
      status,
      paid_amount: paid,
      payments: [],
      payment_date: paid > 0 ? isoNow() : undefined,
    };
    await updateOrderWithInstallments(order, [inst]);
    return inst;
  };

  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});

  // Modais elegantes para Ajuste/Estorno
  const [adjustModal, setAdjustModal] = useState<{
    open: boolean;
    order: FinancialOrder | null;
    inst: Installment | null;
    valueText: string;
  }>({ open: false, order: null, inst: null, valueText: '' });

  const [refundModal, setRefundModal] = useState<{
    open: boolean;
    order: FinancialOrder | null;
    inst: Installment | null;
    selectedIndex: number | null;
  }>({ open: false, order: null, inst: null, selectedIndex: null });

  // Resolve nome do cliente usando cache
  const resolveCustomerName = (o: FinancialOrder) => {
    const c: any = o.customer;
    if (!c) return '—';
    if (typeof c === 'string') return customerNames[c] || c;
    return c.name || customerNames[c._id || c.id || ''] || '—';
  };

  // Ações rápidas por parcela (escopo do componente)

  const updateOrderWithInstallments = async (order: FinancialOrder, updatedInstallments: Installment[]) => {
    const newPaidTotal = updatedInstallments.reduce((s, i) => s + (i.paid_amount || 0), 0);
    const newRemaining = Math.max(0, (order.total || 0) - newPaidTotal);
    const isNowFullyPaid = newRemaining === 0;
    const wasPaid = String(order.status || '').toLowerCase() === 'pago' || String(order.status || '').toLowerCase() === 'paid';
    // Define status localmente: 'pago' quando quitar tudo; caso contrário, se antes estava 'pago', volta para 'entregue'
    const updatedOrder: FinancialOrder = {
      ...order,
      paid_amount: newPaidTotal,
      remaining_amount: newRemaining,
      installment_details: updatedInstallments,
      status: isNowFullyPaid ? 'pago' : (wasPaid ? 'entregue' : order.status),
    };
    setOrders((prev: FinancialOrder[]) => prev.map((o: FinancialOrder) => (getOrderId(o) === getOrderId(updatedOrder) ? updatedOrder : o)));
    if (selectedOrder && getOrderId(selectedOrder) === getOrderId(updatedOrder)) setSelectedOrder(updatedOrder);

    try {
      const mod = await import('../../services/api');
      const idRaw = getOrderId(updatedOrder) as any;
      if (idRaw) {
        await (mod.ordersService as any).update(Number(idRaw) || idRaw, {
          paid_amount: newPaidTotal,
          remaining_amount: newRemaining,
          installment_details: updatedInstallments,
        });
        // Após persistir os valores, sincroniza status no backend conforme necessário
        if (isNowFullyPaid && !wasPaid && (mod as any)?.ordersService?.updateStatus) {
          try {
            await (mod.ordersService as any).updateStatus(Number(idRaw) || idRaw, 'pago');
          } catch (e) {
            console.warn('[Financeiro] Falha ao atualizar status para pago; status local mantido.', e);
          }
        } else if (!isNowFullyPaid && wasPaid && (mod as any)?.ordersService?.updateStatus) {
          try {
            await (mod.ordersService as any).updateStatus(Number(idRaw) || idRaw, 'entregue');
          } catch (e) {
            console.warn('[Financeiro] Falha ao atualizar status para entregue; status local mantido.', e);
          }
        }
      }
      toast.success('Atualização salva com sucesso!');
      // Notifica outras telas (ex.: Relatórios) para recarregar pedidos
      try {
        const evt = new CustomEvent('financial:orders-updated', { detail: { orderId: getOrderId(updatedOrder) } });
        window.dispatchEvent(evt);
      } catch {}
    } catch (e: any) {
      console.error('Erro ao atualizar parcelas:', e);
      const status = e?.response?.status;
      if (status === 404 || status === 400) {
        console.warn(`[Financeiro] Update retornou ${status}. Mantendo atualização local.`);
        toast.success('Atualizado localmente (sincronização pendente)');
        // Mesmo em atualização local, notifica para manter telas sincronizadas
        try {
          const evt = new CustomEvent('financial:orders-updated', { detail: { orderId: getOrderId(updatedOrder) } });
          window.dispatchEvent(evt);
        } catch {}
      } else {
        toast.error('Não foi possível salvar no servidor');
      }
    }
  };

  const handlePayRemaining = async (order: FinancialOrder, inst: Installment) => {
    if (!canRegisterPayment) {
      toast.error('Você não tem permissão para registrar pagamentos.');
      return;
    }
    const installments = (order.installment_details || []).map((i) => ({ ...i }));
    const idx = installments.findIndex((i) => i.number === inst.number);
    if (idx < 0) return;
    const remaining = Math.max(0, (installments[idx].amount || 0) - (installments[idx].paid_amount || 0));
    if (remaining <= 0) return;
    installments[idx].paid_amount = (installments[idx].paid_amount || 0) + remaining;
    const now = isoNow();
    installments[idx].payments = [...(installments[idx].payments || []), { amount: remaining, date: now }];
    installments[idx].status = 'paid';
    installments[idx].payment_date = now;
    await updateOrderWithInstallments(order, installments);
  };

  const openAdjustModal = (order: FinancialOrder, inst: Installment) => {
    if (!canRegisterPayment) {
      toast.error('Você não tem permissão para registrar pagamentos.');
      return;
    }
    setAdjustModal({
      open: true,
      order,
      inst,
      valueText: '',
    });
  };

  const submitAdjustModal = async () => {
    if (!canRegisterPayment) {
      toast.error('Você não tem permissão para registrar pagamentos.');
      return;
    }
    const { order, inst, valueText } = adjustModal;
    if (!order || !inst) return;
    const val = parseCurrency(valueText);
    if (val <= 0) {
      toast.error('Informe um valor maior que zero.');
      return;
    }
    const installments = (order.installment_details || []).map((i) => ({ ...i }));
    const idx = installments.findIndex((i) => i.number === inst.number);
    if (idx < 0) return;
    const currentPaid = installments[idx].paid_amount || 0;
    const amt = installments[idx].amount || 0;
    const newPaid = Math.min(currentPaid + val, amt);
    installments[idx].paid_amount = newPaid;
    // registra pagamento individual no histórico
    const now = isoNow();
    installments[idx].payments = [...(installments[idx].payments || []), { amount: Math.min(val, amt - currentPaid), date: now }];
    if (newPaid >= amt) {
      installments[idx].status = 'paid';
      installments[idx].payment_date = now;
    } else {
      // Tratar pagamento parcial como pendente (mantemos payment_date com horário do último pagamento)
      installments[idx].status = 'pending';
      installments[idx].payment_date = now;
    }
    await updateOrderWithInstallments(order, installments);
    setAdjustModal({ open: false, order: null, inst: null, valueText: '' });
  };

  const openRefundModal = (order: FinancialOrder, inst: Installment) => {
    if (!canRefundPayment) {
      toast.error('Você não tem permissão para estornar pagamentos.');
      return;
    }
    const count = inst.payments?.length || 0;
    // Seleciona por padrão o último pagamento (mais recente), se existir
    setRefundModal({ open: true, order, inst, selectedIndex: count > 0 ? count - 1 : null });
  };

  const submitRefundModal = async () => {
    if (!canRefundPayment) {
      toast.error('Você não tem permissão para estornar pagamentos.');
      return;
    }
    const { order, inst, selectedIndex } = refundModal;
    if (!order || !inst) return;
    const installments = (order.installment_details || []).map((i) => ({ ...i }));
    const idx = installments.findIndex((i) => i.number === inst.number);
    if (idx < 0) return;

    const current = installments[idx];
    const payments = [...(current.payments || [])];

    if (payments.length > 0 && selectedIndex !== null && payments[selectedIndex]) {
      // Estorna apenas o pagamento selecionado
      payments.splice(selectedIndex, 1);
      current.payments = payments;
      const newPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
      current.paid_amount = newPaid;
      const amt = current.amount || 0;
      if (newPaid >= amt) {
        current.status = 'paid';
        current.payment_date = payments.length ? payments[payments.length - 1].date : undefined;
      } else if (newPaid > 0) {
        current.status = 'pending';
        current.payment_date = payments.length ? payments[payments.length - 1].date : undefined;
      } else {
        const due = current.due_date ? new Date(current.due_date) : null;
        current.status = due && due < new Date() ? 'overdue' : 'pending';
        delete (current as any).payment_date;
      }
    } else {
      // Sem histórico, estorna tudo (comportamento anterior)
      current.paid_amount = 0;
      current.payments = [];
      const due = current.due_date ? new Date(current.due_date) : null;
      current.status = due && due < new Date() ? 'overdue' : 'pending';
      delete (current as any).payment_date;
    }

    await updateOrderWithInstallments(order, installments);
    setRefundModal({ open: false, order: null, inst: null, selectedIndex: null });
  };

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

  // Normaliza parcelas do pedido independentemente do formato vindo da API
  const normalizeInstallments = (o: any): Installment[] => {
    const list =
      o?.installment_details ||
      o?.parcelas ||
      o?.installments_details ||
      o?.details?.installments ||
      [];
    if (!Array.isArray(list)) return [];
    return list.map((p: any, idx: number) => {
      const number = p?.number ?? p?.parcela ?? p?.n ?? idx + 1;
      const amount = parseCurrency(p?.amount ?? p?.valor ?? 0) || 0;
      const due_date = p?.due_date || p?.vencimento || p?.dueDate || '';
      const paid_amount = parseCurrency(p?.paid_amount ?? p?.valor_pago ?? 0) || 0;
      let status: InstallmentStatus = (p?.status as InstallmentStatus) || 'pending';
      // Recalcula status com base em valores e vencimento
      if (paid_amount >= amount && amount > 0) status = 'paid';
      else if (paid_amount > 0 && paid_amount < amount) status = 'partial';
      else {
        const due = due_date ? new Date(due_date) : null;
        if (due && due < new Date()) status = 'overdue';
      }
      // Normaliza histórico de pagamentos (se existir)
      const payments = Array.isArray(p?.payments)
        ? (p.payments as any[])
            .map((it: any) => ({
              amount: parseCurrency(it?.amount ?? it?.valor ?? 0) || 0,
              date: it?.date || it?.data || it?.paid_at || it?.payment_date || '',
            }))
            .filter((it) => it.amount > 0 && !!it.date)
        : undefined;
      // Define payment_date preferindo o último registro do histórico
      const lastPaymentDate = payments && payments.length ? payments[payments.length - 1].date : undefined;
      const payment_date = lastPaymentDate || p?.payment_date || p?.data_pagamento || p?.paid_at || undefined;
      return {
        number,
        amount,
        due_date,
        status,
        paid_amount,
        payment_date,
        payments,
      } as Installment;
    });
  };

  // Próximo vencimento não quitado (YYYY-MM-DD) ou null se tudo pago
  const getNextDueDateStr = (o: FinancialOrder): string | null => {
    try {
      const insts = normalizeInstallments(o);
      if (!insts || insts.length === 0) {
        const raw = (o as any).due_date || (o as any).dueDate || '';
        return raw ? (typeof raw === 'string' && raw.includes('T') ? raw.slice(0, 10) : String(raw)) : null;
      }
      const pending = insts
        .filter((i: Installment) => (Number(i?.amount || 0) - Number(i?.paid_amount || 0)) > 0)
        .sort((a: Installment, b: Installment) => String(a.due_date).localeCompare(String(b.due_date)));
      if (pending.length > 0) return String(pending[0].due_date || '');
      return null; // tudo pago
    } catch {
      return null;
    }
  };

  // Carrega pedidos reais da API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('../../services/api');
        const data = await mod.ordersService.getAll();
        if (!mounted) return;
        const normalized: FinancialOrder[] = (data || []).map((o: any) => {
          const total = parseCurrency(o?.total ?? o?.valor_total ?? o?.grandTotal ?? 0) || 0;
          let installments = normalizeInstallments(o);
          const declaredCount = Math.max(
            Number(o?.installments || 0) || 0,
            Number(o?.parcelas || 0) || 0,
            installments?.length || 0
          );
          // Se os valores das parcelas não batem com o total (ou somam 0), recalcula parcelas por rateio
          if (declaredCount > 0) {
            const sum = installments.reduce((acc, p) => acc + (parseCurrency(p.amount) || 0), 0);
            const mismatch = total > 0 ? Math.abs(sum - total) / total : 0;
            if (sum === 0 || mismatch > 0.05 || installments.length !== declaredCount) {
              const baseDateStr = o?.first_due_date || o?.firstDueDate || o?.created_at || o?.createdAt || o?.date || new Date().toISOString();
              const baseDate = new Date(baseDateStr);
              const interval = Number(o?.installment_interval || o?.intervalo_parcelas || 1) || 1; // meses por padrão
              const amounts: number[] = Array.from({ length: declaredCount }, () => 0);
              // rateio com correção de arredondamento
              const per = Math.floor((total / declaredCount) * 100) / 100;
              let remainder = Math.round((total - per * declaredCount) * 100) / 100;
              for (let i = 0; i < declaredCount; i++) {
                amounts[i] = per;
              }
              // distribui centavos restantes no final
              if (remainder !== 0) amounts[declaredCount - 1] = Math.round((amounts[declaredCount - 1] + remainder) * 100) / 100;
              const rebuilt: Installment[] = Array.from({ length: declaredCount }, (_, idx) => {
                const existing = installments[idx];
                // calcula vencimento: preserva se existir, senão adiciona meses
                let due = existing?.due_date;
                if (!due) {
                  const d = new Date(baseDate);
                  d.setMonth(d.getMonth() + idx * (interval || 1));
                  due = d.toISOString().slice(0, 10);
                }
                return {
                  number: existing?.number ?? idx + 1,
                  amount: amounts[idx],
                  due_date: due,
                  status: existing?.status || 'pending',
                  paid_amount: existing?.paid_amount || 0,
                  payment_date: existing?.payment_date,
                } as Installment;
              });
              installments = rebuilt;
            }
          }
          const paid_amount_from_installments = installments.reduce((sum, p) => sum + (parseCurrency(p.paid_amount) || 0), 0);
          const paid_amount = parseCurrency(o?.paid_amount ?? o?.valor_pago ?? paid_amount_from_installments) || 0;
          const remaining_amount = Math.max(0, total - paid_amount);
          const customerName =
            o?.customer?.name ||
            o?.cliente?.name ||
            o?.cliente?.nome ||
            o?.customer_name ||
            o?.customerName ||
            o?.nome_cliente ||
            o?.nomeCliente ||
            undefined;
          // Preferir "customer_id" quando não houver nome
          const customerIdField = o?.customer_id || o?.cliente_id || o?.customerId || o?.clienteId;
          const customerNormalized = customerName
            ? customerName
            : (customerIdField || o?.customer || o?.cliente || undefined);
          return {
            _id: o?._id,
            id: o?.id,
            order_number: o?.order_number || o?.numero || o?.id,
            customer: customerNormalized,
            total,
            payment_method: o?.payment_method || o?.forma_pagamento || '—',
            installments: o?.installments || o?.parcelas || installments?.length || undefined,
            installment_interval: o?.installment_interval || o?.intervalo_parcelas,
            installment_details: installments,
            status: o?.status,
            created_at: o?.created_at || o?.createdAt || o?.date,
            paid_amount,
            remaining_amount,
          } as FinancialOrder;
        });
        setOrders(normalized);
      } catch (e) {
        console.error('Erro ao carregar Financeiro:', e);
        toast.error('Erro ao carregar dados financeiros');
      } finally {
        // no-op
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Ao carregar pedidos, verificar se há orderId/action na URL e apenas selecionar o pedido (sem abrir modal automaticamente)
  useEffect(() => {
    const oid = (searchParams.get('orderId') || '').trim();
    if (!oid || orders.length === 0) return;
    const matches = (o: FinancialOrder) => {
      const id = (o._id || o.id || '').toString();
      const num = (o.order_number || '').toString();
      return id === oid || num === oid;
    };
    const order = orders.find(matches);
    if (!order) return;
    setSelectedOrder(order);
    // Expande o bloco do pedido selecionado
    const key = (order._id || order.id || order.order_number || '').toString();
    if (key) setOpenMap((s) => ({ ...s, [key]: true }));
  }, [orders, searchParams]);

  // Busca nomes de clientes por ID quando faltarem
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ids: string[] = [];
        const isLikelyObjectId = (s: string) => /^[0-9a-fA-F]{24}$/.test(s);
        const isLikelyUUID = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
        orders.forEach((o) => {
          const c: any = o.customer;
          let id = '';
          let hasName = false;
          if (typeof c === 'string') {
            // Se a string se parece com ID (ObjectId/UUID), tratar como ID; caso contrário, é o nome em si
            if (isLikelyObjectId(c) || isLikelyUUID(c) || c.length >= 20) {
              id = c;
              hasName = false;
            } else {
              hasName = true;
            }
          } else if (c && typeof c === 'object') {
            id = c._id || c.id || '';
            hasName = !!c.name;
          } else {
            // Se não houver customer, tentar campos soltos de ID
            id = (o as any).customer_id || (o as any).cliente_id || '';
          }
          if (id && !hasName && !customerNames[id]) ids.push(id);
        });
        const unique = Array.from(new Set(ids));
        if (unique.length === 0) return;
        const mod = await import('../../services/api');
        const svc: any = (mod as any).customersService;
        const results = await Promise.all(unique.map(async (id) => {
          try {
            const data = await svc.getById(id);
            const name = data?.name || data?.fullName || data?.razao_social || data?.fantasia || data?.company_name || '';
            return { id, name };
          } catch {
            return { id, name: '' };
          }
        }));
        if (!mounted) return;
        setCustomerNames((prev) => {
          const next = { ...prev } as Record<string, string>;
          results.forEach(({ id, name }) => { if (name) next[id] = name; });
          return next;
        });
      } catch (e) {
        console.warn('Falha ao buscar nomes de clientes', e);
      }
    })();
    return () => { mounted = false; };
  }, [orders, customerNames]);

  // Categoriza pedidos para abas
  const categorized = useMemo(() => {
    const groups = {
      todas: orders,
      pendentes: [] as FinancialOrder[],
      atrasadas: [] as FinancialOrder[],
      pagas: [] as FinancialOrder[],
    };
    orders.forEach((o) => {
      const paid = o.paid_amount || 0;
      const isPaid = paid >= (o.total || 0);
      const isPartial = paid > 0 && paid < (o.total || 0);
      const hasOverdue = o.installment_details?.some((i) => i.status !== 'paid' && new Date(i.due_date) < new Date());
      const isPending = (paid === 0 || isPartial) && !hasOverdue;
      if (isPaid) groups.pagas.push(o);
      else if (hasOverdue) groups.atrasadas.push(o);
      else if (isPending) groups.pendentes.push(o);
    });
    return groups;
  }, [orders]);

  // Abre modal de pagamento para o pedido selecionado
  // Removed unused openPaymentModal to avoid unused variable warning

  // Base de dados GLOBAL para estatísticas (aplicando filtro de período)
  const statsBase = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cutoff7d = new Date(now);
    cutoff7d.setDate(now.getDate() - 7);
    const cutoff30d = new Date(now);
    cutoff30d.setDate(now.getDate() - 30);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return orders.filter((o) => {
      const matchesPayment = !paymentFilter || o.payment_method === paymentFilter;
      if (!matchesPayment) return false;
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
  }, [orders, statsRange, customStartDate, customEndDate, paymentFilter]);

  const stats = useMemo(() => {
    return statsBase.reduce(
      (acc, o) => {
        const paid = o.paid_amount || 0;
        const remaining = Math.max(0, (o.total || 0) - paid);
        // Total a Receber deve refletir apenas o que falta receber
        acc.totalReceivable += remaining;
        acc.totalReceived += paid;
        if (o.installment_details?.length) {
          for (const inst of o.installment_details) {
            const due = new Date(inst.due_date);
            const today = new Date();
            const instRemaining = Math.max(0, inst.amount - (inst.paid_amount || 0));
            if (inst.status !== 'paid' && due < today) acc.totalOverdue += instRemaining;
            if (inst.status === 'pending' || inst.status === 'partial') acc.totalPending += instRemaining;
          }
        } else {
          acc.totalPending += remaining;
        }
        return acc;
      },
      { totalReceivable: 0, totalReceived: 0, totalOverdue: 0, totalPending: 0 }
    );
  }, [statsBase]);

  // Contagem de pedidos por status (baseado no mesmo conjunto usado para os valores)
  const statusCounts = useMemo(() => {
    return statsBase.reduce(
      (acc, o) => {
        const paid = o.paid_amount || 0;
        const isPaid = paid >= (o.total || 0);
        const isPartial = paid > 0 && paid < (o.total || 0);
        const hasOverdue = o.installment_details?.some(
          (i) => i.status !== 'paid' && new Date(i.due_date) < new Date()
        );
        const isPending = (paid === 0 || isPartial) && !hasOverdue;
        if (isPaid) acc.pagas += 1;
        else if (hasOverdue) acc.atrasadas += 1;
        else if (isPending) acc.pendentes += 1;
        return acc;
      },
      { pendentes: 0, atrasadas: 0, pagas: 0 }
    );
  }, [statsBase]);

  const filtered = useMemo(() => {
    const base = categorized[activeTab];
    const s = searchTerm.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cutoff7d = new Date(now);
    cutoff7d.setDate(now.getDate() - 7);
    const cutoff30d = new Date(now);
    cutoff30d.setDate(now.getDate() - 30);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const list = base
      .filter((o) => {
        const matchesSearch = !s || getOrderNumber(o).toLowerCase().includes(s) || resolveCustomerName(o).toLowerCase().includes(s);
        const matchesPayment = !paymentFilter || o.payment_method === paymentFilter;
        return matchesSearch && matchesPayment;
      })
      .filter((o) => {
        // Aplica o mesmo filtro de período do Orders
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
    // Ordena por próximo vencimento (asc). 'Quitado' (sem próximo vencimento) vai para o final
    return list.sort((a, b) => {
      const da = getNextDueDateStr(a);
      const db = getNextDueDateStr(b);
      if (!da && !db) return 0;
      if (!da) return 1; // a sem vencimento -> depois
      if (!db) return -1; // b sem vencimento -> depois
      return String(da).localeCompare(String(db));
    });
  }, [orders, categorized, activeTab, searchTerm, paymentFilter, statsRange, customStartDate, customEndDate]);

  // Registrar pagamento somando automaticamente o saldo das parcelas selecionadas
  const onRegisterPayment = async () => {
    if (!canRegisterPayment) {
      toast.error('Você não tem permissão para registrar pagamentos.');
      return;
    }
    if (!selectedOrder) return;
    const installments = selectedOrder.installment_details || [];
    const hasInstallments = Array.isArray(installments) && installments.length > 0;
    const selected = hasInstallments ? installments.filter((inst) => selectedInstallments.includes(inst.number)) : [];
    if (hasInstallments && selected.length === 0) {
      toast.error('Selecione pelo menos uma parcela');
      return;
    }
    const value = hasInstallments
      ? selected.reduce((sum, inst) => sum + Math.max(0, (inst.amount || 0) - (inst.paid_amount || 0)), 0)
      : Math.max(0, (selectedOrder.total || 0) - (selectedOrder.paid_amount || 0));
    if (value <= 0) {
      toast.error('Não há valor pendente para pagamento');
      return;
    }

    let remainingToApply = value;
    const updatedInstallments = hasInstallments
      ? installments.map((inst) => {
          if (!selectedInstallments.includes(inst.number) || remainingToApply <= 0) return inst;
          const toPay = Math.min(inst.amount - (inst.paid_amount || 0), remainingToApply);
          const newPaid = (inst.paid_amount || 0) + toPay;
          remainingToApply -= toPay;
          const status: InstallmentStatus = newPaid >= inst.amount ? 'paid' : newPaid > 0 ? 'partial' : inst.status;
          return { ...inst, paid_amount: newPaid, status };
        })
      : installments;

    const newPaidTotal = (selectedOrder.paid_amount || 0) + Math.min(value, (selectedOrder.remaining_amount || 0));
    const newRemaining = Math.max(0, (selectedOrder.total || 0) - newPaidTotal);

    const updatedOrder = { ...selectedOrder, paid_amount: newPaidTotal, remaining_amount: newRemaining, installment_details: updatedInstallments };
    setOrders((prev) => prev.map((o) => (getOrderId(o) === getOrderId(updatedOrder) ? updatedOrder : o)));
    setSelectedOrder(updatedOrder);

    try {
      const mod = await import('../../services/api');
      const idRaw = getOrderId(updatedOrder) as any;
      if (idRaw) {
        await (mod.ordersService as any).update(Number(idRaw) || idRaw, {
          paid_amount: newPaidTotal,
          remaining_amount: newRemaining,
          installment_details: updatedInstallments,
        });
      }
      toast.success('Pagamento registrado com sucesso!');
    } catch (e) {
      console.error('Erro ao salvar pagamento:', e);
      const status = (e as any)?.response?.status;
      if (status === 404 || status === 400) {
        // Fallback: manter o estado otimista e informar sucesso local
        // 404 = endpoint não encontrado, 400 = payload incompatível mas endpoint existe
        console.warn(`[Financeiro] Endpoint de atualização retornou ${status}. Mantendo atualização local.`);
        toast.success('Pagamento registrado localmente (sincronização pendente)');
      } else {
        toast.error('Não foi possível salvar o pagamento no servidor');
      }
    } finally {
      setPaymentModal(false);
      setSelectedInstallments([]);
    }
  };

  return (
    <div className="space-y-6">
      

      {/* Abas (igual Agenda) dentro do container de pedidos) */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total a Receber</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-green-600 dark:text-green-400">R$ {stats.totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{statsBase.length} pedidos</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        {/* Pendente */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendente</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-yellow-600 dark:text-yellow-400">R$ {stats.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{statusCounts.pendentes} pedidos</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>
        {/* Atrasado */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Atrasado</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-red-600 dark:text-red-400">R$ {stats.totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{statusCounts.atrasadas} pedidos</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
        {/* Pagos */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pagos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-green-600 dark:text-green-400">R$ {stats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{statusCounts.pagas} pedidos</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card padding="sm">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por pedido ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          {/* Period selector */}
          <div className="relative flex-shrink-0">
            <select
              className="appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              value={statsRange}
              onChange={(e) => setStatsRange(e.target.value as any)}
            >
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="thisMonth">Este mês</option>
              <option value="lastMonth">Mês passado</option>
              <option value="custom">Personalizado</option>
              <option value="all">Todos</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
          </div>
          {/* Custom range inputs */}
          {statsRange === 'custom' && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white"
              />
              <span className="text-gray-500 dark:text-gray-400 text-center sm:text-inherit">—</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white"
              />
            </div>
          )}
          <div className="relative flex-shrink-0">
            <select
              className="appearance-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="">Todas as formas</option>
              <option value="Boleto">Boleto</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="PIX">PIX</option>
              <option value="Promissória">Promissória</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferência">Transferência</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
          </div>
        </div>
      </Card>

      <Card padding="sm">
        <div className="mb-2">
          <div className="flex space-x-8 overflow-x-auto overflow-y-hidden px-4">
            <button
              onClick={() => setActiveTab('pendentes')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'pendentes'
                  ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Pendentes ({categorized.pendentes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('atrasadas')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'atrasadas'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Atrasadas ({categorized.atrasadas.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('pagas')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'pagas'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              <span>Pagas ({categorized.pagas.length})</span>
            </button>
          </div>
        </div>

        <div className="">
          {/* Mobile list (cards) */}
          <div className="md:hidden space-y-3 overflow-x-hidden">
            {filtered.map((o, idx) => {
              const isOpen = !!openMap[getOrderId(o)];
              const paid = o.paid_amount || 0;
              const isPaid = paid >= (o.total || 0);
              const hasOverdue = o.installment_details?.some((i) => i.status !== 'paid' && new Date(i.due_date) < new Date());
              const statusLabel = isPaid ? 'Pago' : hasOverdue ? 'Atrasado' : 'Pendente';
              const statusClass = isPaid
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : hasOverdue
                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
              return (
                <div key={`${getOrderId(o)}-${idx}`} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                  <button
                    className="w-full text-left"
                    onClick={() => toggleOpen(getOrderId(o))}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-gray-900 dark:text-white">{getOrderNumber(o)}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 break-words">
                          {resolveCustomerName(o)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                          {o.payment_method}{getInstallmentsCount(o) ? ` (${getInstallmentsCount(o)}x)` : ''}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">Venc: {(() => { const next = getNextDueDateStr(o); return next ? formatBRFlexible(next) : 'Quitado'; })()}</div>
                      </div>
                      <div className={`text-[11px] px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-center">
                      <div className="text-center">
                        <span className="text-gray-500 dark:text-gray-400">Restante:</span>
                        <div className="font-semibold text-red-600 dark:text-red-400">R$ {(o.remaining_amount ?? Math.max(0, (o.total || 0) - (o.paid_amount || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div className="text-center">
                        <span className="text-gray-500 dark:text-gray-400">Pago:</span>
                        <div className="font-semibold text-green-600 dark:text-green-400">R$ {(o.paid_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="p-3 mt-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/60">
                      <div className="mb-2 flex flex-col sm:flex-row sm:justify-end gap-2 items-stretch sm:items-center">
                        <Button
                          variant="secondary"
                          className="px-2 py-1 text-xs w-full sm:w-auto"
                          onClick={() => handleGeneratePDF(o, 'open')}
                        >
                          <FileText size={14} className="mr-1" /> PDF Abertas
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-2 py-1 text-xs w-full sm:w-auto"
                          onClick={() => handleGeneratePDF(o, 'overdue')}
                        >
                          <FileText size={14} className="mr-1" /> PDF Atrasadas
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-2 py-1 text-xs w-full sm:w-auto"
                          onClick={() => handleGeneratePDF(o, 'all')}
                        >
                          <FileText size={14} className="mr-1" /> PDF Todas
                        </Button>
                      </div>
                      {/* Botões por parcela apenas; sem ação de pedido geral */}
                      {Array.isArray(o.installment_details) && o.installment_details.length > 0 ? (
                        <>
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Parcelas</div>
                          <div className="space-y-2">
                            {(o.installment_details || []).map((inst) => {
                              const overdue = inst.status !== 'paid' && new Date(inst.due_date) < new Date();
                              const label = inst.status === 'paid' ? 'Pago' : overdue ? 'Atrasado' : 'Pendente';
                              const canRefund = (inst.paid_amount || 0) > 0;
                              const canPayRemaining = inst.status !== 'paid';
                              return (
                                <div key={inst.number} className="p-3 rounded-md bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm min-w-0">
                                      <div className="font-medium text-gray-900 dark:text-white break-words">Parcela {inst.number}</div>
                                      <div className="text-gray-700 dark:text-gray-200 font-medium">R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                      <div className="text-gray-600 dark:text-gray-300">Venc: {formatBRFlexible(inst.due_date)}</div>
                                    </div>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
                                      inst.status === 'paid'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                        : overdue
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                    }`}>{label}</span>
                                  </div>
                                  {Array.isArray(inst.payments) && inst.payments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {inst.payments.map((p, i) => (
                                        <div key={i} className="flex items-start justify-between gap-2 text-xs text-gray-700 dark:text-gray-300 flex-wrap">
                                          <span className="break-words">Pago em: {formatBRDateTime(p.date)}</span>
                                          <span className="font-medium shrink-0">R$ {Number(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="mt-2 flex items-center gap-2">
                                    {inst.status !== 'paid' && (
                                      <>
                                        <Button
                                          variant="secondary"
                                          className="px-2 py-1 text-xs"
                                          disabled={!canPayRemaining || !canRegisterPayment}
                                          onClick={() => handlePayRemaining(o, inst)}
                                        >
                                          Pagar saldo
                                        </Button>
                                        <Button
                                          variant="secondary"
                                          className="px-2 py-1 text-xs"
                                          disabled={!canRegisterPayment}
                                          onClick={() => openAdjustModal(o, inst)}
                                        >
                                          Registrar
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="secondary"
                                      className="px-2 py-1 text-xs"
                                      disabled={!canRefund || !canRefundPayment}
                                      onClick={() => openRefundModal(o, inst)}
                                    >
                                      Estornar
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Parcelas</div>
                          <div className="space-y-2">
                            {(() => {
                              const remaining = Math.max(0, (o.total || 0) - (o.paid_amount || 0));
                              const isPaid = remaining === 0;
                              const label = isPaid ? 'Pago' : 'Pendente';
                              return (
                                <div className="p-3 rounded-md bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm min-w-0">
                                      <div className="font-medium text-gray-900 dark:text-white break-words">{o.payment_method || 'Pagamento'}</div>
                                      <div className="text-gray-700 dark:text-gray-200 font-medium">R$ {(o.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                      <div className="text-gray-600 dark:text-gray-300">Venc: {(() => {
                                        const next = getNextDueDateStr(o);
                                        return next ? formatBRFlexible(next) : 'Quitado';
                                      })()}</div>
                                    </div>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
                                      isPaid
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                    }`}>{label}</span>
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Button
                                      variant="secondary"
                                      className="px-2 py-1 text-xs"
                                      disabled={!canRegisterPayment}
                                      onClick={async () => {
                                        const inst = await ensureSingleInstallment(o);
                                        openAdjustModal(o, inst);
                                      }}
                                    >
                                      Registrar
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      className="px-2 py-1 text-xs"
                                      disabled={!canRefundPayment}
                                      onClick={async () => {
                                        const inst = await ensureSingleInstallment(o);
                                        openRefundModal(o, inst);
                                      }}
                                    >
                                      Estornar
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto overflow-y-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pedido</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">DATA VENCIMENTO</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((o, idx) => (
                  <React.Fragment key={`${getOrderId(o)}-${idx}`}>
                    <tr
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => toggleOpen(getOrderId(o))}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleOpen(getOrderId(o));
                        }
                      }}
                      aria-expanded={!!openMap[getOrderId(o)]}
                    >
                      <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{getOrderNumber(o)}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {o.payment_method}{getInstallmentsCount(o) ? ` (${getInstallmentsCount(o)}x)` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">{resolveCustomerName(o)}</td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900 dark:text-white">{(() => { const next = getNextDueDateStr(o); return next ? formatBRFlexible(next) : 'Quitado'; })()}</div>
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-center">
                        R$ {(o.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-center">
                        {(o.paid_amount || 0) >= (o.total || 0) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                            <CheckCircle size={12} className="mr-1" /> Pago
                          </span>
                        ) : o.installment_details?.some((i) => i.status !== 'paid' && new Date(i.due_date) < new Date()) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                            <AlertTriangle size={12} className="mr-1" /> Atrasado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                            <Clock size={12} className="mr-1" /> Pendente
                          </span>
                        )}
                      </td>
                    </tr>
                    {openMap[getOrderId(o)] && (
                      <tr>
                        <td colSpan={5} className="px-6 pt-0 pb-4">
                          <div className="p-3 rounded-b-md rounded-t-none bg-gray-100 dark:bg-gray-900/60 -mt-px">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-center">
                            <div className="text-center">
                              <span className="text-gray-500 dark:text-gray-400">Restante:</span>
                              <div className="font-semibold text-red-600 dark:text-red-400">R$ {(o.remaining_amount ?? Math.max(0, (o.total || 0) - (o.paid_amount || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="text-center">
                              <span className="text-gray-500 dark:text-gray-400">Pago:</span>
                              <div className="font-semibold text-green-600 dark:text-green-400">R$ {(o.paid_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Parcelas</h4>
                            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 items-stretch sm:items-center">
                              <Button
                                variant="secondary"
                                className="px-2 py-1 text-xs w-full sm:w-auto"
                                onClick={() => handleGeneratePDF(o, 'open')}
                              >
                                <FileText size={14} className="mr-1" /> PDF Abertas
                              </Button>
                              <Button
                                variant="secondary"
                                className="px-2 py-1 text-xs w-full sm:w-auto"
                                onClick={() => handleGeneratePDF(o, 'overdue')}
                              >
                                <FileText size={14} className="mr-1" /> PDF Atrasadas
                              </Button>
                              <Button
                                variant="secondary"
                                className="px-2 py-1 text-xs w-full sm:w-auto"
                                onClick={() => handleGeneratePDF(o, 'all')}
                              >
                                <FileText size={14} className="mr-1" /> PDF Todas
                              </Button>
                            </div>
                          </div>
                          {/* Sem ação de pedido geral; usar ações por parcela */}
                          {Array.isArray(o.installment_details) && o.installment_details.length > 0 ? (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                              {(o.installment_details || []).map((inst) => {
                                const overdue = inst.status !== 'paid' && new Date(inst.due_date) < new Date();
                                const label = inst.status === 'paid' ? 'Pago' : overdue ? 'Atrasado' : 'Pendente';
                                const canRefund = (inst.paid_amount || 0) > 0;
                                const canPayRemaining = inst.status !== 'paid';
                                return (
                                  <div key={inst.number} className="p-3 flex items-center justify-between bg-white/50 dark:bg-gray-800/50">
                                    <div className="text-sm">
                                      <div className="font-medium text-gray-900 dark:text-white">Parcela {inst.number} • R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                      <div className="text-gray-600 dark:text-gray-300">Venc: {formatBRFlexible(inst.due_date)}</div>
                                      {Array.isArray(inst.payments) && inst.payments.length > 0 && (
                                        <div className="mt-1 space-y-1">
                                          {inst.payments.map((p, i) => (
                                            <div key={i} className="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300">
                                              <span>Pago em: {formatBRDateTime(p.date)}</span>
                                              <span className="font-medium">R$ {Number(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        inst.status === 'paid'
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                          : overdue
                                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                      }`}>{label}</span>
                                      <div className="hidden md:flex items-center gap-2">
                                        {inst.status !== 'paid' && (
                                          <>
                                            <Button
                                              variant="secondary"
                                              className="px-2 py-1 text-xs"
                                              disabled={!canPayRemaining || !canRegisterPayment}
                                              onClick={() => handlePayRemaining(o, inst)}
                                            >
                                              Pagar saldo
                                            </Button>
                                            <Button
                                              variant="secondary"
                                              className="px-2 py-1 text-xs"
                                              disabled={!canRegisterPayment}
                                              onClick={() => openAdjustModal(o, inst)}
                                            >
                                              Registrar
                                            </Button>
                                          </>
                                        )}
                                        <Button
                                          variant="secondary"
                                          className="px-2 py-1 text-xs"
                                          disabled={!canRefund || !canRefundPayment}
                                          onClick={() => openRefundModal(o, inst)}
                                        >
                                          Estornar
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Parcelas</h4>
                              </div>
                              <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {(() => {
                                  const remaining = Math.max(0, (o.total || 0) - (o.paid_amount || 0));
                                  const isPaid = remaining === 0;
                                  const label = isPaid ? 'Pago' : 'Pendente';
                                  return (
                                    <div className="p-3 flex items-center justify-between bg-white/50 dark:bg-gray-800/50">
                                      <div className="text-sm">
                                        <div className="font-medium text-gray-900 dark:text-white">{o.payment_method || 'Pagamento'} • R$ {(o.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                        <div className="text-gray-600 dark:text-gray-300">Venc: {(() => {
                                          const next = getNextDueDateStr(o);
                                          return next ? formatBRFlexible(next) : 'Quitado';
                                        })()}</div>
                                      </div>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        isPaid
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                      }`}>{label}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum pedido encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Não há pedidos que correspondem.</p>
          </div>
        )}
      </Card>

      <Modal
        isOpen={paymentModal}
        onClose={() => { setPaymentModal(false); setSelectedInstallments([]); }}
        title="Registrar Pagamento"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{getOrderNumber(selectedOrder)} - {resolveCustomerName(selectedOrder)}</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total:</span>
                  <div className="font-semibold">R$ {(selectedOrder.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Restante:</span>
                  <div className="font-semibold text-red-600 dark:text-red-400">R$ {Math.max(0, (selectedOrder.total || 0) - (selectedOrder.paid_amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Pago:</span>
                  <div className="font-semibold text-green-600 dark:text-green-400">R$ {(selectedOrder.paid_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>

            {selectedOrder.installment_details && selectedOrder.installment_details.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Parcelas para Pagamento (opcional):</label>
                <div className="space-y-2">
                  {selectedOrder.installment_details.map((inst) => {
                    const due = new Date(inst.due_date);
                    const overdue = inst.status !== 'paid' && due < new Date();
                    const isDisabled = inst.status === 'paid';
                    const label = inst.status === 'paid' ? 'Pago' : inst.status === 'partial' ? 'Parcial' : overdue ? 'Atrasado' : 'Pendente';
                    return (
                      <label key={inst.number} className={`flex items-center p-3 border rounded-lg ${isDisabled ? 'bg-gray-100 dark:bg-gray-700 opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} ${selectedInstallments.includes(inst.number) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'} text-gray-900 dark:text-white`}>
                        <input
                          type="checkbox"
                          className="mr-3"
                          checked={selectedInstallments.includes(inst.number)}
                          disabled={isDisabled}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedInstallments([...selectedInstallments, inst.number]);
                            else setSelectedInstallments(selectedInstallments.filter((n) => n !== inst.number));
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white">Parcela {inst.number}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • Venc: {formatBRFlexible(inst.due_date)}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Campos de valor e forma de pagamento removidos. O valor será calculado automaticamente com base nas parcelas selecionadas. */}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => { setPaymentModal(false); setSelectedInstallments([]); }}>Cancelar</Button>
              <Button variant="primary" onClick={onRegisterPayment}><Receipt size={16} className="mr-1" /> Salvar Pagamento</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Registro de Pagamento */}
      <Modal
        isOpen={adjustModal.open}
        onClose={() => setAdjustModal({ open: false, order: null, inst: null, valueText: '' })}
        title="Registrar Pagamento"
        size="sm"
      >
        {adjustModal.inst && (
          <div className="py-2">
            <p className="text-lg text-gray-900 dark:text-white mb-4">
              Registrar pagamento na <span className="font-bold">Parcela {adjustModal.inst.number}</span>.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor do pagamento (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={adjustModal.valueText}
                onChange={(e) => setAdjustModal((s) => ({ ...s, valueText: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Restante disponível: R$ {Number(Math.max(0, (adjustModal.inst.amount || 0) - (adjustModal.inst.paid_amount || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="secondary" onClick={() => setAdjustModal({ open: false, order: null, inst: null, valueText: '' })}>Cancelar</Button>
              <Button variant="primary" onClick={submitAdjustModal} disabled={parseCurrency(adjustModal.valueText) <= 0}>Registrar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Estorno */}
      <Modal
        isOpen={refundModal.open}
        onClose={() => setRefundModal({ open: false, order: null, inst: null, selectedIndex: null })}
        title="Estornar Parcela"
        size="sm"
      >
        {refundModal.inst && (
          <div className="py-2">
            <p className="text-lg text-gray-900 dark:text-white mb-4">
              Selecione qual pagamento da <span className="font-bold">Parcela {refundModal.inst.number}</span> deseja estornar.
            </p>
            {Array.isArray(refundModal.inst.payments) && refundModal.inst.payments.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 p-2">
                {refundModal.inst.payments.map((p, idx) => (
                  <label key={idx} className="flex items-center justify-between gap-3 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="refund_payment"
                        checked={refundModal.selectedIndex === idx}
                        onChange={() => setRefundModal((s) => ({ ...s, selectedIndex: idx }))}
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-100">{formatBRDateTime(p.date)}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">R$ {Number(p.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Não há histórico de pagamentos nesta parcela. O estorno irá zerar o valor pago.
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="secondary" onClick={() => setRefundModal({ open: false, order: null, inst: null, selectedIndex: null })}>Cancelar</Button>
              <Button variant="danger" onClick={submitRefundModal}>Confirmar Estorno</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Financial;
