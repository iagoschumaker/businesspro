import jsPDF from 'jspdf';
import { formatBRFlexible, formatBRDateTime } from './date';
import { generatePIXQRCode, type PIXPayload } from './pixQRCode';

export interface FinancialInstallment {
  number: number;
  amount: number;
  due_date: string; // YYYY-MM-DD
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paid_amount?: number;
  payment_date?: string;
  payments?: { amount: number; date: string }[];
}

export interface FinancialOrderData {
  id?: string;
  _id?: string;
  order_number?: string;
  customer?: { name?: string } | string;
  total: number;
  payment_method?: string;
  installment_details?: FinancialInstallment[];
  paid_amount?: number;
  remaining_amount?: number;
  created_at?: string;
  createdAt?: string;
  date?: string;
}

const pickId = (o: any): string => String(o?._id || o?.id || '');
const pickNumber = (o: any): string => String(o?.order_number || '—');
const pickCustomer = (o: any): string => {
  if (!o?.customer) return '—';
  if (typeof o.customer === 'string') return o.customer;
  return o.customer?.name || '—';
};
const pickDate = (o: any): Date => new Date(o?.createdAt || o?.created_at || o?.date || Date.now());

const brDateTime = (d: string | Date): string => {
  return formatBRDateTime(d);
};
const brDate = (d: string | Date): string => {
  return formatBRFlexible(d);
};

