import React, { useEffect, useMemo, useState } from 'react';
import { Package, Coins, Tag } from 'lucide-react';
import Card from '../../components/Common/Card';
import { dashboardService } from '../../services/api';
import { formatBRFlexible } from '../../utils/date';
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

interface Props {
  startDate: string;
  endDate: string;
}

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ProductsReport: React.FC<Props> = ({ startDate, endDate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    topProducts: Array<{ product_id: string; name?: string; code?: string; quantity: number; sales: number }>;
    byDay: Array<{ _id: string; items: number; sales: number }>;
    periodTotals?: { salesTotal: number; shippingTotal: number; merchandiseTotal: number };
  }>({ topProducts: [], byDay: [], periodTotals: { salesTotal: 0, shippingTotal: 0, merchandiseTotal: 0 } });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await dashboardService.getProductsReport(startDate, endDate);
        if (mounted) setData(res || { topProducts: [], byDay: [], periodTotals: { salesTotal: 0, shippingTotal: 0, merchandiseTotal: 0 } });
      } catch (e: any) {
        console.error(e);
        if (mounted) setError(e?.message || 'Falha ao carregar relatório de produtos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [startDate, endDate]);

  const totals = useMemo(() => {
    const totalItems = data.byDay.reduce((s, d) => s + (d.items || 0), 0);
    const totalSales = data.byDay.reduce((s, d) => s + (d.sales || 0), 0);
    return { totalItems, totalSales };
  }, [data.byDay]);

  const ticket = totals.totalItems > 0 ? (totals.totalSales / totals.totalItems) : 0;

  // Charts data
  const byDaySeries = useMemo(() => {
    return (data.byDay || []).map((d) => ({
      date: d._id,
      items: Number(d.items || 0),
      sales: Number(d.sales || 0)
    }));
  }, [data.byDay]);

  const productDistribution = useMemo(() => {
    const denom = Number(data.periodTotals?.merchandiseTotal ?? 0);
    const total = denom > 0 ? denom : data.topProducts.reduce((s, p) => s + (Number(p.sales || 0)), 0);
    if (total <= 0) return [] as Array<{ name: string; value: number; color: string }>;
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const top5 = data.topProducts.slice(0, 5);
    const mapped = top5.map((p, idx) => ({ name: p.name || `Produto ${idx + 1}`, value: Math.round(((Number(p.sales || 0)) / total) * 100), color: colors[idx % colors.length] }));
    if (data.topProducts.length > 5) {
      mapped.push({ name: 'Outros', value: Math.max(0, 100 - mapped.reduce((s, x) => s + x.value, 0)), color: colors[4] });
    }
    return mapped;
  }, [data.topProducts]);

  // Theme detection for chart tick/label colors (avoid black on dark theme)
  const [isDark, setIsDark] = useState<boolean>(false);
  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains('dark'));
  }, []);
  const tickColor = isDark ? '#cbd5e1' : '#475569';

  // Tooltip personalizado: exibe quantidade de itens e valor em R$
  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload || {};
    const items = Number(row.items || 0);
    const sales = Number(row.sales || 0);
    const d = new Date(label as string);
    const f = isNaN(d.getTime()) ? String(label) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-');
    return (
      <div style={{ background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`, borderRadius: 8, padding: '8px 10px', color: isDark ? '#e5e7eb' : '#111827' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Dia {f}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#10B981' }}>Produtos</span>
          <span>{items.toLocaleString('pt-BR')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#3B82F6' }}>Vendas (R$)</span>
          <span>{sales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-report-ready={!loading && !error ? 'true' : 'false'}>
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

      {/* Stats Cards (match Sales style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Itens Vendidos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totals.totalItems.toLocaleString('pt-BR')}</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Package className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Faturamento (sem frete)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{currency(Number(data.periodTotals?.merchandiseTotal ?? 0))}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Frete: {currency(Number(data.periodTotals?.shippingTotal ?? 0))}</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Coins className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ticket por Item</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{ticket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Tag className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vendas por Dia</h3>
          <div className="h-64">
            {byDaySeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">Sem dados para o período</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDaySeries} margin={{ top: 8, right: 12, left: 8, bottom: 28 }} barGap={6} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    angle={-35}
                    textAnchor="end"
                    height={50}
                    minTickGap={10}
                    tick={{ fill: tickColor }}
                    tickFormatter={(v) => {
                      const d = new Date(v as string);
                      if (isNaN(d.getTime())) return String(v);
                      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    }}
                  />
                  {/* Único eixo Y com formatação em R$ (compacta) */}
                  <YAxis
                    tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(Number(v || 0))}
                    tick={{ fill: tickColor }}
                  />
                  <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} content={renderTooltip} />
                  {/* Apenas a barra azul (Vendas) */}
                  <Bar dataKey="sales" name="Vendas (R$)" fill="#3B82F6" radius={[4,4,0,0]} barSize={22}>
                    <LabelList dataKey="sales" position="top" formatter={(v: any) => currency(Number(v||0))} className="text-xs" fill={tickColor} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card padding="sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribuição por Produto</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={productDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {productDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 8, color: isDark ? '#e5e7eb' : '#111827' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card padding="sm">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Top Produtos</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-800 dark:text-gray-200">
            <thead>
              <tr className="text-center text-gray-600 dark:text-gray-300">
                <th className="py-2 px-4 text-center">Produto</th>
                <th className="py-2 px-4 text-center">Código</th>
                <th className="py-2 px-4 text-center">Quantidade</th>
                <th className="py-2 px-4 text-center">Vendas</th>
                <th className="py-2 px-4 text-center">Participação</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p, idx) => (
                <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="py-2 px-4 text-center dark:text-gray-200">{p.name}</td>
                  <td className="py-2 px-4 text-center dark:text-gray-200">{p.code}</td>
                  <td className="py-2 px-4 text-center dark:text-gray-200">{Number(p.quantity || 0).toLocaleString('pt-BR')}</td>
                  <td className="py-2 px-4 text-center dark:text-gray-200">{currency(Number(p.sales || 0))}</td>
                  <td className="py-2 px-4 text-center dark:text-gray-200">{(Number(data.periodTotals?.merchandiseTotal ?? 0) > 0) ? ((Number(p.sales || 0) / Number(data.periodTotals?.merchandiseTotal || 0)) * 100).toFixed(1) + '%' : '0%'}</td>
                </tr>
              ))}
              {data.topProducts.length === 0 && (
                <tr>
                  <td className="py-3 px-4 text-center text-gray-500 dark:text-gray-400" colSpan={5}>Sem dados para o período selecionado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ProductsReport;
