import jsPDF from 'jspdf';

// Parse numbers that may arrive as BR-formatted strings like "1.234,56" or "R$ 12,34"
const parseNum = (v: any): number => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  // Remove currency and other symbols, keep digits, comma, dot, sign
  const cleaned = s.replace(/[^0-9,.-]/g, '');
  // If it has a comma (decimal in BR), drop thousands dots and swap comma to dot
  if (cleaned.includes(',')) {
    const noThousands = cleaned.replace(/\./g, '');
    const normalized = noThousands.replace(',', '.');
    const n = Number(normalized);
    return isNaN(n) ? 0 : n;
  }
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
};

// Short date formatter: from YYYY-MM-DD to DD-MM-YY when applicable
const fmtDateShort = (iso: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y.slice(2)}`;
  }
  return iso;
};

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Generic Financial Installments PDF generator with period and status filters
export type InstallmentStatus = 'paid' | 'pending' | 'overdue' | 'partial' | string;
export async function generateFinancialInstallmentsPDF(
  range: DateRange,
  orders: any[],
  statuses: InstallmentStatus[],
  opts?: { title?: string; subtitle?: string; filenamePrefix?: string }
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const marginY = 12;

  const fmtBRL = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);

  const title = opts?.title ?? 'Relatório de Parcelas';

  // Header (centralizado)
  const fmtDateBR = (iso: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-');
      return `${d}-${m}-${y}`;
    }
    return iso;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, pageWidth / 2, marginY, { align: 'center' });

  // Subtítulo será desenhado após normalizar os statuses

  // Rows filtered by due_date within range and by statuses
  const inRange = (due: string) => due >= range.startDate && due <= range.endDate;
  // Normalize incoming statuses (support PT/EN and synonyms); treat 'todos/todas/all' as no filter
  const normStatus = (s: string) => {
    const t = String(s || '').trim().toLowerCase();
    if (!t) return '';
    if (t === 'pago' || t === 'paid') return 'paid';
    if (t === 'vencido' || t === 'atrasado' || t === 'overdue') return 'overdue';
    if (t === 'pendente' || t === 'aberto' || t === 'pending' || t === 'open') return 'pending';
    if (t === 'parcial' || t === 'partial' || t === 'partially_paid') return 'partial';
    if (t === 'todos' || t === 'todas' || t === 'all') return '__all__';
    return t;
  };
  const normalized = (statuses || []).map(normStatus);
  const hasAll = normalized.includes('__all__');
  const want = new Set(normalized.filter((s) => s && s !== '__all__'));
  const acceptAll = hasAll || want.size === 0;

  // Subtítulo centralizado: Período (DD-MM-AAAA) + Status selecionado(s)
  const statusLabelPT = (s: string) => ({ paid: 'Pago', pending: 'Pendente', overdue: 'Vencido', partial: 'Parcial' } as Record<string, string>)[s] || s;
  const chosenStatuses = acceptAll ? 'Todos' : Array.from(want).map(statusLabelPT).join(', ');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Período: ${fmtDateBR(range.startDate)} até ${fmtDateBR(range.endDate)} • Status: ${chosenStatuses}`,
           pageWidth / 2, marginY + 6, { align: 'center' });
  const todayIso = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const rows: string[][] = [];
  let totValor = 0, totPago = 0, totAberto = 0, count = 0;
  const byStatus: Record<string, { count: number; amount: number; open: number }> = {};
  // Aggregation for chart keyed by ISO due date (YYYY-MM-DD)
  const agg: Record<string, { total: number; paid: number; overdue: number }> = {};
  for (const o of (orders || [])) {
    const custName = o?.customer?.name || o?.customer_name || o?.nome_cliente || o?.customer || '—';
    const orderNum = o?.order_number || o?.id || '—';
    const insts: any[] = Array.isArray(o?.installment_details) ? o.installment_details : [];
    const totalInst = insts.length || 0;
    const processOne = (inst: any, idx: number, totalForFmt: number) => {
      const due = String(inst?.due_date || '').slice(0, 10);
      if (!due || !inRange(due)) return;
      const amount = Number(inst?.amount || 0) || 0;
      const paid = Number(inst?.paid_amount || 0) || 0;
      const unpaid = Math.max(0, amount - paid);
      // Derive robust status
      let derived: InstallmentStatus = 'pending';
      if (amount <= 0 && paid <= 0) {
        derived = 'pending';
      } else if (paid >= amount && amount > 0) {
        derived = 'paid';
      } else if (paid > 0 && paid < amount) {
        derived = 'partial';
      } else {
        derived = 'pending';
      }
      if (unpaid > 0 && due < todayIso) {
        derived = 'overdue';
      }
      const status = String(inst?.status || '').toLowerCase();
      const finalStatus = ((): string => {
        if (!status || !['paid', 'pending', 'overdue', 'partial'].includes(status)) return String(derived);
        if (derived === 'overdue') return 'overdue';
        return status;
      })();
      if (!acceptAll && !want.has(finalStatus)) return;
      const statusLabel = ({ paid: 'Pago', pending: 'Pendente', overdue: 'Vencido', partial: 'Parcial' } as Record<string, string>)[finalStatus] || finalStatus;
      const instNum = Number(inst?.number || idx || 0) || 0;
      const parcelaFmt = totalForFmt > 0 ? `${instNum}/${totalForFmt}` : String(instNum);
      const dueFmt = ((): string => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
          const [y, m, d] = due.split('-');
          return `${d}-${m}-${y.slice(2)}`;
        }
        return due;
      })();
      // Reordered: bring Valor (R$) left (before Status) per request
      rows.push([
        String(orderNum),
        String(custName),
        parcelaFmt,
        dueFmt,
        fmtBRL(amount),       // Valor (R$)
        fmtBRL(paid),         // Pago
        fmtBRL(unpaid),       // Aberto
        statusLabel,          // Status (moved to the end)
      ]);
      totValor += amount; totPago += paid; totAberto += unpaid; count += 1;
      if (!byStatus[finalStatus]) byStatus[finalStatus] = { count: 0, amount: 0, open: 0 };
      byStatus[finalStatus].count += 1;
      byStatus[finalStatus].amount += amount;
      byStatus[finalStatus].open += unpaid;
      // Aggregate for chart using ISO due date
      if (!agg[due]) agg[due] = { total: 0, paid: 0, overdue: 0 };
      agg[due].total += amount;
      agg[due].paid += paid;
      if (unpaid > 0 && due < todayIso) agg[due].overdue += unpaid;
    };

    if (totalInst === 0) {
      // Fallback: treat the order itself as a single installment if no details exist
      const fallback = {
        due_date: String(o?.due_date || o?.createdAt || o?.date || '').slice(0, 10),
        amount: Number(o?.total || o?.valor_total || 0) || 0,
        paid_amount: Number(o?.paid_amount || 0) || 0,
        status: String(o?.status || ''),
        number: 1,
      };
      processOne(fallback, 1, 1);
    } else {
      let idx = 0;
      for (const i of insts) {
        idx += 1;
        processOne(i, idx, totalInst);
      }
    }
  }

  // Sort by due date asc
  const ddmmaaToIso = (s: string) => {
    // Supports DD-MM-AA and DD-MM-AAAA
    const m = s.match(/^(\d{2})-(\d{2})-(\d{2,4})$/);
    if (!m) return s;
    const [_, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y; // assume 20xx for two-digit years
    return `${yy}-${mo}-${d}`;
  };
  rows.sort((a, b) => ddmmaaToIso(a[3]).localeCompare(ddmmaaToIso(b[3])));

  // Top area: somente gráfico agrupado (sem painel à esquerda)
  const chartY = marginY + 16; // y inicial da faixa superior
  const totalW = pageWidth - marginX * 2;

  // (Resumo do Período removido)

  // Gráfico agrupado (metade direita): Valores por Data de Vencimento (Total, Pago, Atraso)
  const drawGroupedBarChart = (
    x: number,
    y: number,
    w: number,
    h: number,
    series: { name: string; color: [number, number, number]; values: number[] }[],
    labels: string[],
    title: string
  ) => {
    // título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, x, y - 3);

    // dar mais espaço entre título e gráfico
    const yBase = y + 10;

    // eixos
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(x, yBase, x, yBase + h);
    doc.line(x, yBase + h, x + w, yBase + h);

    const count = Math.max(1, labels.length);
    const allVals = series.flatMap(s => s.values);
    const maxVal = Math.max(1, ...allVals.map((v) => Math.max(0, Number(v || 0))));
    const groupPad = Math.max(2, w / (count * 12));
    const barPad = 1.5;
    const groupW = Math.max(8, (w - groupPad * (count + 1)) / count);
    const barW = Math.max(2.5, Math.min(6, (groupW - barPad * (series.length + 1)) / series.length));

    // Track placed label boxes per group to avoid overlaps
    const placed: { x: number; y: number; w: number; h: number }[][] = Array.from({ length: count }, () => []);
    for (let i = 0; i < count; i++) {
      const gx = x + groupPad + i * (groupW + groupPad);
      for (let s = 0; s < series.length; s++) {
        const v = Math.max(0, Number(series[s].values[i] || 0));
        const bh = (v / maxVal) * (h - 6);
        const bx = gx + barPad + s * (barW + barPad);
        const by = yBase + h - bh;
        const [r, g, b] = series[s].color;
        doc.setFillColor(r, g, b);
        doc.rect(bx, by, barW, bh, 'F');
        // Rótulo de valor na ponta da "vela" (topo da barra) para todas as séries,
        // com deslocamentos para evitar sobreposição
        if (v > 0) {
          // offsets maiores e fundo branco para minimizar sobreposição visual
          const seriesOffset = [-barW * 1.7, 0, barW * 1.7];
          const cx = bx + barW / 2 + (seriesOffset[s] ?? 0);
          const ty = by - 3.5 - s * 3.5; // mais escalonado verticalmente
          doc.setFont('helvetica', 'normal');
          const prevSize = (doc as any).getFontSize ? (doc as any).getFontSize() : 8;
          doc.setFontSize(5.6);
          const txt = fmtBRL(v);
          // Se a barra for muito baixa, posiciona um pouco acima do eixo para manter legibilidade
          const minTy = yBase + h + 2;
          const finalTy = bh >= 16 ? ty : Math.min(minTy, ty + s * 3.5);
          // alinhamento por série (esquerda/centro/direita)
          const align: 'left' | 'center' | 'right' = s === 0 ? 'right' : (s === 1 ? 'center' : 'left');
          // fundo branco atrás do rótulo com base no alinhamento
          const tw = doc.getTextWidth(txt);
          const pad = 0.9;
          doc.setFillColor(255, 255, 255);
          let rectX = cx - (tw / 2 + pad);
          if (align === 'right') rectX = cx - (tw + pad * 2);
          if (align === 'left') rectX = cx - pad;
          let labelY = finalTy;
          let boxY = labelY - 3.0;
          const boxH = 4.4;
          const boxW = tw + pad * 2;
          const intersects = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
            !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
          // Shift up until it no longer overlaps others in this group
          while (placed[i].some(b => intersects({ x: rectX, y: boxY, w: boxW, h: boxH }, b))) {
            labelY -= 2.6;
            boxY -= 2.6;
          }
          doc.rect(rectX, boxY, boxW, boxH, 'F');
          // texto
          doc.setTextColor(0, 0, 0);
          doc.text(txt, cx, labelY, { align });
          // save placed box
          placed[i].push({ x: rectX, y: boxY, w: boxW, h: boxH });
          doc.setFontSize(prevSize);
        }
      }
    }

    // labels do eixo X (modo denso: mostra todas as datas, com fonte menor e rótulos alternados)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    const maxW = 18;
    for (let i = 0; i < count; i++) {
      const label = labels[i] || '';
      const gx = x + groupPad + i * (groupW + groupPad) + groupW / 2;
      const ly = yBase + h + (i % 2 === 0 ? 9 : 12); // alterna para reduzir colisões
      let text = label;
      while (doc.getTextWidth(text) > maxW && text.length > 0) text = text.slice(0, -1);
      if (text !== label) text = text.replace(/\s+$/, '') + '…';
      // tick
      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.line(gx, yBase + h, gx, yBase + h + 1.8);
      // rótulo rotacionado (mais inclinado para caber)
      doc.text(text, gx, ly, { align: 'center', angle: 60 });
    }

    // legenda
    const legendY = yBase + h + 26; // mais espaço por conta dos rótulos densos
    let lx = x;
    doc.setFontSize(8);
    for (const s of series) {
      doc.setFillColor(...s.color);
      doc.rect(lx, legendY - 3.5, 6, 3, 'F');
      doc.text(s.name, lx + 8, legendY, { baseline: 'bottom' } as any);
      lx += doc.getTextWidth(s.name) + 18;
    }
  };

  // Preparar dados por data de vencimento (já agregados em 'agg' com chaves ISO)
  const datesSorted = Object.keys(agg).sort();
  const labelsMini = datesSorted.map(d => `${d.slice(8,10)}/${d.slice(5,7)}`);
  const sTotal = datesSorted.map(d => agg[d].total);
  const sPaid = datesSorted.map(d => agg[d].paid);
  const sOver = datesSorted.map(d => agg[d].overdue);
  const series = [
    { name: 'Total', color: [59, 130, 246] as [number, number, number], values: sTotal },
    { name: 'Pago', color: [16, 185, 129] as [number, number, number], values: sPaid },
    { name: 'Atraso', color: [239, 68, 68] as [number, number, number], values: sOver },
  ];
  // Posição do gráfico: largura total útil, abaixo do cabeçalho
  const chartX = marginX;
  const chartInnerY = chartY + 12; // mais espaço abaixo do título
  const chartW = totalW;
  const chartH = 44;
  drawGroupedBarChart(chartX, chartInnerY, chartW, chartH, series, labelsMini, 'Valores por Data de Vencimento (R$)');

  // Legenda do gráfico fica abaixo do gráfico (dentro da função usa y + h + 22)
  const legendBaselineY = chartInnerY + chartH + 22;
  const legendBottomY = legendBaselineY + 6;
  // Início da tabela: após a legenda do gráfico
  const tableStartY = legendBottomY + 16;
  // divider line before detailed table (like SalesReport)
  doc.setDrawColor(200);
  doc.line(marginX, tableStartY - 6, pageWidth - marginX, tableStartY - 6);

  // Detailed table
  // Headers reordered to match rows: Valor moved left; Status moved to the last column
  const headers = ['Pedido', 'Cliente', 'Parcela', 'Vencimento', 'Valor (R$)', 'Pago', 'Aberto', 'Status'];
  drawTable(doc, {
    x: marginX,
    y: tableStartY,
    pageWidth,
    pageHeight,
    marginX,
    marginY,
    headers,
    rows,
    // Larguras ajustadas: mais espaço para colunas monetárias
    colWidths: [0.12, 0.20, 0.08, 0.12, 0.16, 0.12, 0.10, 0.10],
    headerFontSize: 9,
  });

  // Footer
  const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
  const genAt = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const ts = `${two(genAt.getDate())}/${two(genAt.getMonth() + 1)}/${genAt.getFullYear()} ${two(genAt.getHours())}:${two(genAt.getMinutes())}`;
  for (let i = 1; i <= pageCount; i++) {
    if ((doc as any).setPage) (doc as any).setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(`Gerado em ${ts} — Página ${i}/${pageCount}`, pageWidth - 12, pageHeight - 6, { align: 'right' });
  }

  const prefix = opts?.filenamePrefix ?? 'Relatorio_Financeiro_Parcelas';
  doc.save(`${prefix}_${range.startDate}_a_${range.endDate}.pdf`);
}

