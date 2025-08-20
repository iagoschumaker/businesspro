<<<<<<< HEAD
import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/Common/Card';
=======
import React from 'react';
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
import { Users, TrendingUp, DollarSign, Calendar } from 'lucide-react';
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
  LineChart,
<<<<<<< HEAD
  Line,
  Legend,
  LabelList
} from 'recharts';
import { dashboardService, ordersService, customersService } from '../../services/api';
import { formatBRFlexible } from '../../utils/date';
=======
  Line
} from 'recharts';
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b

interface CustomersReportProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const CustomersReport: React.FC<CustomersReportProps> = ({ dateRange }) => {
<<<<<<< HEAD
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<Array<{ date: string; newCustomers: number }>>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // 1) Daily new customers series (API already provides)
        const custSeries = await dashboardService.getCustomersReport(dateRange.startDate, dateRange.endDate);
        let safeSeries = Array.isArray(custSeries)
          ? custSeries.map((d: any) => ({ date: String(d._id || d.date || ''), newCustomers: Number(d.newCustomers || 0) }))
          : [];
        // 2) Orders (used to compute top customers, ticket médio, retention/loyalty)
        const allOrders = await ordersService.getAll();
        // 3) Customers (for segmentation PF vs PJ)
        let allCustomers: any[] = [];
        try {
          allCustomers = await customersService.getAll({ page: 1, limit: 10000 });
        } catch {
          allCustomers = [];
        }

