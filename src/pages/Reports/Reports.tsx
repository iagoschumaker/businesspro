import React, { useMemo, useRef, useState } from 'react';
import { Download, FileText, BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import SalesReport from './SalesReport';
import CustomersReport from './CustomersReport';
import ProductsReport from './ProductsReport';
import FinancialReport from './FinancialReport';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { generateCustomersReportPDF, generateSalesReportPDF, generateProductsReportPDF, generateFinancialInstallmentsPDF, DailyPayments, SalesSeries } from '../../utils/pdfReports';
import { dashboardService, ordersService, productsService } from '../../services/api';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sales');
  // Use local date formatting to avoid UTC shifts from toISOString()
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [dateRange, setDateRange] = useState({
    startDate: formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    endDate: formatDate(new Date())
  });

  const reportTypes = [
    {
      id: 'sales',
      name: 'Vendas',
      icon: TrendingUp,
      description: 'Relatório de vendas e faturamento'
    },
    {
      id: 'customers',
      name: 'Clientes',
      icon: PieChart,
      description: 'Análise de clientes e comportamento'
    },
    {
      id: 'products',
      name: 'Produtos',
      icon: BarChart3,
      description: 'Performance de produtos e estoque'
    },
    {
      id: 'financial',
      name: 'Financeiro',
      icon: FileText,
      description: 'Fluxo de caixa e recebimentos'
    }
  ];

  const quickReports = [
    {
      name: 'Vendas do Mês',
      description: 'Relatório completo das vendas do mês atual',
      format: 'PDF'
    },
    {
      name: 'Clientes Ativos',
      description: 'Lista de clientes com pedidos nos últimos 30 dias',
      format: 'Excel'
    },
    {
      name: 'Produtos em Baixa',
      description: 'Produtos com estoque abaixo do mínimo',
      format: 'PDF'
    },
    {
      name: 'Relatório de Parcelas',
      description: 'Período e status selecionados',
      format: 'PDF'
    }
  ];

  const containerRef = useRef<HTMLDivElement | null>(null);

  const fileDateSuffix = useMemo(() => `${dateRange.startDate}_a_${dateRange.endDate}`, [dateRange.startDate, dateRange.endDate]);

  // Wait for the next paint cycle(s) to ensure state-driven DOM (like dateRange) is updated
  const waitForRender = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  // Wait until the current report marks itself as ready (SalesReport sets data-report-ready)
  async function waitForReportReady(timeoutMs = 12000) {
    const start = Date.now();
    for (;;) {
      const el = containerRef.current;
      const ready = !!el?.querySelector('[data-report-ready="true"]');
      if (ready) return;
      if (Date.now() - start > timeoutMs) return; // give up to avoid hanging
      await new Promise((r) => setTimeout(r, 80));
    }
  }

  // Helper: temporarily change activeTab/dateRange for PDF capture and then restore
  async function withTemporaryState(temp: { tab?: string; range?: { startDate: string; endDate: string } }, run: () => Promise<void>) {
    const prevTab = activeTab;
    const prevRange = { ...dateRange };
    try {
      if (temp.tab) setActiveTab(temp.tab);
      if (temp.range) setDateRange(temp.range);
      // wait a tick to allow render
      await new Promise((resolve) => setTimeout(resolve, 60));
      await run();
    } finally {
      // restore previous state without disrupting user selection
      if (temp.tab) setActiveTab(prevTab);
      if (temp.range) setDateRange(prevRange);
    }
  }

  async function exportPDFOfContainer(name: string) {
    // Ensure latest UI is painted (e.g., after user changed the period)
    await waitForRender();
    await waitForReportReady();
    const el = containerRef.current;
    if (!el) return;
    // Inject temporary A4 + grayscale-friendly styles and wrap with class for PDF capture
    const style = document.createElement('style');
    style.setAttribute('data-pdf-style', 'true');
    style.textContent = `
      /* Use full A4 width so layout can distribute columns; render with higher base font for clarity in PDF */
      .pdf-a4 { width: 794px; max-width: 100%; margin: 0 auto; padding: 12px 16px; background: #ffffff !important; color: #000 !important; font-size: 13px; }
      .pdf-a4 * { box-shadow: none !important; filter: none !important; }
      .pdf-a4 img, .pdf-a4 svg { filter: grayscale(100%) contrast(1); }
      .pdf-a4 [class*='bg-'] { background: #ffffff !important; }
      .pdf-a4 [class*='text-'] { color: #000000 !important; }
    `;
    document.head.appendChild(style);
    el.classList.add('pdf-a4');
    let canvas: HTMLCanvasElement;
    try {
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      const scale = Math.min(4, Math.max(2, Math.ceil(dpr) * 2));
      canvas = await html2canvas(el, { scale, backgroundColor: '#ffffff', useCORS: true, logging: false });
    } finally {
      // Clean up styles and class regardless of success
      el.classList.remove('pdf-a4');
      if (style && style.parentNode) style.parentNode.removeChild(style);
    }
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Fit within full page with margins, maintaining aspect
    const sideMargin = 8; // mm
    const topMargin = 8;
    const bottomMargin = 8;
    const maxW = pageWidth - sideMargin * 2;
    const maxH = pageHeight - topMargin - bottomMargin;
    const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const x = (pageWidth - imgWidth) / 2; // center horizontally within margins
    const y = topMargin; // top margin
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    pdf.save(`${name}_${fileDateSuffix}.pdf`);
  }

  async function exportCSV(name: string, rows: Array<Record<string, any>>) {
    if (!rows || rows.length === 0) {
      // create empty csv with notice
      const blob = new Blob([`Relatório vazio para ${name} (${fileDateSuffix})`], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_${fileDateSuffix}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')].concat(
      rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_${fileDateSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportCurrentReport(format: 'PDF' | 'Excel') {
    if (format === 'PDF') {
      // Sales: capture the rendered component to keep charts and layout identical
      if (activeTab === 'sales') {
        // Gera PDF rico com tabelas (datas, vendas, pedidos, e detalhamento por forma de pagamento)
        const data = await dashboardService.getSalesReport(dateRange.startDate, dateRange.endDate);
        const series: SalesSeries = (Array.isArray(data) ? data : []).map((d: any) => ({
          date: String(d._id || d.date || ''),
          sales: Number(d.sales || 0),
          orders: Number(d.orders || 0),
        }));

        // Agrega pagamentos por dia a partir dos pedidos
        const allOrders = await ordersService.getAll();
        const start = new Date(dateRange.startDate + 'T00:00:00');
        const end = new Date(dateRange.endDate + 'T23:59:59');
        const map: DailyPayments = {} as DailyPayments;
        const list = Array.isArray(allOrders) ? allOrders : [];
        const ordersInRange = [] as any[];
        for (const o of list) {
          const d = new Date(String(o?.createdAt || o?.created_at || o?.date || ''));
          if (!(d instanceof Date) || isNaN(d.getTime()) || d < start || d > end) continue;
          ordersInRange.push(o);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${day}`;
          const amount = Number(o?.total || o?.valor_total || 0) || 0;
          const raw = String(o?.payment_method || o?.paymentMethod || '').trim();
          const method = raw || 'Indefinido';
          if (!map[key]) map[key] = { total: 0, methods: {} } as any;
          map[key].total += amount;
          if (!map[key].methods[method]) map[key].methods[method] = { amount: 0, count: 0 } as any;
          map[key].methods[method].amount += amount;
          map[key].methods[method].count += 1;
        }

        // DEBUG: Log freight/shipping presence and a small snapshot before PDF generation
        try {
          const snapshot = ordersInRange.slice(0, 20).map((o: any) => ({
            id: o?._id || o?.id || o?.numero || '-',
            date: o?.date || o?.createdAt || o?.created_at,
            total: o?.total ?? o?.valor_total ?? 0,
            shipping: o?.shipping ?? o?.frete ?? 0,
          }));
          const stats = ordersInRange.reduce(
            (acc: any, o: any) => {
              const raw = o?.shipping ?? o?.frete ?? 0;
              const num = typeof raw === 'number'
                ? raw
                : (Number(String(raw).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0);
              acc.count += 1;
              acc.nonZero += num > 0 ? 1 : 0;
              acc.sum += num;
              return acc;
            },
            { count: 0, nonZero: 0, sum: 0 }
          );
          // eslint-disable-next-line no-console
          console.log('[Reports] Sales PDF — freight snapshot (first 20):', snapshot);
          // eslint-disable-next-line no-console
          console.log('[Reports] Sales PDF — freight stats:', stats);
        } catch {}

        await generateSalesReportPDF({ startDate: dateRange.startDate, endDate: dateRange.endDate }, series, map, ordersInRange);
        return;
      }
      if (activeTab === 'customers') {
        const data = await dashboardService.getCustomersReport(dateRange.startDate, dateRange.endDate);
        const series = (Array.isArray(data) ? data : []).map((d: any) => ({
          date: String(d._id || d.date || ''),
          newCustomers: Number(d.newCustomers || 0),
        }));
        await generateCustomersReportPDF({ startDate: dateRange.startDate, endDate: dateRange.endDate }, series);
        return;
      }
      if (activeTab === 'financial') {
        // Usa gerador de PDF financeiro baseado em parcelas com status selecionados na UI
        // Aguarda a renderização e o flag de "report-ready" para não ler status antigo
        await waitForRender();
        await waitForReportReady();
        const orders = await ordersService.getAll();
        const el = containerRef.current?.querySelector('[data-selected-statuses]') as HTMLElement | null;
        const statusesStr = (el?.getAttribute('data-selected-statuses') || '').trim();
        let statuses = statusesStr ? statusesStr.split(',').map((s) => s.trim()).filter(Boolean) : [];
        if (statuses.some((s) => s.toLowerCase() === 'todos')) {
          statuses = [];
        }
        const labelMap: Record<string, string> = { paid: 'Pago', overdue: 'Vencido', pending: 'Pendente', partial: 'Parcial' };
        const statusLabel = statuses.length ? statuses.map((s) => labelMap[s] || s).join(', ') : 'Todos';
        await generateFinancialInstallmentsPDF(
          { startDate: dateRange.startDate, endDate: dateRange.endDate },
          orders || [],
          statuses as any,
          {
            title: 'Relatório de Parcelas',
            subtitle: `Período: ${dateRange.startDate} até ${dateRange.endDate} • Status: ${statusLabel}`,
            filenamePrefix: 'Relatorio_Parcelas',
          }
        );
        return;
      }
      if (activeTab === 'products') {
        const data = await dashboardService.getProductsReport(dateRange.startDate, dateRange.endDate);
        const topProducts = Array.isArray(data?.topProducts) ? data.topProducts : [];
        const byDay = Array.isArray(data?.byDay) ? data.byDay : [];
        const mapped = {
          topProducts: topProducts.map((p: any) => ({
            product_id: String(p?.product_id || p?.id || ''),
            name: String(p?.name || p?.nome || '—'),
            code: String(p?.code || p?.codigo || '—'),
            quantity: Number(p?.quantity || 0),
            sales: Number(p?.sales || 0),
            // Preserve original freight/shipping (could be BRL-formatted string). PDF will parse.
            shipping: (p?.shipping ?? p?.freight ?? 0),
          })),
          byDay: byDay.map((d: any) => ({
            date: String(d?._id || d?.date || ''),
            items: Number(d?.items || 0),
            sales: Number(d?.sales || 0),
            // Preserve original freight/shipping for PDF parsing
            shipping: (d?.shipping ?? d?.freight ?? 0),
          })),
        };
        await generateProductsReportPDF({ startDate: dateRange.startDate, endDate: dateRange.endDate }, mapped);
        return;
      }
      // Fallback image-based PDF para outras abas
      await exportPDFOfContainer(`Relatorio_${activeTab}`);
      return;
    }
    // CSV (Excel)
    if (activeTab === 'sales') {
      const data = await dashboardService.getSalesReport(dateRange.startDate, dateRange.endDate);
      const rows = (Array.isArray(data) ? data : []).map((d: any) => ({
        data: String(d._id || d.date || ''),
        vendas: Number(d.sales || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pedidos: Number(d.orders || 0),
      }));
      await exportCSV('Relatorio_Vendas', rows);
      return;
    }
    if (activeTab === 'customers') {
      const data = await dashboardService.getCustomersReport(dateRange.startDate, dateRange.endDate);
      const rows = (Array.isArray(data) ? data : []).map((d: any) => ({
        data: String(d._id || d.date || ''),
        novos_clientes: Number(d.newCustomers || 0),
      }));
      await exportCSV('Relatorio_Clientes', rows);
      return;
    }
    if (activeTab === 'products') {
      const data = await dashboardService.getProductsReport(dateRange.startDate, dateRange.endDate);
      const rows = (Array.isArray(data?.byDay) ? data.byDay : []).map((d: any) => ({
        data: String(d._id || ''),
        itens: Number(d.items || 0),
        vendas: Number(d.sales || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      }));
      await exportCSV('Relatorio_Produtos', rows);
      return;
    }
    if (activeTab === 'financial') {
      // Calcula resumo financeiro por data de vencimento a partir dos pedidos
      const orders = await ordersService.getAll();
      const map: Record<string, { count: number; total: number; paid: number; overdue: number }> = {};
      const inRange = (due: string) => due >= dateRange.startDate && due <= dateRange.endDate;
      for (const o of orders || []) {
        const insts: any[] = Array.isArray(o?.installment_details) ? o.installment_details : [];
        if (insts.length === 0) {
          // fallback: trata pedido como 1 parcela
          const due = String(o?.due_date || o?.createdAt || o?.date || '').slice(0, 10);
          if (!due || !inRange(due)) continue;
          const amount = Number(o?.total || 0) || 0;
          const paid = Number(o?.paid_amount || 0) || 0;
          const overdue = (String(o?.status || '').toLowerCase() === 'overdue' || due < dateRange.startDate) ? Math.max(0, amount - paid) : 0;
          if (!map[due]) map[due] = { count: 0, total: 0, paid: 0, overdue: 0 };
          map[due].count += 1; map[due].total += amount; map[due].paid += paid; map[due].overdue += overdue;
          continue;
        }
        for (const i of insts) {
          const due = String(i?.due_date || '').slice(0, 10);
          if (!due || !inRange(due)) continue;
          const amount = Number(i?.amount || 0) || 0;
          const paid = Number(i?.paid_amount || 0) || 0;
          const status = String(i?.status || '').toLowerCase();
          const overdue = status === 'overdue' || due < dateRange.startDate ? Math.max(0, amount - paid) : 0;
          if (!map[due]) map[due] = { count: 0, total: 0, paid: 0, overdue: 0 };
          map[due].count += 1; map[due].total += amount; map[due].paid += paid; map[due].overdue += overdue;
        }
      }
      const rows = Object.entries(map)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({
          data: date,
          parcelas: v.count,
          valor: v.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          pago: v.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          atraso: v.overdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        }));
      await exportCSV('Relatorio_Financeiro', rows);
      return;
    }
    // default fallthrough for tabs em desenvolvimento
    await exportPDFOfContainer(`Relatorio_${activeTab}`);
  }

  async function generateReport(reportName: string, format: string) {
    // Map quick actions to concrete exports (not changing active tab visually)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Reuse top-level formatDate to ensure consistent local formatting

    if (reportName === 'Vendas do Mês') {
      if (format === 'PDF') {
        // Gera PDF rico de Vendas diretamente (sem depender da aba ativa)
        const startStr = formatDate(startOfMonth);
        const endStr = formatDate(now);
        const data = await dashboardService.getSalesReport(startStr, endStr);
        const series: SalesSeries = (Array.isArray(data) ? data : []).map((d: any) => ({
          date: String(d._id || d.date || ''),
          sales: Number(d.sales || 0),
          orders: Number(d.orders || 0),
        }));
        // Agrega pagamentos por dia a partir dos pedidos
        const allOrders = await ordersService.getAll();
        const start = new Date(startStr + 'T00:00:00');
        const end = new Date(endStr + 'T23:59:59');
        const map: DailyPayments = {} as DailyPayments;
        const list = Array.isArray(allOrders) ? allOrders : [];
        const ordersInRange = [] as any[];
        for (const o of list) {
          const d = new Date(String(o?.createdAt || o?.created_at || o?.date || ''));
          if (!(d instanceof Date) || isNaN(d.getTime()) || d < start || d > end) continue;
          ordersInRange.push(o);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${day}`;
          const amount = Number(o?.total || o?.valor_total || 0) || 0;
          const raw = String(o?.payment_method || o?.paymentMethod || '').trim();
          const method = raw || 'Indefinido';
          if (!map[key]) map[key] = { total: 0, methods: {} } as any;
          map[key].total += amount;
          if (!map[key].methods[method]) map[key].methods[method] = { amount: 0, count: 0 } as any;
          map[key].methods[method].amount += amount;
          map[key].methods[method].count += 1;
        }
        await generateSalesReportPDF({ startDate: startStr, endDate: endStr }, series, map, ordersInRange);
      } else {
        const data = await dashboardService.getSalesReport(formatDate(startOfMonth), formatDate(now));
        const rows = (Array.isArray(data) ? data : []).map((d: any) => ({
          data: String(d._id || d.date || ''),
          vendas: Number(d.sales || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          pedidos: Number(d.orders || 0),
        }));
        await exportCSV('Relatorio_Vendas', rows);
      }
      return;
    }
    if (reportName === 'Clientes Ativos') {
      // Clientes com pedidos nos últimos 30 dias
      const start30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      const startStr = formatDate(start30);
      const endStr = formatDate(now);
      if (format === 'PDF') {
        // Gera PDF da aba de Vendas com o período, sem perder o período escolhido pelo usuário
        await withTemporaryState(
          { tab: 'sales', range: { startDate: startStr, endDate: endStr } },
          async () => {
            await exportCurrentReport('PDF');
          }
        );
      } else {
        // Calcula clientes ativos a partir de pedidos
        const orders = await ordersService.getAll();
        const toDate = (o: any) => new Date(o?.createdAt || o?.created_at || o?.date || 0);
        const inRange = (d: Date) => d >= new Date(startStr + 'T00:00:00') && d <= new Date(endStr + 'T23:59:59');
        const map: Record<string, { cliente: string; pedidos: number; total: number }> = {};
        for (const o of orders || []) {
          const d = toDate(o);
          if (!(d instanceof Date) || isNaN(d.getTime()) || !inRange(d)) continue;
          const name = o?.customer?.name || o?.customer_name || o?.nome_cliente || o?.customer || '—';
          const key = String(name || '—');
          const total = Number(o?.total || 0);
          if (!map[key]) map[key] = { cliente: key, pedidos: 0, total: 0 };
          map[key].pedidos += 1;
          map[key].total += isFinite(total) ? total : 0;
        }
        const rows = Object.values(map)
          .sort((a, b) => b.total - a.total)
          .map((r) => ({
            cliente: r.cliente,
            pedidos: r.pedidos,
            total: r.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          }));
        await exportCSV('Relatorio_Clientes_Ativos', rows);
      }
      return;
    }
    if (reportName === 'Produtos em Baixa') {
      // Produtos com estoque abaixo do mínimo
      if (format === 'PDF') {
        // Gera PDF de Produtos diretamente (usando relatório de produtos do período atual)
        const data = await dashboardService.getProductsReport(dateRange.startDate, dateRange.endDate);
        const topProducts = Array.isArray(data?.topProducts) ? data.topProducts : [];
        const byDay = Array.isArray(data?.byDay) ? data.byDay : [];
        const mapped = {
          topProducts: topProducts.map((p: any) => ({
            product_id: String(p?.product_id || p?.id || ''),
            name: String(p?.name || p?.nome || '—'),
            code: String(p?.code || p?.codigo || '—'),
            quantity: Number(p?.quantity || 0),
            sales: Number(p?.sales || 0),
          })),
          byDay: byDay.map((d: any) => ({
            date: String(d?._id || d?.date || ''),
            items: Number(d?.items || 0),
            sales: Number(d?.sales || 0),
          })),
        };
        await generateProductsReportPDF({ startDate: dateRange.startDate, endDate: dateRange.endDate }, mapped);
      } else {
        const products = await productsService.getAll();
        const low = (products || []).filter((p: any) => Number(p?.stock ?? p?.estoque ?? 0) < Number(p?.min_stock ?? p?.estoque_minimo ?? Infinity));
        const rows = low.map((p: any) => ({
          codigo: String(p?.code || p?.codigo || ''),
          nome: String(p?.name || p?.nome || ''),
          estoque: Number(p?.stock ?? p?.estoque ?? 0),
          minimo: Number(p?.min_stock ?? p?.estoque_minimo ?? 0),
          status: String(p?.stockStatus || (Number(p?.stock ?? 0) < Number(p?.min_stock ?? 0) ? 'BAIXO' : 'OK')),
        }));
        await exportCSV('Relatorio_Produtos_em_Baixa', rows);
      }
      return;
    }
    if (reportName === 'Relatório de Parcelas') {
      if (format === 'PDF') {
        // Respeita seleção atual do FinancialReport (status + período)
        await withTemporaryState({ tab: 'financial' }, async () => {
          await waitForRender();
          await waitForReportReady();
          const orders = await ordersService.getAll();
          const el = containerRef.current?.querySelector('[data-selected-statuses]') as HTMLElement | null;
          const statusesStr = (el?.getAttribute('data-selected-statuses') || '').trim();
          let statuses = statusesStr ? statusesStr.split(',').map((s) => s.trim()).filter(Boolean) : [];
          if (statuses.some((s) => s.toLowerCase() === 'todos')) {
            statuses = [];
          }
          const labelMap: Record<string, string> = { paid: 'Pago', overdue: 'Vencido', pending: 'Pendente', partial: 'Parcial' };
          const statusLabel = statuses.length ? statuses.map((s) => labelMap[s] || s).join(', ') : 'Todos';
          await generateFinancialInstallmentsPDF(
            { startDate: dateRange.startDate, endDate: dateRange.endDate },
            orders || [],
            statuses as any,
            {
              title: 'Relatório de Parcelas',
              subtitle: `Período: ${dateRange.startDate} até ${dateRange.endDate} • Status: ${statusLabel}`,
              filenamePrefix: 'Relatorio_Parcelas'
            }
          );
        });
      } else {
        // Mantém exportação CSV como antes, se algum dia format vier diferente
        const todayStr = formatDate(now);
        const orders = await ordersService.getAll();
        const rows: Array<Record<string, any>> = [];
        for (const o of orders || []) {
          const custName = o?.customer?.name || o?.customer_name || o?.nome_cliente || o?.customer || '—';
          const orderNum = o?.order_number || o?.id || '—';
          const insts: any[] = Array.isArray(o?.installment_details) ? o.installment_details : [];
          for (const i of insts) {
            const amount = Number(i?.amount || 0) || 0;
            const paid = Number(i?.paid_amount || 0) || 0;
            const due = String(i?.due_date || '');
            const status = String(i?.status || '');
            const unpaid = Math.max(0, amount - paid);
            if (!due || unpaid <= 0) continue;
            const isOverdue = status === 'overdue' || due < todayStr;
            if (!isOverdue) continue;
            const dDue = new Date(due + 'T00:00:00');
            const dNow = new Date(todayStr + 'T00:00:00');
            const daysLate = Math.max(0, Math.round((dNow.getTime() - dDue.getTime()) / (24 * 60 * 60 * 1000)));
            rows.push({
              cliente: String(custName),
              pedido: String(orderNum),
              parcela: Number(i?.number || 0),
              vencimento: due,
              dias_atraso: daysLate,
              valor: amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              pago: paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              em_aberto: unpaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              forma_pagamento: String(i?.payment_method || o?.payment_method || ''),
            });
          }
        }
        rows.sort((a: any, b: any) => b.dias_atraso - a.dias_atraso);
        await exportCSV('Relatorio_Parcelas', rows);
      }
      return;
    }
  }

  return (
    <div className="space-y-2">

      {/* Date Range Filter */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Período:
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Report Type Tabs */}
      <Card>
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex space-x-8 overflow-x-auto">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === type.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Content */}
        <div ref={containerRef} className="min-h-[400px]">
          {activeTab === 'sales' && <SalesReport dateRange={dateRange} />}
          {activeTab === 'customers' && <CustomersReport dateRange={dateRange} />}
          {activeTab === 'products' && (
            <ProductsReport startDate={dateRange.startDate} endDate={dateRange.endDate} />
          )}
          {activeTab === 'financial' && (
            <FinancialReport startDate={dateRange.startDate} endDate={dateRange.endDate} />
          )}
        </div>
      </Card>

      {/* Quick Reports */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Relatórios Rápidos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickReports.map((report, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {report.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {report.description}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded">
                    {report.format}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Download}
                    onClick={() => generateReport(report.name, report.format)}
                  >
                    Gerar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Reports;