export type SalesSeries = Array<{ date: string; sales: number; orders?: number }>;
export type DailyPayments = Record<string, { total: number; methods: Record<string, { amount: number; count: number }> }>;
export type CustomersSeries = Array<{ date: string; newCustomers: number }>;

// Draws a simple table with auto pagination
function drawTable(doc: jsPDF, opts: {
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
  marginX: number;
  marginY: number;
  headers: string[];
  rows: string[][];
  colWidths?: number[]; // optional fractions that sum to 1 (e.g., [0.6,0.2,0.2])
  headerFontSize?: number; // optional header font size
}) {
  const { x, marginX, marginY, pageWidth, pageHeight } = opts;
  let y = opts.y;
  const colCount = Math.max(1, opts.headers.length);
  const availableW = pageWidth - marginX * 2;
  const widths: number[] = (() => {
    if (opts.colWidths && opts.colWidths.length === colCount) {
      const sum = opts.colWidths.reduce((a, b) => a + b, 0);
      // treat as fractions if sum <= 1.01
      if (sum <= 1.01) return opts.colWidths.map((f) => f * availableW);
      return opts.colWidths.slice();
    }
    // default equal widths
    return Array(colCount).fill(availableW / colCount);
  })();
  const xOffsets: number[] = widths.reduce<number[]>((acc, _unused, i) => {
    acc.push(i === 0 ? x : acc[i - 1] + widths[i - 1]);
    return acc;
  }, []);
  const lineH = 7;

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(opts.headerFontSize ?? 9);
    for (let i = 0; i < colCount; i++) {
      const cx = xOffsets[i];
      const colWidth = widths[i];
      const header = opts.headers[i] || '';
      // Centraliza para colunas textuais principais e também Valor/Pago/Aberto/Vendas/Frete
      const isCenter = /(pedido|cliente|parcela|vencimento|status|quantidade|c[oó]digo|participa[cç][aã]o|data|itens)/i.test(header);
      const isMoneyCenter = /(valor|pago|aberto|vendas|frete)/i.test(header);
      const isRight = /(r\$)/i.test(header) && !isMoneyCenter;
      if (isCenter || isMoneyCenter) {
        doc.text(header, cx + colWidth / 2, y, { align: 'center' });
      } else if (isRight) {
        doc.text(header, cx + colWidth - 2, y, { align: 'right' });
      } else {
        doc.text(header, cx + 2, y);
      }
    }
    y += 2;
    doc.setDrawColor(200);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
  };

  drawHeader();

  // Fonte menor para o corpo
  const bodyFontSize = 8;
  doc.setFontSize(bodyFontSize);
  for (const row of opts.rows) {
    // Estilo para linha TOTAL
    const isTotalRow = String(row[0] || '').toUpperCase() === 'TOTAL';
    if (isTotalRow) {
      doc.setDrawColor(200);
      doc.line(marginX, y, pageWidth - marginX, y); // separador acima do TOTAL
      doc.setFont('helvetica', 'bold');
    }
    if (y + lineH > pageHeight - marginY) {
      doc.addPage();
      y = marginY;
      drawHeader();
    }
    for (let i = 0; i < colCount; i++) {
      const cx = xOffsets[i];
      const colWidth = widths[i];
      const cell = String(row[i] ?? '');
      const maxW = colWidth - 4;
      const ellipsis = '…';
      let text = cell;
      // Primeiro, tenta ajustar fonte para valores numéricos/moeda
      const rawWidth = doc.getTextWidth(text);
      const isCurrency = /^\s*R\$\s*/.test(cell);
      const isNumber = /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(cell);
      const isNumeric = isCurrency || isNumber;
      let scaled = false;
      if (isNumeric && rawWidth > maxW) {
        const factor = Math.min(1, (maxW - 0.5) / rawWidth);
        const newSize = Math.max(6, Math.min(bodyFontSize, bodyFontSize * factor));
        if (newSize < bodyFontSize) {
          doc.setFontSize(newSize);
          scaled = true;
        }
      }
      // Se ainda estourar, aplica reticências (principalmente para textos)
      while (doc.getTextWidth(text) > maxW && text.length > 0) {
        text = text.slice(0, -1);
      }
      if (text !== cell) text = text.replace(/\s+$/, '') + ellipsis;
      const header = opts.headers[i] || '';
      const isCenterCol = /(pedido|cliente|parcela|vencimento|status|quantidade|c[oó]digo|participa[cç][aã]o|data|itens)/i.test(header);
      const isMoneyCenterCol = /(valor|pago|aberto|vendas|frete)/i.test(header);
      if (isCenterCol || isMoneyCenterCol) {
        doc.text(text, cx + colWidth / 2, y + 4, { align: 'center' });
      } else if (isNumeric) {
        doc.text(text, cx + colWidth - 2, y + 4, { align: 'right' });
      } else {
        doc.text(text, cx + 2, y + 4);
      }
      // Restaura tamanho base após escrita
      if (scaled) {
        doc.setFontSize(bodyFontSize);
      }
    }
    y += lineH;
    if (isTotalRow) {
      doc.setFont('helvetica', 'normal'); // volta ao normal após TOTAL
    }
  }
}