        // If API returned empty or zero-only series, build from customers creation dates as fallback
        const isZeroOnly = !safeSeries.length || safeSeries.every((d) => Number(d.newCustomers || 0) === 0);
        if (isZeroOnly && Array.isArray(allCustomers) && allCustomers.length) {
          // Build date map within range
          const start = new Date(dateRange.startDate + 'T00:00:00');
          const end = new Date(dateRange.endDate + 'T23:59:59');
          const days: string[] = [];
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            days.push(`${y}-${m}-${day}`);
          }
          const byDay: Record<string, number> = Object.fromEntries(days.map((k) => [k, 0]));
          for (const c of allCustomers) {
            const cdRaw = String(c?.createdAt || c?.created_at || '');
            if (!cdRaw) continue;
            const cd = new Date(cdRaw.length === 10 ? cdRaw + 'T00:00:00' : cdRaw);
            if (!(cd instanceof Date) || isNaN(cd.getTime())) continue;
            const y = cd.getFullYear();
            const m = String(cd.getMonth() + 1).padStart(2, '0');
            const day = String(cd.getDate()).padStart(2, '0');
            const key = `${y}-${m}-${day}`;
            if (cd >= start && cd <= end && key in byDay) {
              byDay[key] += 1;
            }
          }
          safeSeries = days.map((d) => ({ date: d, newCustomers: byDay[d] || 0 }));
        }

        if (!mounted) return;
        setSeries(safeSeries);
        setOrders(Array.isArray(allOrders) ? allOrders : []);
        setCustomers(Array.isArray(allCustomers) ? allCustomers : []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Falha ao carregar relatório de clientes');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [dateRange.startDate, dateRange.endDate]);

  

  // Helpers
  const toLocalStart = (s: string) => new Date(s + 'T00:00:00');
  const toLocalEnd = (s: string) => new Date(s + 'T23:59:59');
  const inRange = (d: Date) => d >= toLocalStart(dateRange.startDate) && d <= toLocalEnd(dateRange.endDate);
  const getOrderDate = (o: any) => new Date(String(o?.createdAt || o?.created_at || o?.date || '0'));
  const safeStr = (v: any) => {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    return '';
  };
  const isValidObjectId = (v: any) => /^[a-f0-9]{24}$/i.test(String(v || '').trim());
  const getOrderCustomerDoc = (o: any) => normalizeDoc(
    o?.customer_document ||
    o?.customer?.document || o?.customer?.cpf || o?.customer?.cnpj ||
    o?.customer_id?.document || o?.customer_id?.cpf || o?.customer_id?.cnpj
  );
  const getOrderCustomerKey = (o: any) => {
    const id1 = safeStr(o?.customer?._id).trim();
    const id2 = safeStr(o?.customer?.id).trim();
    const id3 = safeStr(o?.customer_id?._id).trim();
    const id4 = safeStr(o?.customer_id).trim(); // may already be string id
    const oid = [id1, id2, id3, id4].find((x) => isValidObjectId(x));
    if (oid) return oid;
    const doc = getOrderCustomerDoc(o);
    if (doc) return doc; // use document as stable key
    const nm = safeStr(o?.customer) || safeStr(o?.customer_name) || safeStr(o?.nome_cliente) || safeStr(o?.customer_id?.name);
    return nm || '—';
  };
  const getOrderCustomerName = (o: any) => String(
    o?.customer?.name ||
    o?.customer?.nome ||
    o?.customer?.fantasy_name ||
    o?.customer?.razao_social ||
    o?.customer_name ||
    o?.customer_id?.name ||
    o?.nome_cliente ||
    o?.customer ||
    '—'
  );
  const filteredOrders = useMemo(() => (orders || []).filter((o) => {
    const d = getOrderDate(o);
    return d instanceof Date && !isNaN(d.getTime()) && inRange(d);
  }), [orders, dateRange.startDate, dateRange.endDate]);

  // Segmentation PF/PJ from customers list (overall)
  const segmentData = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    let pf = 0, pj = 0;
    for (const c of list) {
      const isPJ = (String(c?.person_type || '').toUpperCase() === 'JURIDICA') || (!!c?.cnpj && String(c.cnpj).trim() !== '');
      const isPF = (String(c?.person_type || '').toUpperCase() === 'FISICA') || (!!c?.cpf && String(c.cpf).trim() !== '');
      if (isPJ) pj++; else if (isPF) pf++; else pf++; // default assume PF
    }
    const total = Math.max(1, pf + pj);
    return [
      { name: 'Pessoa Física', value: Math.round((pf / total) * 100), color: '#3B82F6' },
      { name: 'Pessoa Jurídica', value: Math.round((pj / total) * 100), color: '#10B981' }
    ];
  }, [customers]);

  // Loyalty buckets based on orders per customer within range
  const loyaltyData = useMemo(() => {
    const byCustomer: Record<string, { name: string; count: number }> = {};
    for (const o of filteredOrders) {
      const key = getOrderCustomerKey(o);
      const name = getOrderCustomerName(o);
      if (!byCustomer[key]) byCustomer[key] = { name, count: 0 };
      byCustomer[key].count += 1;
    }
    let b1 = 0, b2 = 0, b3 = 0;
    Object.values(byCustomer).forEach((v) => {
      if (v.count <= 3) b1++; else if (v.count <= 10) b2++; else b3++;
    });
    const totalActive = Math.max(1, Object.keys(byCustomer).length);
    return [
      { category: 'Novos (1-3 pedidos)', customers: b1, percentage: Math.round((b1 / totalActive) * 100) },
      { category: 'Regulares (4-10 pedidos)', customers: b2, percentage: Math.round((b2 / totalActive) * 100) },
      { category: 'VIP (11+ pedidos)', customers: b3, percentage: Math.round((b3 / totalActive) * 100) }
    ];
  }, [filteredOrders]);

  // Retention: for each month in range, percentage of customers that also ordered next month
  const retentionData = useMemo(() => {
    const fmtMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = (d: Date) => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()];
    const mapByMonth: Record<string, Set<string>> = {};
    for (const o of filteredOrders) {
      const d = getOrderDate(o);
      const key = fmtMonth(d);
      const cust = getOrderCustomerKey(o);
      if (!mapByMonth[key]) mapByMonth[key] = new Set();
      mapByMonth[key].add(cust);
    }
    const months = Object.keys(mapByMonth).sort();
    const out: Array<{ month: string; retention: number }> = [];
    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      const next = months[i + 1];
      const setCur = mapByMonth[m];
      if (!setCur || !setCur.size) continue;
      const setNext = next ? mapByMonth[next] : undefined;
      let retained = 0;
      if (setNext) {
        setCur.forEach((c) => { if (setNext.has(c)) retained++; });
      }
      const dParts = m.split('-');
      const d = new Date(Number(dParts[0]), Number(dParts[1]) - 1, 1);
      const percent = setNext ? Math.round((retained / setCur.size) * 100) : 0;
      out.push({ month: monthName(d), retention: percent });
    }
    return out.length ? out : [];
  }, [filteredOrders]);

  const totalNew = useMemo(() => series.reduce((acc, cur) => acc + Number(cur.newCustomers || 0), 0), [series]);
  // Map customers by id for quick lookup (fallback when orders don't embed customer.name)
  const customersMap = useMemo(() => {
    const map: Record<string, string> = {};
    const list = Array.isArray(customers) ? customers : [];
    for (const c of list) {
      const id = String(c?._id || c?.id || '').trim();
      const nm = String(c?.name || c?.nome || c?.fantasy_name || c?.razao_social || '').trim();
      if (id) map[id] = nm || map[id] || '';
    }
    return map;
  }, [customers]);

  const normalizeDoc = (v: any) => String(v || '').replace(/\D+/g, '');
  const customersByDoc = useMemo(() => {
    const map: Record<string, string> = {};
    const list = Array.isArray(customers) ? customers : [];
    for (const c of list) {
      const doc = normalizeDoc(c?.document || c?.cpf || c?.cnpj);
      const nm = String(c?.name || c?.nome || c?.fantasy_name || c?.razao_social || '').trim();
      if (doc) map[doc] = nm || map[doc] || '';
    }
    return map;
  }, [customers]);

  const [resolvedNamesByDoc, setResolvedNamesByDoc] = useState<Record<string, string>>({});

  // Lazily fetch any missing customer names by ID (if not present in customersMap)
  useEffect(() => {
    // Collect candidate ids from orders that are inside range and have missing/ID-like names
    const ids = new Set<string>();
    const isValidObjectId = (v: any) => /^[a-f0-9]{24}$/i.test(String(v || '').trim());
    const docsToFetch = new Set<string>();
    for (const o of filteredOrders) {
      const key = getOrderCustomerKey(o);
      const name = getOrderCustomerName(o);
      const maybeIdFromKey = isValidObjectId(key) ? String(key) : '';
      const cand1 = String(o?.customer?._id || '').trim();
      const cand2 = String(o?.customer?.id || '').trim();
      const cand3 = String(o?.customer_id?._id || '').trim();
      const cand4 = String(o?.customer_id || '').trim();
      const candidates = [cand1, cand2, cand3, cand4, maybeIdFromKey]
        .filter((v) => !!v && isValidObjectId(v)) as string[];
      const nameLooksLikeId = /^[a-f0-9]{24}$/i.test(String(name));
      const needs = (!name || name === '—' || nameLooksLikeId);
      if (!needs) continue;
      for (const id of candidates) {
        if (!id) continue;
        if (!customersMap[id] && !resolvedNames[id]) ids.add(id);
      }
      // Also collect docs if present
      const doc = normalizeDoc(o?.customer_document || o?.customer?.document || o?.customer?.cpf || o?.customer?.cnpj);
      if (doc && !customersByDoc[doc] && !resolvedNamesByDoc[doc]) docsToFetch.add(doc);
    }
    if (ids.size === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const toFetch = Array.from(ids).slice(0, 20); // limit concurrent lookups
        const results = await Promise.allSettled(toFetch.map((id) => customersService.getById(id)));
        const patch: Record<string, string> = {};
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            const data: any = res.value;
            const id = toFetch[idx];
            const nm = String(data?.name || data?.nome || data?.fantasy_name || data?.razao_social || '').trim();
            if (nm) patch[id] = nm;
          }
        });
        if (!cancelled && Object.keys(patch).length) {
          setResolvedNames((prev) => ({ ...prev, ...patch }));
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [filteredOrders, customersMap, customersByDoc, resolvedNames, resolvedNamesByDoc]);

  // Lazy fetch by document (uses search endpoint) when only document is known
  useEffect(() => {
    // Prepare unique docs from filteredOrders that we still need
    const docs = new Set<string>();
    for (const o of filteredOrders) {
      const name = getOrderCustomerName(o);
      const nameLooksLikeId = /^[a-f0-9]{24}$/i.test(String(name));
      const needs = (!name || name === '—' || nameLooksLikeId);
      if (!needs) continue;
      const doc = normalizeDoc(o?.customer_document || o?.customer?.document || o?.customer?.cpf || o?.customer?.cnpj);
      if (doc && !customersByDoc[doc] && !resolvedNamesByDoc[doc]) docs.add(doc);
    }
    if (docs.size === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const toFetch = Array.from(docs).slice(0, 10);
        const lookups = await Promise.allSettled(toFetch.map((doc) => customersService.getAll({ search: doc, limit: 1, page: 1 })));
        const patch: Record<string, string> = {};
        lookups.forEach((res) => {
          if (res.status === 'fulfilled') {
            const arr: any[] = Array.isArray(res.value) ? res.value : [];
            if (arr.length) {
              const c = arr[0];
              const nm = String(c?.name || c?.nome || c?.fantasy_name || c?.razao_social || '').trim();
              const d = normalizeDoc(c?.document || c?.cpf || c?.cnpj);
              if (nm && d) patch[d] = nm;
            }
          }
        });
        if (!cancelled && Object.keys(patch).length) setResolvedNamesByDoc((prev) => ({ ...prev, ...patch }));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [filteredOrders, customersByDoc, resolvedNamesByDoc]);
  const activeCustomersSet = useMemo(() => {
    const set = new Set<string>();
    for (const o of filteredOrders) set.add(getOrderCustomerKey(o));
    return set;
  }, [filteredOrders]);
  const activeCustomers = activeCustomersSet.size;
  const totals = useMemo(() => {
    const count = filteredOrders.length || 0;
    const sum = filteredOrders.reduce((a, o) => a + (Number(o?.total || o?.valor_total || 0) || 0), 0);
    return { count, sum };
  }, [filteredOrders]);
  const ticketMedio = totals.count > 0 ? (totals.sum / totals.count) : 0;
  const retencaoMensal = retentionData.length ? retentionData[retentionData.length - 1].retention : 0;
  const stats = [
    {
      title: 'Total de Clientes (carregados)',
      value: String(customers?.length ?? 0),
      change: `+${totalNew} novos`,
=======
  const customerData = [
    { month: 'Jan', newCustomers: 25, activeCustomers: 150 },
    { month: 'Fev', newCustomers: 32, activeCustomers: 175 },
    { month: 'Mar', newCustomers: 28, activeCustomers: 190 },
    { month: 'Abr', newCustomers: 45, activeCustomers: 220 },
    { month: 'Mai', newCustomers: 38, activeCustomers: 245 },
    { month: 'Jun', newCustomers: 52, activeCustomers: 280 }
  ];

  const segmentData = [
    { name: 'Pessoa Física', value: 65, color: '#3B82F6' },
    { name: 'Pessoa Jurídica', value: 35, color: '#10B981' }
  ];

  const loyaltyData = [
    { category: 'Novos (1-3 pedidos)', customers: 120, percentage: 43 },
    { category: 'Regulares (4-10 pedidos)', customers: 85, percentage: 30 },
    { category: 'VIP (11+ pedidos)', customers: 75, percentage: 27 }
  ];

  const retentionData = [
    { month: 'Jan', retention: 85 },
    { month: 'Fev', retention: 87 },
    { month: 'Mar', retention: 82 },
    { month: 'Abr', retention: 89 },
    { month: 'Mai', retention: 91 },
    { month: 'Jun', retention: 88 }
  ];

  const stats = [
    {
      title: 'Total de Clientes',
      value: '1.234',
      change: '+8.2%',
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Clientes Ativos',
<<<<<<< HEAD
      value: String(activeCustomers),
      change: '',
=======
      value: '856',
      change: '+12.5%',
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Ticket Médio',
<<<<<<< HEAD
      value: ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      change: '',
=======
      value: 'R$ 485',
      change: '+5.8%',
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      icon: DollarSign,
      color: 'text-purple-600'
    },
    {
      title: 'Retenção Mensal',
<<<<<<< HEAD
      value: `${retencaoMensal}%`,
      change: '',
=======
      value: '88%',
      change: '+2.1%',
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      icon: Calendar,
      color: 'text-orange-600'
    }
  ];

<<<<<<< HEAD
  // Theme detection for tick colors (simple, reads once)
  const [isDark, setIsDark] = useState<boolean>(false);
  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains('dark'));
  }, []);
  const tickColor = isDark ? '#cbd5e1' : '#475569'; // slate-300 in dark, slate-600 in light

  // Build per-day PF (azul) vs PJ (verde) counts from customers list
  const chartSeries = useMemo(() => {
    if (!Array.isArray(customers) || customers.length === 0) {
      // fallback to total-only series if available
      return (series || [])
        .filter((d) => Number(d.newCustomers || 0) > 0)
        .map((d) => ({ date: d.date, pf: d.newCustomers, pj: 0, total: d.newCustomers }));
    }
    const start = new Date(dateRange.startDate + 'T00:00:00');
    const end = new Date(dateRange.endDate + 'T23:59:59');
    const byDay: Record<string, { pf: number; pj: number; total: number }> = {};
    for (const c of customers) {
      const cdRaw = String(c?.createdAt || c?.created_at || '');
      if (!cdRaw) continue;
      const cd = new Date(cdRaw.length === 10 ? cdRaw + 'T00:00:00' : cdRaw);
      if (!(cd instanceof Date) || isNaN(cd.getTime())) continue;
      if (cd < start || cd > end) continue;
      const y = cd.getFullYear();
      const m = String(cd.getMonth() + 1).padStart(2, '0');
      const d = String(cd.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      if (!byDay[key]) byDay[key] = { pf: 0, pj: 0, total: 0 };
      const isPJ = (String(c?.person_type || '').toUpperCase() === 'JURIDICA') || (!!c?.cnpj && String(c.cnpj).trim() !== '');
      if (isPJ) byDay[key].pj += 1; else byDay[key].pf += 1;
      byDay[key].total += 1;
    }
    return Object.entries(byDay)
      .filter(([, v]) => v.total > 0)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, v]) => ({ date, pf: v.pf, pj: v.pj, total: v.total }));
  }, [customers, dateRange.startDate, dateRange.endDate, series]);
  const formatDateLabel = (iso: string) => {
    // Expect YYYY-MM-DD
    const [y, m, d] = String(iso).split('-');
    if (y && m && d) return `${d}/${m}`;
    // fallback
    return iso;
  };

  const formatDateBRFull = (d: string) => {
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

  const CustomersTooltip = ({ active, label, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    // valores por chave
    let pfVal = 0, pjVal = 0, totalVal = 0;
    for (const p of payload) {
      const key = String(p?.name || p?.dataKey || '').toLowerCase();
      const v = Number(p?.value || 0);
      if (key === 'pf') pfVal = v;
      else if (key === 'pj') pjVal = v;
      else if (key === 'total') totalVal = v;
    }
    const total = totalVal || (pfVal + pjVal);
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
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Dia {formatDateBRFull(String(label))}</div>
        <div style={{ marginBottom: 4 }}>Novos clientes : {Number(total || 0).toLocaleString('pt-BR')}</div>
        <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: '#3B82F6', display: 'inline-block' }} />
            <span>PF: {Number(pfVal || 0).toLocaleString('pt-BR')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: '#10B981', display: 'inline-block' }} />
            <span>PJ: {Number(pjVal || 0).toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    );
  };

  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; orders: number; total: number; lastOrder: string }> = {};
    for (const o of filteredOrders) {
      const key = getOrderCustomerKey(o);
      let name = getOrderCustomerName(o);
      // Build list of possible ids to resolve name
      const candidates: string[] = [];
      const maybeIdFromKey = /^[a-f0-9]{24}$/i.test(String(key)) ? String(key) : '';
      const cand1 = String(o?.customer?._id || '').trim();
      const cand2 = String(o?.customer?.id || '').trim();
      const cand3 = String(o?.customer_id || '').trim();
      if (cand1) candidates.push(cand1);
      if (cand2) candidates.push(cand2);
      if (cand3) candidates.push(cand3);
      if (maybeIdFromKey) candidates.push(maybeIdFromKey);
      // If current name is missing or looks like an ObjectId, try map/lookup
      const nameLooksLikeId = /^[a-f0-9]{24}$/i.test(String(name));
      if (!name || name === '—' || nameLooksLikeId) {
        let resolved = '';
        for (const id of candidates) {
          if (customersMap[id]) { resolved = customersMap[id]; break; }
          if (!resolved && resolvedNames[id]) { resolved = resolvedNames[id]; break; }
        }
        if (!resolved && candidates.length && Array.isArray(customers) && customers.length) {
          // As a last resort, scan the customers array (covers numeric id or mismatched keys)
          const found = customers.find((c: any) => {
            const cid = String(c?._id || c?.id || '').trim();
            return cid && candidates.includes(cid);
          });
          if (found) resolved = String(found?.name || found?.nome || found?.fantasy_name || found?.razao_social || '');
        }
        // Try by document
        if (!resolved) {
          const doc = normalizeDoc(o?.customer_document || o?.customer?.document || o?.customer?.cpf || o?.customer?.cnpj);
          if (doc) {
            if (customersByDoc[doc]) resolved = customersByDoc[doc];
            else if (resolvedNamesByDoc[doc]) resolved = resolvedNamesByDoc[doc];
          }
        }
        if (resolved) name = resolved;
      }
      const total = Number(o?.total || o?.valor_total || 0) || 0;
      const d = getOrderDate(o);
      const dStr = isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = { name: name || '—', orders: 0, total: 0, lastOrder: dStr };
      map[key].orders += 1;
      map[key].total += total;
      if (dStr && (!map[key].lastOrder || dStr > map[key].lastOrder)) map[key].lastOrder = dStr;
    }
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20) // top 20
      .map((c) => ({
        name: c.name,
        orders: c.orders,
        total: c.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        lastOrder: c.lastOrder
      }));
  }, [filteredOrders]);

  return (
    <div className="space-y-6" data-report-ready={!loading && !error ? 'true' : 'false'}>
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

=======
  const topCustomers = [
    { name: 'João Silva', orders: 45, total: 'R$ 28.500', lastOrder: '2024-01-12' },
    { name: 'Maria Santos', orders: 38, total: 'R$ 22.800', lastOrder: '2024-01-10' },
    { name: 'Carlos Oliveira', orders: 32, total: 'R$ 19.200', lastOrder: '2024-01-08' },
    { name: 'Ana Costa', orders: 28, total: 'R$ 16.800', lastOrder: '2024-01-06' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Período: {new Date(dateRange.startDate).toLocaleDateString('pt-BR')} até{' '}
        {new Date(dateRange.endDate).toLocaleDateString('pt-BR')}
      </div>

>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
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
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
<<<<<<< HEAD
        {/* Customer Acquisition (novos por dia) */}
        <Card padding="sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Novos Clientes por Dia (Total: {totalNew})
          </h3>
          <div className="h-64 relative">
            {chartSeries.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                Sem dados para o período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSeries} margin={{ top: 8, right: 12, left: 8, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    angle={-35}
                    textAnchor="end"
                    height={50}
                    minTickGap={10}
                    tick={{ fill: tickColor }}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: tickColor }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(37, 99, 235, 0.12)' }}
                    content={<CustomersTooltip />}
                  />
                  <Legend wrapperStyle={{ color: tickColor }} />
                  <Bar dataKey="pf" name="Pessoa Física" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="pj" name="Pessoa Jurídica" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} barSize={28} />
                  {/* Transparent total bar only to render labels above the stack, similar to Sales chart value labels */}
                  <Bar dataKey="total" fill="transparent">
                    <LabelList
                      dataKey="total"
                      position="top"
                      formatter={(v: any) => `${v} ${Number(v) === 1 ? 'cliente' : 'clientes'}`}
                      className="text-xs"
                      fill={tickColor}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Customer Segmentation */}
        <Card padding="sm">
=======
        {/* Customer Acquisition */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Aquisição de Clientes
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  className="text-sm text-gray-600 dark:text-gray-400"
                />
                <YAxis className="text-sm text-gray-600 dark:text-gray-400" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="newCustomers" fill="#3B82F6" name="Novos Clientes" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Segmentation */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Segmentação de Clientes
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
<<<<<<< HEAD
        </Card>
=======
        </div>
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Retention */}
<<<<<<< HEAD
        <Card padding="sm">
=======
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Taxa de Retenção
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  className="text-sm text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  className="text-sm text-gray-600 dark:text-gray-400"
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`${value}%`, 'Retenção']}
                />
                <Line 
                  type="monotone" 
                  dataKey="retention" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
<<<<<<< HEAD
        </Card>

        {/* Customer Loyalty */}
        <Card padding="sm">
=======
        </div>

        {/* Customer Loyalty */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Lealdade dos Clientes
          </h3>
          <div className="space-y-4">
            {loyaltyData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.category}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.customers} clientes
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
<<<<<<< HEAD
                    <div
=======
                    <div 
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
<<<<<<< HEAD
        </Card>
      </div>

      {/* Top Customers Table */}
      <Card padding="sm" className="overflow-hidden">
        <div className="mb-2">
=======
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Clientes por Volume
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
<<<<<<< HEAD
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pedidos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Comprado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
=======
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pedidos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Comprado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
                  Último Pedido
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {topCustomers.map((customer, index) => (
                <tr key={index}>
<<<<<<< HEAD
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-center">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">
                    {customer.orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">
                    {customer.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                    {formatBRFlexible(customer.lastOrder)}
=======
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {customer.orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {customer.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(customer.lastOrder).toLocaleDateString('pt-BR')}
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
<<<<<<< HEAD
      </Card>
=======
      </div>
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    </div>
  );
};

export default CustomersReport;