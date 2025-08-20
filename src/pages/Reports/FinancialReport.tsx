import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/Common/Card';
import { ordersService } from '../../services/api';
import { formatBRFlexible, formatBRDateTime } from '../../utils/date';
import { generateFinancialPDF } from '../../utils/pdfGeneratorFinancial';
import { Coins, CheckCircle2, AlertTriangle, ListOrdered } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList
} from 'recharts';

interface Props {
  startDate: string;
  endDate: string;
}

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinancialReport: React.FC<Props> = ({ startDate, endDate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  // expanded removed; details are rendered directly per date
  // Normalize 'YYYY-M-D' -> 'YYYY-MM-DD' to ensure lexicographic comparisons work
  const normDate = (s: string) => {
    const t = String(s || '').slice(0, 10);
    const [y, m = '', d = ''] = t.split('-');
    if (!y) return '';
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Backend report is not required; compute locally below
        // Always load orders to compute local aggregation (correct for multiple installments per order)
        try {
          const allOrders = await ordersService.getAll();
          if (mounted) setOrders(Array.isArray(allOrders) ? allOrders : []);
        } catch {
          if (mounted) setOrders([]);
        }
      } catch (e: any) {
        console.error(e);
        if (mounted) setError(e?.message || 'Falha ao carregar relatório financeiro');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    // Recarrega quando o módulo Financeiro sinalizar atualizações
    const onUpdated = async () => {
      try {
        const fresh = await ordersService.getAll();
        if (!mounted) return;
        setOrders(Array.isArray(fresh) ? fresh : []);
      } catch {
        if (mounted) setOrders([]);
      }
    };
    window.addEventListener('financial:orders-updated', onUpdated as any);
    return () => { mounted = false; window.removeEventListener('financial:orders-updated', onUpdated as any); };
  }, [startDate, endDate]);

  // Local aggregation by installment due date including details and payment methods
  type InstallmentItem = {
    order: string;
    customer: string;
    number: number;
    due_date: string;
    amount: number;
    paid_amount: number;
    status: string;
    payment_method: string;
  };

  const localByDueDate = useMemo(() => {
    const map: Record<string, { count: number; total: number; paid: number; overdue: number; methods: Record<string, { count: number; amount: number }>; items: InstallmentItem[] }> = {};
    const s = normDate(startDate);
    const e = normDate(endDate);
    const inRange = (d: string) => {
      const x = normDate(d);
      return !!x && x >= s && x <= e;
    };
    for (const o of orders || []) {
      const insts: any[] = Array.isArray((o as any)?.installment_details) ? (o as any).installment_details : [];
      if (insts.length === 0) {
        const due = normDate(String((o as any)?.due_date || (o as any)?.createdAt || (o as any)?.date || ''));
        if (!due || !inRange(due)) continue;
        const amount = Number((o as any)?.total || 0) || 0;
        const paid = Number((o as any)?.paid_amount || 0) || 0;
        const status = String((o as any)?.status || '').toLowerCase();
        const overdue = status === 'overdue' || due < s ? Math.max(0, amount - paid) : 0;
        const method = String((o as any)?.payment_method || (o as any)?.paymentMethod || 'Indefinido');
        const orderNum = String((o as any)?.order_number || (o as any)?.id || '—');
        const custName = String((o as any)?.customer?.name || (o as any)?.customer_name || (o as any)?.nome_cliente || (o as any)?.customer || '—');
        if (!map[due]) map[due] = { count: 0, total: 0, paid: 0, overdue: 0, methods: {}, items: [] };
        map[due].count += 1; map[due].total += amount; map[due].paid += paid; map[due].overdue += overdue;
        if (!map[due].methods[method]) map[due].methods[method] = { count: 0, amount: 0 };
        map[due].methods[method].count += 1; map[due].methods[method].amount += amount;
        map[due].items.push({ order: orderNum, customer: custName, number: 1, due_date: due, amount, paid_amount: paid, status, payment_method: method });
        continue;
      }
      for (const i of insts) {
        const due = normDate(String(i?.due_date || ''));
        if (!due || !inRange(due)) continue;
        const amount = Number(i?.amount || 0) || 0;
        const paid = Number(i?.paid_amount || 0) || 0;
        const status = String(i?.status || '').toLowerCase();
        const overdue = status === 'overdue' || due < s ? Math.max(0, amount - paid) : 0;
        const method = String(i?.payment_method || (o as any)?.payment_method || (o as any)?.paymentMethod || 'Indefinido');
        const orderNum = String((o as any)?.order_number || (o as any)?.id || '—');
        const custName = String((o as any)?.customer?.name || (o as any)?.customer_name || (o as any)?.nome_cliente || (o as any)?.customer || '—');
        if (!map[due]) map[due] = { count: 0, total: 0, paid: 0, overdue: 0, methods: {}, items: [] };
        map[due].count += 1; map[due].total += amount; map[due].paid += paid; map[due].overdue += overdue;
        if (!map[due].methods[method]) map[due].methods[method] = { count: 0, amount: 0 };
        map[due].methods[method].count += 1; map[due].methods[method].amount += amount;
        map[due].items.push({ order: orderNum, customer: custName, number: Number(i?.number || 0), due_date: due, amount, paid_amount: paid, status, payment_method: method });
      }
    }
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        _id: date,
        total_amount: v.total,
        paid_amount: v.paid,
        overdue_amount: v.overdue,
        count: v.count,
        methods: v.methods,
        items: v.items,
      }));
  }, [orders, startDate, endDate]);

  const stats = useMemo(() => {
    const agg = (localByDueDate || []).reduce((acc, d) => {
      acc.total += Number(d.total_amount || 0);
      acc.paid += Number(d.paid_amount || 0);
      acc.overdue += Number(d.overdue_amount || 0);
      acc.installments += Number(d.count || 0);
      return acc;
    }, { total: 0, paid: 0, overdue: 0, installments: 0 });
    const receivable = Math.max(0, agg.total - agg.paid);
    return { total: receivable, paid: agg.paid, overdue: agg.overdue, installments: agg.installments };
  }, [localByDueDate]);

  const chartSeries = useMemo(() => {
    return (localByDueDate || []).map((d) => ({
      date: d._id,
      total: Number(d.total_amount || 0),
      paid: Number(d.paid_amount || 0),
      overdue: Number(d.overdue_amount || 0),
      count: Number(d.count || 0),
    }));
  }, [localByDueDate]);

  // Theme detection for chart tick/label colors (avoid black on dark theme)
  const [isDark, setIsDark] = useState<boolean>(false);
  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains('dark'));
  }, []);
  const tickColor = isDark ? '#cbd5e1' : '#475569';
  
  // Report by period: one row per order (aggregate status/values)
  type OrderRow = {
    order_id: string;
    order_number: string;
    customer: string;
    next_due: string | '';
    total: number;
    paid: number;
    status: 'paid' | 'overdue' | 'pending' | 'partial';
    payment_method: string;
  };

  const orderRows = useMemo<OrderRow[]>(() => {
    const list: OrderRow[] = [];
    const s = normDate(startDate);
    const e = normDate(endDate);
    const inRange = (d: string) => {
      const x = normDate(d);
      return !!x && x >= s && x <= e;
    };
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (const o of orders || []) {
      const orderId = String((o as any)?._id || (o as any)?.id || '');
      const orderNum = String((o as any)?.order_number || (o as any)?.id || '—');
      const cust = String((o as any)?.customer?.name || (o as any)?.customer_name || (o as any)?.nome_cliente || (o as any)?.customer || '—');
      const insts: any[] = Array.isArray((o as any)?.installment_details) ? (o as any).installment_details : [];
      let total = 0; let paid = 0; let anyOverdue = false; let nextDue: string = '';
      let payMethod = String((o as any)?.payment_method || (o as any)?.paymentMethod || '—');
      let periodInsts: any[] = [];
      if (insts.length === 0) {
        const due = normDate(String((o as any)?.due_date || (o as any)?.createdAt || (o as any)?.date || ''));
        if (!due || !inRange(due)) continue;
        periodInsts = [{ number: 1, amount: Number((o as any)?.total || 0) || 0, paid_amount: Number((o as any)?.paid_amount || 0) || 0, due_date: due, status: String((o as any)?.status || '').toLowerCase(), payment_method: payMethod }];
      } else {
        periodInsts = insts.filter((i: any) => inRange(String(i?.due_date || '')));
        if (periodInsts.length === 0) continue;
      }
      for (const i of periodInsts) {
        const due = normDate(String(i?.due_date || ''));
        const amount = Number(i?.amount || 0) || 0;
        const paidI = Number(i?.paid_amount || 0) || 0;
        total += amount; paid += paidI;
        if (!payMethod || payMethod === '—') payMethod = String(i?.payment_method || payMethod || '—');
        if (due && new Date(due) < todayOnly && paidI < amount) anyOverdue = true;
      }
      const openDues = periodInsts
        .filter((i: any) => Number(i?.paid_amount || 0) < Number(i?.amount || 0) && String(i?.due_date || ''))
        .map((i: any) => normDate(String(i?.due_date)));
      const allDues = periodInsts.map((i: any) => normDate(String(i?.due_date))).filter(Boolean);
      const candidates = (openDues.length ? openDues : allDues).sort((a: string,b: string)=>a.localeCompare(b));
      nextDue = candidates[0] || '';
      let status: OrderRow['status'] = 'pending';
      if (paid >= total && total > 0) status = 'paid';
      else if (anyOverdue) status = 'overdue';
      else if (paid > 0 && paid < total) status = 'partial';
      list.push({ order_id: orderId || orderNum, order_number: orderNum, customer: cust, next_due: nextDue, total, paid, status, payment_method: payMethod });
    }
    // sort by next due then order number
    return list.sort((a, b) => (a.next_due || '').localeCompare(b.next_due || '') || a.order_number.localeCompare(b.order_number));
  }, [orders, startDate, endDate]);

  const [reportTab, setReportTab] = useState<'pagas' | 'atrasadas' | 'pendentes' | 'todas'>('pagas');
  const filteredRows = useMemo(() => {
    if (reportTab === 'todas') return orderRows;
    if (reportTab === 'pagas') return orderRows.filter((i) => i.status === 'paid');
    if (reportTab === 'atrasadas') return orderRows.filter((i) => i.status === 'overdue');
    // pendentes inclui pending ou partial
    return orderRows.filter((i) => i.status === 'pending' || i.status === 'partial');
  }, [orderRows, reportTab]);

  // Expand/collapse state per order
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggleOpen = (rowKey: string) => setOpenMap((m) => ({ ...m, [rowKey]: !m[rowKey] }));
  const getOrderById = (orderId: string) => (orders || []).find((o: any) => String(o?._id || o?.id || o?.order_number) === orderId || String(o?.order_number) === orderId);

  // Expose selected statuses for PDF export (consumed by Reports.tsx)
  const selectedStatusesStr = useMemo(() => {
    if (reportTab === 'todas') return 'todos';
    if (reportTab === 'pagas') return 'paid';
    if (reportTab === 'atrasadas') return 'overdue';
    return 'pending,partial';
  }, [reportTab]);

  return (
    <div className="space-y-6" data-report-ready={!loading && !error ? 'true' : 'false'} data-selected-statuses={selectedStatusesStr}>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Período: {formatBRFlexible(startDate)} até {formatBRFlexible(endDate)}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="text-sm text-gray-500 dark:text-gray-400">Carregando dados...</div>
      )}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Stats Cards (match ProductsReport style) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total a Receber</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{currency(stats.total)}</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Coins className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pago</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{currency(stats.paid)}</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Em Atraso</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{currency(stats.overdue)}</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Parcelas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{Number(stats.installments || 0).toLocaleString('pt-BR')}</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <ListOrdered className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card padding="sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Valores por Data de Vencimento</h3>
          <div className="h-96">
            {chartSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">Sem dados para o período</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSeries} margin={{ top: 8, right: 12, left: 8, bottom: 28 }} barGap={6} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    angle={-35}
                    textAnchor="end"
                    height={50}
                    minTickGap={10}
                    tick={{ fill: tickColor }}
                    tickFormatter={(v) => {
                      const s = String(v || '').slice(0, 10);
                      const [, m, d] = s.split('-');
                      return d && m ? `${d}/${m}` : s || '-';
                    }}
                  />
                  <YAxis tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v || 0))} tick={{ fill: tickColor }} />
                  <Tooltip
                    formatter={(v: any, _name: any, props: any) => {
                      const key = props && props.dataKey ? String(props.dataKey) : '';
                      const label = key === 'total' ? 'Total' : key === 'paid' ? 'Pago' : key === 'overdue' ? 'Atraso' : String(_name);
                      return [currency(Number(v)), label];
                    }}
                    labelFormatter={(label: any) => {
                      const s = String(label || '').slice(0, 10);
                      const [y, m, d] = s.split('-');
                      const br = d && m && y ? `${d}/${m}/${y}` : s || '-';
                      return `Dia ${br}`;
                    }}
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                    contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`, borderRadius: 8, color: isDark ? '#e5e7eb' : '#111827' }}
                  />
                  <Legend wrapperStyle={{ color: tickColor }} />
                  <Bar dataKey="total" name="Total" fill="#3B82F6" barSize={22}>
                    <LabelList dataKey="total" position="top" formatter={(v: any) => currency(Number(v||0))} className="text-xs" fill={tickColor} />
                  </Bar>
                  <Bar dataKey="paid" name="Pago" fill="#10B981" barSize={22} />
                  <Bar dataKey="overdue" name="Atraso" fill="#EF4444" barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Report table by period and status */}
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Relatório por Período</h3>
          <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => setReportTab('todas')} className={`px-3 py-1 text-xs ${reportTab==='todas' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'}`}>Todas</button>
            <button onClick={() => setReportTab('pagas')} className={`px-3 py-1 text-xs ${reportTab==='pagas' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'}`}>Pagos</button>
            <button onClick={() => setReportTab('atrasadas')} className={`px-3 py-1 text-xs ${reportTab==='atrasadas' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'}`}>Atrasados</button>
            <button onClick={() => setReportTab('pendentes')} className={`px-3 py-1 text-xs ${reportTab==='pendentes' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'}`}>Pendentes</button>
          </div>
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Próx. Venc.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pago</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Forma</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRows.length === 0 && (
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 text-center" colSpan={7}>Sem registros para o período.</td>
                </tr>
              )}
              {filteredRows.map((it: OrderRow) => {
                const rowKey = String(it.order_id || it.order_number);
                const isOpen = !!openMap[rowKey];
                const ord: any = getOrderById(it.order_id);
                const insts: any[] = Array.isArray(ord?.installment_details) ? ord.installment_details : [];
                const s = normDate(startDate);
                const e = normDate(endDate);
                const inRange = (d: string) => {
                  const x = normDate(d);
                  return !!x && x >= s && x <= e;
                };
                const periodInsts = insts.filter((pi: any) => inRange(String(pi?.due_date || '')));
                const periodTotal = periodInsts.reduce((sum: number, pi: any) => sum + Number(pi?.amount || 0), 0);
                const periodPaid = periodInsts.reduce((sum: number, pi: any) => sum + Number(pi?.paid_amount || 0), 0);
                return ([
                    <tr key={`row-${rowKey}`} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => toggleOpen(rowKey)}>
                      <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="font-medium">{it.order_number}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{it.payment_method} ({Array.isArray(ord?.installment_details) ? ord.installment_details.length : (ord?.installments || 1)}x)</div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">{it.customer}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 dark:text-white text-left">{it.next_due || '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 dark:text-white text-right">{currency(it.total)}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 dark:text-white text-right">{currency(it.paid)}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 dark:text-white text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${it.status==='paid' ? 'bg-green-600/10 text-green-600' : it.status==='overdue' ? 'bg-red-600/10 text-red-600' : it.status==='partial' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-500/10 text-slate-500'}`}>{it.status === 'paid' ? 'Pago' : it.status === 'overdue' ? 'Atraso' : it.status === 'partial' ? 'Parcial' : 'Pendente'}</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 dark:text-white text-center">{it.payment_method}</td>
                    </tr>,
                    isOpen && (
                      <tr key={`detail-${rowKey}`}>
                        <td colSpan={7} className="px-6 pb-4">
                          <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs font-medium text-gray-600 dark:text-gray-300">Parcelas</div>
                                <div className="mt-1 grid grid-cols-2 gap-6 text-sm">
                                  <div>
                                    <div className="text-gray-600 dark:text-gray-400">Restante:</div>
                                    <div className="font-semibold text-red-600">{currency(Math.max(0, Number(periodTotal || 0) - Number(periodPaid || 0)))}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600 dark:text-gray-400">Pago:</div>
                                    <div className="font-semibold text-green-600">{currency(Number(periodPaid || 0))}</div>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); generateFinancialPDF && ord && generateFinancialPDF(ord); }}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100">
                                  <span className="hidden sm:inline">Gerar PDF</span>
                                  <span className="sm:hidden">PDF</span>
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {(periodInsts.length ? periodInsts : [
                                { number: 1, amount: it.total, paid_amount: it.paid, due_date: it.next_due, status: it.status, payment_method: it.payment_method },
                              ]).map((pi: any, k: number) => (
                                <div key={k} className="rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-medium text-gray-700 dark:text-gray-200">Parcela {pi?.number ?? k + 1} • {currency(Number(pi?.amount || 0))}</span>
                                    <span className={`uppercase inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${String(pi?.status||'').toLowerCase()==='paid' ? 'bg-green-600/10 text-green-600' : String(pi?.status||'').toLowerCase()==='overdue' ? 'bg-red-600/10 text-red-600' : String(pi?.status||'').toLowerCase()==='partial' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-500/10 text-slate-500'}`}>{String(pi?.status || '').toLowerCase() === 'paid' ? 'Pago' : String(pi?.status || '').toLowerCase() === 'overdue' ? 'Atraso' : String(pi?.status || '').toLowerCase() === 'partial' ? 'Parcial' : 'Pendente'}</span>
                                  </div>
                                  <div className="mt-1 text-sm text-gray-900 dark:text-white">Venc.: {String(pi?.due_date || '').slice(0,10) || '-'}</div>
                                  <div className="mt-1 text-sm text-gray-900 dark:text-white">Pago: {currency(Number(pi?.paid_amount || 0))}</div>
                                  {pi?.payment_date && (
                                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">Pago em: {formatBRDateTime(String(pi?.payment_date))}  <span className="ml-1 font-medium">{currency(Number(pi?.paid_amount || 0))}</span></div>
                                  )}
                                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">Forma: {pi?.payment_method || '-'}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                ]);
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default FinancialReport;