export async function generateSalesReportPDF(
  range: DateRange,
  series: SalesSeries,
  dailyPayments?: DailyPayments,
  ordersInRange?: any[]
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const marginY = 12;

  const fmtBRL = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Relatório de Vendas', marginX, marginY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  // Removido: período e totais no cabeçalho para evitar duplicação com o painel à direita

  // Totais (usados no painel à direita e nas tabelas)
  const totalSales = (series || []).reduce((a: number, b) => a + (Number(b.sales) || 0), 0);
  const totalOrders = (series || []).reduce((a: number, b) => a + (Number(b.orders) || 0), 0);

  // Linha superior: gráfico (esquerda) + painel de informações (direita)
  const bars = Array.isArray(series) ? series : [];
  const chartY = marginY + 16; // sobe um pouco devido à remoção das linhas do cabeçalho
  const chartH = 36; // altura mais compacta
  const gap = 8;
  const halfW = (pageWidth - marginX * 2 - gap) / 2;

  const drawMiniBarChart = (
    x: number,
    y: number,
    w: number,
    h: number,
    values: number[],
    labels: string[],
    color: [number, number, number],
    title: string
  ) => {
    // título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, x, y - 3);

    // eixos
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(x, y, x, y + h);
    doc.line(x, y + h, x + w, y + h);

    const maxVal = Math.max(1, ...values.map((v) => Math.max(0, Number(v || 0))));
    const count = Math.max(1, values.length);
    // padding dinâmico: cresce levemente com menos barras e encolhe com mais barras
    const pad = Math.max(1.5, Math.min(3, w / (count * 8)));
    // largura da barra limitada para não colar (bom até ~30 barras)
    const barW = Math.max(1.2, Math.min(5, (w - pad * (count + 1)) / count));
    doc.setFillColor(...color);

    // barras
    for (let i = 0; i < count; i++) {
      const v = Math.max(0, Number(values[i] || 0));
      const bh = (v / maxVal) * (h - 4);
      const bx = x + pad + i * (barW + pad);
      const by = y + h - bh;
      doc.rect(bx, by, barW, bh, 'F');
    }

    // labels de valor em cada barra (R$ + pedidos)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(20);
    for (let i = 0; i < count; i++) {
      const v = Math.max(0, Number(values[i] || 0));
      const bh = (v / maxVal) * (h - 4);
      const cx = x + pad + i * (barW + pad) + barW / 2;
      const topY = y + h - bh - 2;
      const orders = (typeof (labels as any)._orders !== 'undefined' && Array.isArray((labels as any)._orders)) ? (labels as any)._orders[i] : undefined;
      const ord = Number(orders || 0);
      const ordTxt = ord === 1 ? '1 pedido' : `${ord} pedidos`;
      const text = `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} • ${ordTxt}`;
      // se a barra for muito baixa, posiciona um pouco acima do eixo
      const minY = y + h + 2; // abaixo do eixo se necessário
      const ty = bh >= 10 ? topY : Math.min(minY, topY);
      doc.text(text, cx, ty, { align: 'center' });
    }

    // labels do eixo X espaçados (rotacionados para evitar sobreposição)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const maxLabels = Math.floor(w / 26);
    const step = Math.max(1, Math.ceil(count / Math.max(1, maxLabels)));
    for (let i = 0; i < count; i += step) {
      const lx = x + pad + i * (barW + pad) + barW / 2;
      const ly = y + h + 10; // mais afastado das barras
      const label = labels[i] || '';
      const maxW = 18;
      let text = label;
      while (doc.getTextWidth(text) > maxW && text.length > 0) text = text.slice(0, -1);
      if (text !== label) text = text.replace(/\s+$/, '') + '…';
      doc.text(text, lx, ly, { align: 'center', angle: 35 });
    }
  };

  const salesValues = bars.map((b) => Number(b.sales || 0));
  const labels = bars.map((b) => fmtDateShort(String(b.date || '')));
  // anexar array de pedidos para usar nos labels das barras
  (labels as any)._orders = bars.map((b) => Number(b.orders || 0));

  // Gráfico (metade esquerda)
  // Painel de informações (metade esquerda)
  const panelX = marginX;
  const panelY = chartY;
  const panelW = halfW;
  const panelH = chartH;

  // Moldura do painel
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 245);
  doc.rect(panelX, panelY, panelW, panelH, 'FD');

  // Conteúdo do painel
  const panelPad = 4;
  let py = panelY + panelPad + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resumo do Período', panelX + panelPad, py);
  py += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  // Período
  doc.text('Período:', panelX + panelPad, py);
  doc.text(`${fmtDateShort(range.startDate)} a ${fmtDateShort(range.endDate)}`, panelX + panelW - panelPad, py, { align: 'right' });
  py += 6;
  // Total vendido
  doc.text('Total vendido:', panelX + panelPad, py);
  doc.text(fmtBRL(totalSales), panelX + panelW - panelPad, py, { align: 'right' });
  py += 6;
  // Total de pedidos
  doc.text('Total de pedidos:', panelX + panelPad, py);
  doc.text(String(totalOrders), panelX + panelW - panelPad, py, { align: 'right' });

  // Gráfico (metade direita)
  const rightX = marginX + halfW + gap;
  drawMiniBarChart(rightX, chartY, halfW, chartH, salesValues, labels, [59, 130, 246], 'Vendas por Dia (R$)');

  const labelExtraSpace = 16; // mais espaço para rótulos inclinados
  const tableStartY = Math.max(chartY + chartH + labelExtraSpace, panelY + panelH) + 10;

  // Resumo por forma de pagamento (período)
  let afterSummaryY: number | null = null;
  if (dailyPayments && Object.keys(dailyPayments).length > 0) {
    const summary: Record<string, { amount: number; count: number }> = {};
    for (const day of Object.keys(dailyPayments)) {
      const methods = dailyPayments[day]?.methods || {};
      for (const name of Object.keys(methods)) {
        const m = methods[name];
        if (!summary[name]) summary[name] = { amount: 0, count: 0 };
        summary[name].amount += Number(m.amount || 0);
        summary[name].count += Number(m.count || 0);
      }
    }
    const headersS = ['Forma de Pagamento', 'Pedidos', 'Valor (R$)'];
    const rowsS = Object.entries(summary)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([name, data]) => [name, String(data.count), fmtBRL(data.amount)]);
    if (rowsS.length) {
      const totCount = rowsS.reduce((s, r) => s + Number(r[1] || 0), 0);
      const totAmt = rowsS.reduce((s, r) => s + (Number(String(r[2]).replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0), 0);
      rowsS.push(['TOTAL', String(totCount), fmtBRL(totAmt)]);
    }

    // posição: logo abaixo do gráfico/painel
    let y = tableStartY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Resumo por Forma de Pagamento (Período)', marginX, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    drawTable(doc, {
      x: marginX,
      y,
      pageWidth,
      pageHeight,
      marginX,
      marginY,
      headers: headersS,
      rows: rowsS,
      colWidths: [0.60, 0.15, 0.25],
    });
    // calcula Y disponível após o resumo, considerando altura aproximada da tabela
    const lineH2 = 7;
    afterSummaryY = y + (rowsS.length + 2) * lineH2 + 10;
  }

  // Se houver detalhamento por forma de pagamento, adiciona uma segunda tabela
  if (dailyPayments && Object.keys(dailyPayments).length > 0) {
    // Calcula Y logo após o resumo (ou logo após o gráfico/painel caso não exista resumo)
    let y = afterSummaryY ?? tableStartY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Detalhe por Forma de Pagamento (por dia)', marginX, y);
    y += 6;
    doc.setFont('helvetica', 'normal');

    const headers2 = ['Data', 'Forma de Pagamento', 'Pedidos', 'Valor (R$)'];
    const sortedDays = Object.keys(dailyPayments).sort();
    const rows2: string[][] = [];
    for (const day of sortedDays) {
      const entry = dailyPayments[day];
      const methods = Object.entries(entry?.methods || {}).sort((a, b) => (b[1].amount - a[1].amount));
      if (methods.length === 0) continue;
      methods.forEach(([name, data], idx) => {
        rows2.push([
          idx === 0 ? fmtDateShort(day) : '',
          String(name),
          String(Number(data.count || 0)),
          fmtBRL(Number(data.amount || 0)),
        ]);
      });
    }
    // TOTAL row for detail table
    if (rows2.length) {
      const totCount = rows2.reduce((s, r) => s + (Number(r[2]) || 0), 0);
      const totAmt = rows2.reduce((s, r) => s + (Number(String(r[3]).replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0), 0);
      rows2.push(['TOTAL', '', String(totCount), fmtBRL(totAmt)]);
    }

    drawTable(doc, {
      x: marginX,
      y,
      pageWidth,
      pageHeight,
      marginX,
      marginY,
      headers: headers2,
      rows: rows2,
      colWidths: [0.20, 0.45, 0.15, 0.20],
    });
  }

  // Tabela de Pedidos (com Frete)
  if (Array.isArray(ordersInRange) && ordersInRange.length > 0) {
    // posição: após as seções anteriores; aproveita o espaço restante na página
    let y = (afterSummaryY ?? tableStartY) + (dailyPayments && Object.keys(dailyPayments).length > 0 ? 70 : 0);
    if (y + 20 > pageHeight - marginY) {
      doc.addPage();
      y = marginY;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Pedidos (com Frete)', marginX, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    // Formatação de data curta
    const fmtDateShort2 = (iso: string) => {
      if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
        const [y, m, d] = iso.slice(0,10).split('-');
        return `${d}-${m}-${y.slice(2)}`;
      }
      return iso;
    };
    const headersO = ['Pedido', 'Cliente', 'Data', 'Valor (R$)', 'Frete (R$)', 'Total (sem frete)'];
    const rowsO: string[][] = [];
    let sumVal = 0, sumFrete = 0, sumNet = 0;
    for (const o of ordersInRange) {
      const orderNum = o?.order_number || o?.id || '—';
      const cust = o?.customer?.name || o?.customer_name || o?.nome_cliente || o?.customer || '—';
      const dtIso = String(o?.createdAt || o?.created_at || o?.date || '').slice(0,10);
      const total = parseNum(o?.total ?? o?.valor_total ?? 0);
      const freight = parseNum(o?.shipping ?? o?.frete ?? 0);
      const net = Math.max(0, total - freight);
      rowsO.push([
        String(orderNum),
        String(cust),
        fmtDateShort2(dtIso),
        fmtBRL(total),
        fmtBRL(freight),
        fmtBRL(net),
      ]);
      sumVal += total; sumFrete += freight; sumNet += net;
    }
    rowsO.push(['TOTAL', '', '', fmtBRL(sumVal), fmtBRL(sumFrete), fmtBRL(sumNet)]);
    drawTable(doc, {
      x: marginX,
      y,
      pageWidth,
      pageHeight,
      marginX,
      marginY,
      headers: headersO,
      rows: rowsO,
      colWidths: [0.14, 0.30, 0.14, 0.14, 0.14, 0.14],
    });
  }

  // Rodapé: número de página e timestamp
  const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
  const genAt = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const ts = `${two(genAt.getDate())}/${two(genAt.getMonth() + 1)}/${genAt.getFullYear()} ${two(genAt.getHours())}:${two(genAt.getMinutes())}`;
  for (let i = 1; i <= pageCount; i++) {
    if ((doc as any).setPage) (doc as any).setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(`Gerado em ${ts} — Página ${i}/${pageCount}`, pageWidth - 12, pageHeight - 6, { align: 'right' });
  }

  doc.save(`Relatorio_Vendas_${range.startDate}_a_${range.endDate}.pdf`);
}

