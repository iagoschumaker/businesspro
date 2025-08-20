import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/Common/Card';
import { DollarSign, ShoppingCart, CreditCard } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { dashboardService, ordersService } from '../../services/api';
import { formatBRFlexible } from '../../utils/date';
import { useTheme } from '../../contexts/ThemeContext';

interface SalesReportProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const SalesReport: React.FC<SalesReportProps> = ({ dateRange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<Array<{ date: string; sales: number; orders: number }>>([]);
  const [topProducts, setTopProducts] = useState<Array<{ name?: string; sales: number; quantity: number }>>([]);
  // mapa diário de métodos de pagamento -> valores e contagem
  const [dailyPayments, setDailyPayments] = useState<Record<string, { total: number; methods: Record<string, { amount: number; count: number }> }>>({});
  const { isDark } = useTheme();

  // Detect when PDF export is happening (ancestor toggled by Reports.tsx)
  const isPDF = typeof document !== 'undefined' && !!document.querySelector('.pdf-a4');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [salesData, productsData, allOrders] = await Promise.all([
          dashboardService.getSalesReport(dateRange.startDate, dateRange.endDate),
          dashboardService.getProductsReport(dateRange.startDate, dateRange.endDate),
          ordersService.getAll(),
        ]);
        if (!mounted) return;
        const safe = Array.isArray(salesData)
          ? salesData.map((d: any) => ({
              date: String(d._id || d.date || ''),
              sales: Number(d.sales || 0),
              orders: Number(d.orders || 0),
            }))
          : [];
        setSeries(safe);
        const tp = Array.isArray(productsData?.topProducts)
          ? productsData.topProducts.map((p: any) => ({
              name: p.name,
              sales: Number(p.sales || 0),
              quantity: Number(p.quantity || 0),
            }))
          : [];
        setTopProducts(tp);

        // agrega pedidos por dia e por método de pagamento
        const start = new Date(dateRange.startDate + 'T00:00:00');
        const end = new Date(dateRange.endDate + 'T23:59:59');
        const map: Record<string, { total: number; methods: Record<string, { amount: number; count: number }> }> = {};
        const list = Array.isArray(allOrders) ? allOrders : [];
        for (const o of list) {
          const d = new Date(String(o?.createdAt || o?.created_at || o?.date || ''));
          if (isNaN(d.getTime()) || d < start || d > end) continue;
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${day}`;
          const amount = Number(o?.total || o?.valor_total || 0) || 0;
          const raw = String(o?.payment_method || o?.paymentMethod || '').trim();
          const method = raw || 'Indefinido';
          if (!map[key]) map[key] = { total: 0, methods: {} };
          map[key].total += amount;
          if (!map[key].methods[method]) map[key].methods[method] = { amount: 0, count: 0 };
          map[key].methods[method].amount += amount;
          map[key].methods[method].count += 1;
        }
        setDailyPayments(map);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Falha ao carregar relatório de vendas');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [dateRange.startDate, dateRange.endDate]);

  const salesTotal = useMemo(() => series.reduce((acc, cur) => acc + Number(cur.sales || 0), 0), [series]);
  const ordersTotal = useMemo(() => series.reduce((acc, cur) => acc + Number(cur.orders || 0), 0), [series]);

  const formatDateBR = (d: string) => {
    // Expecting YYYY-MM-DD, but fallback to Date parsing
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-');
      return `${day}-${m}-${y}`; // DD-MM-AAAA
    }
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) {
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yyyy = dt.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    return d;
  };

  const formatCompactBR = (n: number) =>
    new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n || 0));

  const formatDateShort = (d: string) => {
    // Exibe como DD/MM para o eixo X (igual ao gráfico de Clientes)
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const parts = d.split('-');
      const m = parts[1];
      const day = parts[2];
      return `${day}/${m}`;
    }
    return d;
  };

  // Tooltip customizado (mesmo estilo do gráfico de Clientes)
  const SalesTooltip = ({ active, label, payload }: any) => {
    if (!active) return null;
    const labelStr = String(label ?? '');
    const item = series.find((x) => String(x.date) === labelStr);
    const sales = Number(payload?.[0]?.value ?? item?.sales ?? 0);
    const orders = Number(item?.orders ?? 0);
    const pm = dailyPayments[labelStr]?.methods || {};
    const methodEntries = Object.entries(pm).sort((a, b) => (b[1].amount - a[1].amount));
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
    return (
      <div
        style={{
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid var(--tooltip-border)',
          borderRadius: 8,
          color: '#FFFFFF',
          padding: '8px 10px'
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Dia {formatDateBR(String(labelStr))}</div>
        <div style={{ marginBottom: 2 }}>Vendas : {Number(sales || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        <div style={{ fontSize: 12, marginBottom: methodEntries.length ? 6 : 0 }}>Pedidos: {orders.toLocaleString('pt-BR')}</div>
        {methodEntries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {methodEntries.map(([name, data], idx) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: colors[idx % colors.length], display: 'inline-block' }} />
                <span>
                  {name}: {Number(data.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  {' '}• {data.count} {data.count === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const productData = React.useMemo(() => {
    const total = topProducts.reduce((s, p) => s + (p.sales || 0), 0);
    const colors = isPDF
      ? ['#000000', '#555555', '#777777', '#999999', '#CCCCCC']
      : ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    if (total <= 0 || topProducts.length === 0) return [] as Array<{ name: string; value: number; color: string }>;
    const top5 = topProducts.slice(0, 5);
    const mapped = top5.map((p, idx) => ({ name: p.name || `Produto ${idx + 1}` , value: Math.round(((p.sales || 0) / total) * 100), color: colors[idx % colors.length] }));
    // Se existirem mais que 5, soma em "Outros"
    if (topProducts.length > 5) {
      mapped.push({ name: 'Outros', value: Math.max(0, 100 - mapped.reduce((s, x) => s + x.value, 0)), color: colors[4] });
    }
    return mapped;
  }, [topProducts]);

  const stats = [
    {
      title: 'Vendas Totais',
      value: salesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      change: '',
      icon: DollarSign,
      color: isPDF ? 'text-black' : 'text-green-600'
    },
    {
      title: 'Pedidos',
      value: ordersTotal.toLocaleString('pt-BR'),
      change: '',
      icon: ShoppingCart,
      color: isPDF ? 'text-black' : 'text-blue-600'
    },
    {
      title: 'Ticket Médio',
      value: ordersTotal > 0 ? (salesTotal / ordersTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—',
      change: '',
      icon: CreditCard,
      color: isPDF ? 'text-black' : 'text-purple-600'
    }
  ];

  // Renders label at the top edge of each bar: value (BRL) and orders count
  const renderBarLabel = (props: any) => {
    const { x, y, width, value, index } = props || {};
    const item = series?.[index];
    const orders = Number(item?.orders || 0);
    const sales = Number(value || 0);
    if (!isFinite(sales) || sales <= 0 || !isFinite(orders)) return null;
    const cx = (x ?? 0) + (width ?? 0) / 2;
    const cy = Math.max(0, (y ?? 0) - 6);
    const text = `${sales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} • ${orders} ${orders === 1 ? 'pedido' : 'pedidos'}`;
    const labelColor = isPDF ? '#000000' : (isDark ? '#E5E7EB' : '#111827');
    return (
      <text x={cx} y={cy} textAnchor="middle" fontSize={10} fill={labelColor}>
        {text}
      </text>
    );
  };

  return (
    <div
      className={isPDF ? 'space-y-4 sales-report' : 'space-y-6 sales-report'}
      data-report-ready={loading ? 'false' : 'true'}
      data-loading={loading ? 'true' : 'false'}
    >
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Período: {formatBRFlexible(dateRange.startDate)} até {formatBRFlexible(dateRange.endDate)}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="text-sm text-gray-500 dark:text-gray-400">Carregando dados...</div>
      )}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Stats Cards */}
      <div className={isPDF ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}>
        {stats.map((stat, index) => (
          <div
            key={index}
            className={
              isPDF
                ? 'p-2 bg-white border border-gray-300 rounded-none'
                : 'p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
                <p className={`text-sm ${stat.color} mt-1`}>
                  {stat.change}
                </p>
              </div>
              <div className={isPDF ? 'p-0 bg-white rounded-none' : 'p-3 bg-white dark:bg-gray-800 rounded-lg'}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className={isPDF ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
        {/* Sales Chart (por dia no período) */}
        <Card padding="sm" className={isPDF ? 'bg-white !shadow-none !border !border-gray-300 !rounded-none' : ''}>
          <h3 className={isPDF ? 'text-base font-semibold text-gray-900 dark:text-white mb-2' : 'text-lg font-semibold text-gray-900 dark:text-white mb-4'}>
            Vendas por Dia
          </h3>
          <div className={isPDF ? 'h-40' : 'h-64'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className={isPDF ? '' : 'opacity-30'} stroke={isPDF ? '#999' : undefined} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatDateShort(String(v))}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                  minTickGap={10}
                  className="text-sm text-gray-600 dark:text-gray-400"
                />
                <YAxis
                  tickFormatter={(v) => formatCompactBR(Number(v))}
                  domain={[0, 'dataMax * 1.1']}
                  className="text-sm text-gray-600 dark:text-gray-400"
                />
                {!isPDF && (
                  <Tooltip
                    cursor={{ fill: 'rgba(37, 99, 235, 0.12)' }}
                    content={<SalesTooltip />}
                  />
                )}
                <Bar dataKey="sales" fill={isPDF ? '#000' : '#3B82F6'} activeBar={isPDF ? undefined : { fill: '#2563EB' }} radius={[4, 4, 0, 0]} barSize={28}>
                  <LabelList content={renderBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Product Distribution */}
        <Card padding="sm" className={isPDF ? 'bg-white !shadow-none !border !border-gray-300 !rounded-none' : ''}>
          <h3 className={isPDF ? 'text-base font-semibold text-gray-900 dark:text-white mb-2' : 'text-lg font-semibold text-gray-900 dark:text-white mb-4'}>
            Distribuição por Produto
          </h3>
          <div className={isPDF ? 'h-40' : 'h-64'}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productData}
                  cx="50%"
                  cy="50%"
                  outerRadius={isPDF ? 60 : 80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                {!isPDF && <Tooltip />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card padding="sm" className={isPDF ? 'overflow-hidden bg-white !shadow-none !border !border-gray-300 !rounded-none' : 'overflow-hidden'}>
        <div className={isPDF ? 'mb-1' : 'mb-2'}>
          <h3 className={isPDF ? 'text-base font-semibold text-gray-900 dark:text-white' : 'text-lg font-semibold text-gray-900 dark:text-white'}>
            Produtos Mais Vendidos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead className={isPDF ? 'bg-white' : 'bg-gray-50 dark:bg-gray-900/50'}>
              <tr>
                <th className={isPDF ? 'px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider' : 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'}>
                  Produto
                </th>
                <th className={isPDF ? 'px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider' : 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'}>
                  Vendas
                </th>
                <th className={isPDF ? 'px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider' : 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'}>
                  Quantidade
                </th>
                <th className={isPDF ? 'px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider' : 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'}>
                  Participação
                </th>
              </tr>
            </thead>
            <tbody className={isPDF ? 'bg-white divide-y divide-gray-300' : 'bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'}>
              {topProducts.length > 0 ? (
                topProducts.map((p, index) => {
                  const total = topProducts.reduce((s, x) => s + (x.sales || 0), 0);
                  const share = total > 0 ? ((p.sales || 0) / total) * 100 : 0;
                  return (
                    <tr key={index}>
                      <td className={isPDF ? 'px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white' : 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white'}>
                        {p.name || '—'}
                      </td>
                      <td className={isPDF ? 'px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white'}>
                        {(p.sales || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className={isPDF ? 'px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'}>
                        {Number(p.quantity || 0).toLocaleString('pt-BR')}
                      </td>
                      <td className={isPDF ? 'px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400' : 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'}>
                        {share.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className={isPDF ? 'px-4 py-3 text-sm text-gray-500 dark:text-gray-400' : 'px-6 py-4 text-sm text-gray-500 dark:text-gray-400'} colSpan={4}>Sem dados para o período selecionado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SalesReport;