export const generateFinancialPDF = async (order: FinancialOrderData): Promise<void> => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const marginX = 12;
  const marginY = 10;
  const contentWidth = pageWidth - marginX * 2;
  let y = marginY;

  async function tryAddLogo() {
    let companyLogo: string | undefined;
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('companyProfile') : null;
      if (raw) {
        const parsed = JSON.parse(raw || '{}');
        if (parsed && typeof parsed.logoUrl === 'string' && parsed.logoUrl.trim()) {
          companyLogo = parsed.logoUrl.trim();
        }
      }
    } catch {}

    const candidates = [
      ...(companyLogo ? [companyLogo] : []),
      '/businesspro-logo.png',
      '/logo-businesspro.png',
      '/logo.png',
      '/businesspro-logo.jpg',
    ];
    for (const path of candidates) {
      try {
        const res = await fetch(path);
        if (!res.ok) continue;
        const blob = await res.blob();
        const reader = new FileReader();
        const dataUrl: string = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // Preserve aspect ratio: fit inside 28x12mm box
        const maxW = 28;
        const maxH = 12;
        const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
          img.onerror = () => resolve({ width: maxW, height: maxH });
          img.src = dataUrl;
        });
        const ratio = Math.max(0.01, Math.min(maxW / width, maxH / height));
        const drawW = Math.max(1, width * ratio);
        const drawH = Math.max(1, height * ratio);
        doc.addImage({ imageData: dataUrl, x: marginX, y, width: drawW, height: drawH });
        return true;
      } catch {}
    }
    return false;
  }

  const logoPlaced = typeof fetch === 'function' ? await tryAddLogo() : false;
  if (logoPlaced) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text('Relatório Financeiro', marginX + 32, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Gerado em ${brDateTime(new Date())}`, marginX + 32, y + 10);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Relatório Financeiro', marginX, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Gerado em ${brDateTime(new Date())}`, marginX, y + 12);
  }
  y += 18;

  // Header: order and customer
  const id = pickId(order);
  const ordNum = pickNumber(order);
  const cust = pickCustomer(order);
  const created = pickDate(order);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text(`Pedido: ${ordNum}  (ID: ${id || '—'})`, marginX, y);
  y += 5;
  doc.text(`Cliente: ${cust}`, marginX, y);
  y += 5;
  if (order.payment_method) {
    doc.text(`Forma de Pagamento: ${order.payment_method}`, marginX, y);
    y += 5;
  }
  doc.text(`Data do Pedido: ${brDateTime(created)}`, marginX, y);
  y += 8;

  // Totals summary (Restante first, then Pago as requested)
  const total = Number(order.total || 0);
  const paid = Number(order.paid_amount || 0);
  const remaining = Number(order.remaining_amount ?? Math.max(0, total - paid));

  // Company profile (for PIX)
  let pixKey = '';
  let merchantName = 'EMPRESA';
  let merchantCity = 'SAO PAULO';
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('companyProfile') : null;
    if (raw) {
      const p = JSON.parse(raw || '{}');
      if (p && typeof p.pixKey === 'string') pixKey = String(p.pixKey).trim();
      if (typeof p.fantasyName === 'string' && p.fantasyName.trim()) merchantName = String(p.fantasyName);
      else if (typeof p.companyName === 'string' && p.companyName.trim()) merchantName = String(p.companyName);
      if (typeof p.city === 'string' && p.city.trim()) merchantCity = String(p.city);
    }
  } catch {}

  // PIX QR for remaining amount (if applicable) - place at top-right
  let reservedTopRightHeight = 0;
  try {
    const pm = String(order.payment_method || '').toUpperCase();
    const shouldAddPIX = pm.includes('PIX') && pixKey && remaining > 0;
    if (shouldAddPIX) {
      const payload: PIXPayload = {
        pixKey,
        merchantName,
        merchantCity,
        amount: remaining,
        description: `Pedido ${pickNumber(order) || pickId(order)}`,
      };
      const dataUrl = await generatePIXQRCode(payload);
      if (dataUrl && /^data:image\//i.test(dataUrl)) {
        const qrSize = 36; // mm
        const qrX = pageWidth - marginX - qrSize;
        const qrY = marginY; // top-right corner
        doc.addImage({ imageData: dataUrl, x: qrX, y: qrY, width: qrSize, height: qrSize });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(20);
        doc.text('PIX', qrX + qrSize / 2, qrY - 2, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const keyText = pixKey.length > 20 ? pixKey.slice(0, 10) + '…' + pixKey.slice(-7) : pixKey;
        doc.text(keyText, qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
        doc.text(`Pague o restante: R$ ${remaining.toFixed(2)}`, qrX + qrSize / 2, qrY + qrSize + 7, { align: 'center' });
        reservedTopRightHeight = qrSize + 10; // labels space
      }
    }
  } catch {}

  // Ensure content starts below the QR area
  y = Math.max(y, marginY + reservedTopRightHeight + 6);

  const boxY = y;
  const boxH = 24;
  const colW = contentWidth / 3;
  doc.setDrawColor(220);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, boxY, contentWidth, boxH, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text('Total', marginX + 4, boxY + 7);
  doc.text('Restante', marginX + colW + 4, boxY + 7);
  doc.text('Pago', marginX + colW * 2 + 4, boxY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text(`R$ ${total.toFixed(2)}`, marginX + 4, boxY + 16);
  doc.setTextColor(185, 28, 28); // red
  doc.text(`R$ ${remaining.toFixed(2)}`, marginX + colW + 4, boxY + 16);
  doc.setTextColor(22, 163, 74); // green
  doc.text(`R$ ${paid.toFixed(2)}`, marginX + colW * 2 + 4, boxY + 16);

  y = boxY + boxH + 6;

  // Installments table
  const installments = Array.isArray(order.installment_details) ? order.installment_details : [];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text('Parcelas', marginX, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60);

  if (installments.length === 0) {
    doc.text('Este pedido não possui parcelas registradas.', marginX, y + 6);
  } else {
    // Header row
    const colNum = 14;
    const colDue = 28;
    const colAmt = 30;
    const colPaid = 30;
    const colStatus = 26;

    const rowH = 6;
    let x = marginX;

    doc.setFillColor(243, 244, 246);
    doc.rect(x, y, contentWidth, rowH, 'F');
    doc.setTextColor(30);
    doc.text('#', x + 2, y + 4);
    x += colNum;
    doc.text('Vencimento', x + 2, y + 4);
    x += colDue;
    doc.text('Valor', x + 2, y + 4);
    x += colAmt;
    doc.text('Pago', x + 2, y + 4);
    x += colPaid;
    doc.text('Status', x + 2, y + 4);
    x += colStatus;
    doc.text('Últ. Pagamento', x + 2, y + 4);

    y += rowH + 1;

    const toBR = (n: number) => `R$ ${Number(n || 0).toFixed(2)}`;

    installments.forEach((inst) => {
      if (y > pageHeight - marginY - 10) {
        doc.addPage();
        y = marginY;
      }
      let cx = marginX;
      doc.setTextColor(20);
      doc.text(String(inst.number), cx + 2, y + 4);
      cx += colNum;
      doc.text(brDate(inst.due_date), cx + 2, y + 4);
      cx += colDue;
      doc.text(toBR(inst.amount), cx + 2, y + 4);
      cx += colAmt;
      doc.text(toBR(inst.paid_amount || 0), cx + 2, y + 4);
      cx += colPaid;
      const overdue = inst.status !== 'paid' && new Date(inst.due_date) < new Date();
      const label = inst.status === 'paid' ? 'Pago' : inst.status === 'partial' ? 'Parcial' : overdue ? 'Atrasado' : 'Pendente';
      doc.text(label, cx + 2, y + 4);
      cx += colStatus;
      const last = inst.payment_date || (inst.payments && inst.payments.length ? inst.payments[inst.payments.length - 1].date : undefined);
      doc.text(last ? brDateTime(last) : '—', cx + 2, y + 4);
      y += rowH + 1;

      // Optional: list payments below the installment row
      if (Array.isArray(inst.payments) && inst.payments.length > 0) {
        inst.payments.forEach((p) => {
          if (y > pageHeight - marginY - 10) {
            doc.addPage();
            y = marginY;
          }
          doc.setTextColor(90);
          doc.setFontSize(8);
          doc.text(`• Pago em ${brDateTime(p.date)} — ${toBR(p.amount)}`, marginX + 6, y + 3.2);
          y += 4;
          doc.setFontSize(9);
        });
      }
    });
  }


  const fileId = pickNumber(order) || pickId(order) || 'Financeiro';
  doc.save(`Financeiro_${fileId}.pdf`);
};