export async function generateCustomersReportPDF(range: DateRange, series: CustomersSeries): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const marginY = 12;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Relatório de Clientes', marginX, marginY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Período: ${range.startDate} até ${range.endDate}`, marginX, marginY + 6);

  const totalNew = (series || []).reduce((a: number, b) => a + (Number(b.newCustomers) || 0), 0);
  doc.text(`Novos clientes no período: ${totalNew}`, marginX, marginY + 12);

  // Simple vector bar chart for new customers per day (left column style)
  const chartX = marginX;
  const chartY = marginY + 22;
  const chartW = pageWidth - marginX * 2;
  const chartH = 60; // compact chart height
  const bars = Array.isArray(series) ? series : [];
  const maxVal = Math.max(1, ...bars.map((b) => Number(b.newCustomers || 0)));
  const barPad = 2;
  const barCount = Math.max(1, bars.length);
  const barW = Math.max(1.5, (chartW - barPad * (barCount + 1)) / barCount);

  // Axes
  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  // Y axis
  doc.line(chartX, chartY, chartX, chartY + chartH);
  // X axis
  doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

  // Bars
  doc.setFillColor(16, 185, 129); // emerald-500 like
  bars.forEach((b, i) => {
    const v = Math.max(0, Number(b.newCustomers || 0));
    const h = (v / maxVal) * (chartH - 4);
    const x = chartX + barPad + i * (barW + barPad);
    const y = chartY + chartH - h;
    doc.rect(x, y, barW, h, 'F');
  });

  // Value labels (only for small counts)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0);
  bars.forEach((b, i) => {
    const v = Math.max(0, Number(b.newCustomers || 0));
    const h = (v / maxVal) * (chartH - 4);
    const x = chartX + barPad + i * (barW + barPad) + barW / 2;
    const y = chartY + chartH - h - 1.5;
    if (h >= 6) {
      doc.text(String(v), x, y, { align: 'center' });
    }
  });

  // X labels: show every N to avoid clutter
  const maxLabels = Math.floor(chartW / 24); // ~24mm per label
  const step = Math.max(1, Math.ceil(barCount / Math.max(1, maxLabels)));
  doc.setFontSize(7);
  bars.forEach((b, i) => {
    if (i % step !== 0) return;
    const label = String(b.date || '');
    const x = chartX + barPad + i * (barW + barPad) + barW / 2;
    const y = chartY + chartH + 4;
    // Trim if too long
    const maxW = 20;
    let text = label;
    while (doc.getTextWidth(text) > maxW && text.length > 0) text = text.slice(0, -1);
    if (text !== label) text = text.replace(/\s+$/, '') + '…';
    doc.text(text, x, y, { align: 'center' });
  });

  // Move Y below chart for table
  const tableStartY = chartY + chartH + 10;
  const headers = ['Data', 'Novos Clientes'];
  const rows = (series || []).map((d) => [String(d.date || ''), String(Number(d.newCustomers || 0))]);
  drawTable(doc, {
    x: marginX,
    y: tableStartY,
    pageWidth,
    pageHeight,
    marginX,
    marginY,
    headers,
    rows,
  });

  doc.save(`Relatorio_Clientes_${range.startDate}_a_${range.endDate}.pdf`);
}

// Types for Products report
export type ProductsByDay = Array<{ date: string; items: number; sales: number }>;
export type TopProductEntry = { product_id: string; name?: string; code?: string; quantity: number; sales: number };
export interface ProductsReportData {
  topProducts: TopProductEntry[];
  byDay: ProductsByDay;
}

// Generate Products PDF Report
export async function generateProductsReportPDF(range: DateRange, data: ProductsReportData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const marginY = 12;

  const fmtBRL = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
  // Same header period format used in Financial report (DD-MM-YYYY)
  const fmtDateBR = (iso: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-');
      return `${d}-${m}-${y}`;
    }
    return iso;
  };

  // Header (match Financial header layout: centered title + centered period)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Relatório de Produtos', pageWidth / 2, marginY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Período: ${fmtDateBR(range.startDate)} até ${fmtDateBR(range.endDate)}`, pageWidth / 2, marginY + 6, { align: 'center' });

  const byDay = Array.isArray(data?.byDay) ? data.byDay : [];
  const topProducts = Array.isArray(data?.topProducts) ? data.topProducts : [];
  const totalItems = byDay.reduce((s, d) => s + (Number(d.items) || 0), 0);
  const totalSales = byDay.reduce((s, d) => s + (Number(d.sales) || 0), 0);
  const totalFreight = byDay.reduce((s, d) => s + parseNum((d as any).freight ?? (d as any).shipping ?? 0), 0);

  // Charts row (left/right)
  const chartY = marginY + 16;
  const chartH = 42; // a little taller to fit bar value labels + x labels
  const gap = 8;
  const halfW = (pageWidth - marginX * 2 - gap) / 2;
  // Left: mini bar chart - Vendas por Dia (Produtos)
  const dayValues = byDay.map((d) => Number(d.sales || 0));
  const dayLabels = byDay.map((d) => fmtDateShort(String(d.date || '')));
  const drawMiniBar = (x: number, y: number, w: number, h: number, values: number[], labels: string[], title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, x, y - 3);
    // axes
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(x, y, x, y + h);
    doc.line(x, y + h, x + w, y + h);
    const maxVal = Math.max(1, ...values.map((v) => Math.max(0, Number(v || 0))));
    const count = Math.max(1, values.length);
    const pad = Math.max(1.5, Math.min(3, w / (count * 8)));
    const barW = Math.max(1.2, Math.min(5, (w - pad * (count + 1)) / count));
    // Force blue bars and blue stroke to avoid black rendering
    doc.setFillColor(59, 130, 246);
    doc.setDrawColor(59, 130, 246);
    for (let i = 0; i < count; i++) {
      const v = Math.max(0, Number(values[i] || 0));
      const bh = (v / maxVal) * (h - 4);
      const bx = x + pad + i * (barW + pad);
      const by = y + h - bh;
      doc.rect(bx, by, barW, bh, 'F');
      // value label at bar tip
      if (bh > 3) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const cx = bx + barW / 2;
        const ty = by - 1.2;
        const valText = fmtBRL(v);
        let txt = valText;
        const maxW = Math.max(18, barW + 10);
        while (doc.getTextWidth(txt) > maxW && txt.length > 0) txt = txt.slice(0, -1);
        if (txt !== valText) txt = txt.replace(/\s+$/, '') + '…';
        doc.text(txt, cx, ty, { align: 'center' });
      }
    }
    // value labels and x labels (sparse)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const maxLabels = Math.floor(w / 26);
    const step = Math.max(1, Math.ceil(count / Math.max(1, maxLabels)));
    for (let i = 0; i < count; i += step) {
      const bx = x + pad + i * (barW + pad) + barW / 2;
      const label = labels[i] || '';
      let text = label;
      const maxW = 18;
      while (doc.getTextWidth(text) > maxW && text.length > 0) text = text.slice(0, -1);
      if (text !== label) text = text.replace(/\s+$/, '') + '…';
      doc.text(text, bx, y + h + 8, { align: 'center', angle: 35 });
    }
  };
  drawMiniBar(marginX, chartY, halfW, chartH, dayValues, dayLabels, 'Vendas por Dia (R$)');

  // Right: distribuição por produto (stacked bar with legend)
  const distX = marginX + halfW + gap;
  const distY = chartY;
  const distW = halfW;
  const distH = 10;
  // compute shares
  const parts = (topProducts || []).map((p) => ({
    name: String(p.name || '—'),
    value: Number(p.sales || 0),
  })).filter(p => p.value > 0);
  const totalDist = parts.reduce((s, p) => s + p.value, 0);
  // palette
  const palette: [number, number, number][] = [
    [59,130,246],[16,185,129],[244,114,182],[234,179,8],[99,102,241],[239,68,68],[20,184,166],[139,92,246]
  ];
  // title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Distribuição por Produto', distX, distY - 3);
  // bar background
  doc.setDrawColor(200);
  doc.rect(distX, distY, distW, distH);
  // segments
  let accX = distX;
  parts.forEach((p, i) => {
    const frac = totalDist > 0 ? p.value / totalDist : 0;
    const segW = Math.max(0, frac * distW);
    const color = palette[i % palette.length];
    doc.setFillColor(...color);
    doc.rect(accX, distY, segW, distH, 'F');
    accX += segW;
  });
  // legend
  let lx = distX;
  let ly = distY + distH + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  parts.slice(0, 8).forEach((p, i) => {
    const color = palette[i % palette.length];
    const perc = totalDist > 0 ? (p.value / totalDist) * 100 : 0;
    const label = `${p.name}: ${perc.toFixed(0)}%`;
    const w = doc.getTextWidth(label) + 12;
    if (lx + w > distX + distW) { lx = distX; ly += 6; }
    doc.setFillColor(...color);
    doc.rect(lx, ly - 3.5, 6, 3, 'F');
    doc.text(label, lx + 8, ly, { baseline: 'bottom' } as any);
    lx += w + 8;
  });

  // Start tables after the lower of (chart bottom + padding) or (legend bottom + padding)
  const chartBottom = chartY + chartH + 18;
  const tableStartY = Math.max(chartBottom, ly + 12);

  // Top Products table
  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Top Produtos do Período', marginX, tableStartY);
  doc.setFont('helvetica', 'normal');
  const topTableY = tableStartY + 6;
  const headersTop = ['Produto', 'Código', 'Quantidade', 'Vendas (R$)', 'Frete (R$)', 'Participação (%)'];
  const rowsTop: string[][] = topProducts.map((p) => {
    const qty = Number(p.quantity || 0);
    const sales = Number(p.sales || 0);
    const freight = parseNum((p as any).freight ?? (p as any).shipping ?? 0);
    const part = totalSales > 0 ? (sales / totalSales) * 100 : 0;
    return [
      String(p.name || '—'),
      String(p.code || '—'),
      String(qty),
      fmtBRL(sales),
      fmtBRL(freight),
      part.toFixed(1), // header indica %
    ];
  });
  // Totals row for Top Products
  if (rowsTop.length) {
    const tQty = topProducts.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
    const tSales = topProducts.reduce((s, p) => s + (Number(p.sales) || 0), 0);
    const tFreight = topProducts.reduce((s, p) => s + parseNum((p as any).freight ?? (p as any).shipping ?? 0), 0);
    rowsTop.push(['TOTAL', '', String(tQty), fmtBRL(tSales), fmtBRL(tFreight), '']);
  }

  doc.setFont('helvetica', 'normal');
  drawTable(doc, {
    x: marginX,
    y: topTableY,
    pageWidth,
    pageHeight,
    marginX,
    marginY,
    headers: headersTop,
    rows: rowsTop,
    // Adjusted for an extra Freight column
    colWidths: [0.34, 0.12, 0.12, 0.16, 0.14, 0.12],
  });

  // Vendas por dia
  let nextY = topTableY + 8 + Math.max(0, rowsTop.length) * 7 + 12; // aprox; drawTable já pagina se preciso
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Vendas por Dia (Produtos)', marginX, nextY);
  nextY += 6;
  doc.setFont('helvetica', 'normal');
  const headersDay = ['Data', 'Itens', 'Vendas (R$)', 'Frete (R$)'];
  const rowsDay: string[][] = byDay.map((d) => [
    fmtDateShort(String(d.date || '')),
    String(Number(d.items || 0)),
    fmtBRL(Number(d.sales || 0)),
    fmtBRL(parseNum((d as any).freight ?? (d as any).shipping ?? 0)),
  ]);
  rowsDay.push(['TOTAL', String(totalItems), fmtBRL(totalSales), fmtBRL(totalFreight)]);
  // Linha adicional: total líquido (sem frete)
  const totalNet = Math.max(0, Number(totalSales) - Number(totalFreight));
  rowsDay.push(['TOTAL (sem frete)', '', fmtBRL(totalNet), '']);

  drawTable(doc, {
    x: marginX,
    y: nextY,
    pageWidth,
    pageHeight,
    marginX,
    marginY,
    headers: headersDay,
    rows: rowsDay,
    colWidths: [0.22, 0.16, 0.24, 0.38],
  });

  // Footer
  const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
  const genAt = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const ts = `${two(genAt.getDate())}/${two(genAt.getMonth() + 1)}/${genAt.getFullYear()} ${two(genAt.getHours())}:${two(genAt.getMinutes())}`;
  for (let i = 1; i <= pageCount; i++) {
    if ((doc as any).setPage) (doc as any).setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(`Gerado em ${ts} — Página ${i}/${pageCount}`, pageWidth - 12, pageHeight - 6, { align: 'right' });
  }

  doc.save(`Relatorio_Produtos_${range.startDate}_a_${range.endDate}.pdf`);
}

// Minimal Financial PDF generator (placeholder to satisfy current usage)
export async function generateFinancialReportPDF(range: DateRange, orders: any[]): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const marginY = 12;

  const fmtBRL = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Relatório Financeiro', marginX, marginY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Período: ${range.startDate} até ${range.endDate}`, marginX, marginY + 6);

  // Very basic summary from orders (best-effort)
  const list = Array.isArray(orders) ? orders : [];
  let total = 0;
  let paid = 0;
  for (const o of list) {
    total += Number(o?.total || 0) || 0;
    paid += Number(o?.paid_amount || 0) || 0;
  }
  const y0 = marginY + 16;
  doc.setFontSize(11);
  doc.text('Resumo', marginX, y0);
  doc.setFontSize(9);
  doc.text(`Total de Pedidos: ${list.length}`, marginX, y0 + 6);
  doc.text(`Valor Total: ${fmtBRL(total)}`, marginX, y0 + 12);
  doc.text(`Valor Pago: ${fmtBRL(paid)}`, marginX, y0 + 18);

  // Footer
  const genAt = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const ts = `${two(genAt.getDate())}/${two(genAt.getMonth() + 1)}/${genAt.getFullYear()} ${two(genAt.getHours())}:${two(genAt.getMinutes())}`;
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(`Gerado em ${ts}`, pageWidth - 12, pageHeight - 6, { align: 'right' });

  doc.save(`Relatorio_Financeiro_${range.startDate}_a_${range.endDate}.pdf`);
}

// Boletos Vencidos (Overdue installments) PDF generator
export async function generateOverdueBoletosPDF(orders: any[], todayIso: string): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const marginY = 12;

  const fmtBRL = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
  const fmtDateBR = (iso: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    }
    return iso;
  };

  // Header: specific title/subtitle for overdue boletos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Boletos Vencidos', marginX, marginY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Parcelas em atraso até ${fmtDateBR(todayIso)}`, marginX, marginY + 6);

  // Build rows of overdue installments
  const rows: string[][] = [];
  let totalEmAberto = 0;
  const list = Array.isArray(orders) ? orders : [];
  for (const o of list) {
    const custName = o?.customer?.name || o?.customer_name || o?.nome_cliente || o?.customer || '—';
    const orderNum = o?.order_number || o?.id || '—';
    const insts: any[] = Array.isArray(o?.installment_details) ? o.installment_details : [];
    for (const i of insts) {
      const amount = Number(i?.amount || 0) || 0;
      const paid = Number(i?.paid_amount || 0) || 0;
      const due = String(i?.due_date || '').slice(0, 10);
      const status = String(i?.status || '').toLowerCase();
      const unpaid = Math.max(0, amount - paid);
      if (!due || unpaid <= 0) continue;
      const isOverdue = status === 'overdue' || due < todayIso;
      if (!isOverdue) continue;
      const dDue = new Date(due + 'T00:00:00');
      const dNow = new Date(todayIso + 'T00:00:00');
      const daysLate = Math.max(0, Math.round((dNow.getTime() - dDue.getTime()) / (24 * 60 * 60 * 1000)));
      totalEmAberto += unpaid;
      rows.push([
        String(custName),
        String(orderNum),
        String(Number(i?.number || 0)),
        due,
        String(daysLate),
        fmtBRL(amount),
        fmtBRL(paid),
        fmtBRL(unpaid),
        String(i?.payment_method || o?.payment_method || ''),
      ]);
    }
  }

  // Sort by daysLate desc (column index 4)
  rows.sort((a, b) => Number(b[4]) - Number(a[4]));

  // Table
  const headers = ['Cliente', 'Pedido', 'Parcela', 'Vencimento', 'Dias Atraso', 'Valor (R$)', 'Pago (R$)', 'Em Aberto (R$)', 'Forma de Pagamento'];
  let y = marginY + 18;
  drawTable(doc, {
    x: marginX,
    y,
    pageWidth,
    pageHeight,
    marginX,
    marginY,
    headers,
    rows,
    colWidths: [0.20, 0.10, 0.08, 0.12, 0.10, 0.12, 0.12, 0.12, 0.14],
  });

  // Totals footer on last page
  const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
  const genAt = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const ts = `${two(genAt.getDate())}/${two(genAt.getMonth() + 1)}/${genAt.getFullYear()} ${two(genAt.getHours())}:${two(genAt.getMinutes())}`;
  for (let i = 1; i <= pageCount; i++) {
    if ((doc as any).setPage) (doc as any).setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(`Gerado em ${ts}`, pageWidth - 12, pageHeight - 6, { align: 'right' });
  }

  // Save
  doc.save(`Relatorio_Boletos_Vencidos_${todayIso}.pdf`);
}
