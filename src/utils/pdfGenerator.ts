import jsPDF from 'jspdf';
import { formatBRFlexible, formatBRDateTime } from './date';
import { generatePIXQRCode, PIXPayload } from './pixQRCode';

export interface OrderPDFData {
  id: string;
  // Accepts string or object, we normalize internally
  customer: any;
  date: string;
  // Optional: creation timestamp to render time (HH:mm) in header
  createdAt?: string;
  dueDate?: string;
  paymentMethod: string;
  // Accept any item shape; we normalize fields on rendering
  items: Array<any>;
  subtotal: number;
  discount?: number;
  shipping?: number;
  total: number;
  notes?: string;
  // Optional installments passed by Orders page
  installment_details?: Array<{ number: number; amount: number; due_date: string }>; // preferred shape
  installments?: Array<{ number?: number; amount?: number; valor?: number; value?: number; due_date?: string; dueDate?: string; vencimento?: string; date?: string }>;
  // Optional base64 image (data URL) of customer signature to render in PDF
  signatureImage?: string;
  // Optional injected company profile to avoid relying on localStorage (mobile-safe)
  companyProfile?: any;
}

export const generateOrderPDF = async (orderData: OrderPDFData): Promise<void> => {
  // A4 retrato, mas renderizando apenas metade da folha (topo)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  // Force initial zoom to 100%
  try { (doc as any).setDisplayMode?.(1.0, 'continuous', 'UseOutlines'); } catch {}
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeightFull = doc.internal.pageSize.getHeight();
  const pageHeight = pageHeightFull / 2; // trabalha somente na metade superior da A4

  // Margins and base styles
  const marginX = 12; // left/right
  const marginY = 10; // top/bottom
  const contentWidth = pageWidth - marginX * 2;
  let y = marginY;

  // Locale-aware currency formatter for BRL (e.g., R$ 8.970,00)
  const fmtBRL = (val: any): string => {
    const num = Number(val) || 0;
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      // Fallback
      const fixed = num.toFixed(2).replace('.', ',');
      // simple thousands sep
      const parts = fixed.split(',');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `R$ ${parts.join(',')}`;
    }
  };

  // Try to place BusinessPro logo on the left (mobile-safe)
  async function tryAddLogo() {
    // Helper: timeout wrapper
    const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), ms);
        p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
      });
    };
    // Helper: blob -> dataURL
    const blobToDataURL = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    // Prefer company logo from injected profile first
    let companyLogo: string | undefined;
    try {
      const injected = (orderData as any)?.companyProfile;
      if (injected && typeof injected.logoUrl === 'string' && injected.logoUrl.trim()) {
        companyLogo = injected.logoUrl.trim();
      } else {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('companyProfile') : null;
        if (raw) {
          const parsed = JSON.parse(raw || '{}');
          if (parsed && typeof parsed.logoUrl === 'string' && parsed.logoUrl.trim()) {
            companyLogo = parsed.logoUrl.trim();
          }
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

    for (const src of candidates) {
      try {
        if (!src) continue;
        // If already a data URL, use directly (bypasses CORS and fetch)
        if (/^data:image\//i.test(src)) {
          const maxW = 28, maxH = 12;
          const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
            img.onerror = () => resolve({ width: maxW, height: maxH });
            img.src = src;
          });
          const ratio = Math.max(0.01, Math.min(maxW / width, maxH / height));
          const drawW = Math.max(1, width * ratio);
          const drawH = Math.max(1, height * ratio);
          doc.addImage({ imageData: src, x: marginX, y, width: drawW, height: drawH });
          return true;
        }

        // Only allow same-origin root-relative paths for mobile reliability
        if (!src.startsWith('/')) continue;
        if (typeof fetch !== 'function') continue;

        const res = await withTimeout(fetch(src, { cache: 'no-cache' }), 1200);
        if (!res || !('ok' in res) || !(res as Response).ok) continue;
        const blob = await withTimeout((res as Response).blob(), 800);
        const dataUrl = await withTimeout(blobToDataURL(blob), 800);

        const maxW = 28, maxH = 12;
        const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          // attempt anonymous to avoid taint if server sends CORS headers
          try { (img as any).crossOrigin = 'anonymous'; } catch {}
          img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
          img.onerror = () => resolve({ width: maxW, height: maxH });
          img.src = dataUrl;
        });
        const ratio = Math.max(0.01, Math.min(maxW / width, maxH / height));
        const drawW = Math.max(1, width * ratio);
        const drawH = Math.max(1, height * ratio);
        doc.addImage({ imageData: dataUrl, x: marginX, y, width: drawW, height: drawH });
        return true;
      } catch {
        // ignore and try next
      }
    }
    return false;
  }

  const logoPlaced = await tryAddLogo().catch(() => false) || false;
  // Attempt to render company info next to logo (or at left if no logo)
  let companyDrawn = false;
  let headerTargetY = marginY + (logoPlaced ? 16 : 12); // unified header height
  try {
    // Prefer injected companyProfile (passed from the caller)
    let company: any = (orderData as any)?.companyProfile;
    if (!company) {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('companyProfile') : null;
      if (raw) company = JSON.parse(raw || '{}') || {};
    }
    if (company && typeof company === 'object') {
      const razao = String(company.razao_social || '').trim();
      const fantasia = String(company.nome_fantasia || '').trim();
      // Show only Razão Social; fallback to Nome Fantasia only if Razão is missing
      const compName = razao || fantasia;
      const compDoc = String(company.cnpj || '').trim();
      const compPhone = String(company.telefone || '').trim();
      const compEmail = String(company.email || '').trim();
      const addrParts = [
        company.endereco,
        [company.cidade, company.estado].filter(Boolean).join('/'),
        company.cep,
      ].filter(Boolean);
      const compAddr = addrParts.join(' - ');

      // Local helpers (duplicated small ones to avoid reordering)
      const onlyDigitsLocal = (s: string) => String(s || '').replace(/\D+/g, '');
      const fmtCpfCnpjLocal = (docStr: string): string => {
        const d = onlyDigitsLocal(docStr);
        if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        return docStr;
      };

      const xInfo = marginX + (logoPlaced ? 32 : 0);
      const yInfo = marginY + 4;
      const infoWidth = marginX + contentWidth - xInfo;

      doc.setFontSize(9);
      doc.setTextColor(40);
      if (compName) {
        doc.setFont('helvetica', 'bold');
        doc.text(String(compName), xInfo, yInfo);
      }
      doc.setFont('helvetica', 'normal');
      let nextY = yInfo;
      if (compName) nextY += 4.2;

      const rightLineBits: string[] = [];
      if (compDoc) rightLineBits.push(`CNPJ: ${fmtCpfCnpjLocal(compDoc)}`);
      if (compPhone) rightLineBits.push(`Tel: ${compPhone}`);
      if (compEmail) rightLineBits.push(`Email: ${compEmail}`);
      if (rightLineBits.length) {
        const line = rightLineBits.join('   ');
        const wrapped = doc.splitTextToSize(line, infoWidth);
        doc.text(wrapped as unknown as string, xInfo, nextY);
        nextY += Array.isArray(wrapped) ? 4.2 * wrapped.length : 4.2;
      }

      if (compAddr) {
        // Garante número no endereço do cabeçalho
        let addrNumber = '';
        if (company.numero || company.number) addrNumber = String(company.numero || company.number);
        let addrFull = compAddr;
        if (addrNumber && !compAddr.includes(addrNumber)) {
          const ruaMatch = /([^,\-]+)/.exec(compAddr);
          if (ruaMatch) {
            addrFull = compAddr.replace(ruaMatch[0], ruaMatch[0].trim() + ', ' + addrNumber);
          } else {
            addrFull += ', ' + addrNumber;
          }
        }
        const addr = `Endereço: ${addrFull}`;
        const wrappedAddr = doc.splitTextToSize(addr, infoWidth);
        doc.text(wrappedAddr as unknown as string, xInfo, nextY);
      }

      companyDrawn = !!(compName || compDoc || compAddr || compPhone || compEmail);
    }
  } catch {}

  // Always ensure at least a brand text, even if logo placed but company data absent
  if (!companyDrawn) {
    const xBrand = marginX + (logoPlaced ? 32 : 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('BusinessPro', xBrand, marginY + 6);
    doc.setFont('helvetica', 'normal');
  }

  // Advance Y consistently after header block
  y = headerTargetY;

  // Typography
  doc.setTextColor(20);
  doc.setFont('helvetica', 'normal');

  // Order meta (small, top-right): label + Data (bold)
  const rawId = String((orderData as any)?.id ?? '');
  const normId = rawId.replace(/^#+/, ''); // remove any leading '#'
  const idText = `#${normId}`;
  const isQuote = (normId || '').toLowerCase() === 'orcamento' || (rawId || '').toLowerCase() === 'orcamento' || (orderData as any)?.type === 'quote';
  const headerLabel = isQuote ? 'Orçamento' : `Pedido ${idText}`;
  const safeDate = (() => {
    const s = String((orderData as any)?.date ?? '');
    // Delegate to centralized local-time formatter
    return formatBRFlexible(s);
  })();
  // Creation time (HH:mm) from createdAt in local time
  const createdTime = (() => {
    const createdAt = (orderData as any)?.createdAt ?? (orderData as any)?.created_at;
    if (!createdAt) return '';
    const full = formatBRDateTime(createdAt); // 'dd/mm/yyyy HH:mm'
    const parts = String(full).split(' ');
    return parts.length >= 2 ? parts[1] : '';
  })();
  // Show date with hour together (business date + creation time when available)
  const metaRight = `${headerLabel}    Data: ${safeDate}${createdTime ? ' ' + createdTime : ''}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(metaRight, marginX + contentWidth, marginY + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  y += 6;
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(marginX, y, marginX + contentWidth, y);

  // Local helpers for header formatting (avoid referencing later-declared functions)
  const onlyDigitsHeader = (s: string) => String(s || '').replace(/\D+/g, '');
  const fmtCpfCnpjHeader = (docStr: string): string => {
    const d = onlyDigitsHeader(docStr);
    if (d.length === 14) {
      return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    if (d.length === 11) {
      return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return docStr;
  };

  // Company block (issuer) below header is no longer needed if we drew it next to the logo
  if (!companyDrawn) {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('companyProfile') : null;
      if (raw) {
        const company = JSON.parse(raw || '{}') || {};
        const compName = String(company.nome_fantasia || company.razao_social || '').trim();
        const compDoc = String(company.cnpj || '').trim();
        const compPhone = String(company.telefone || '').trim();
        const compEmail = String(company.email || '').trim();
        const addrParts = [
          company.endereco,
          [company.cidade, company.estado].filter(Boolean).join('/'),
          company.cep,
        ].filter(Boolean);
        const compAddr = addrParts.join(' - ');

        if (compName || compDoc || compAddr || compPhone || compEmail) {
          y += 5;
          doc.setFontSize(9);
          doc.setTextColor(60);
          if (compName) {
            doc.setFont('helvetica', 'bold');
            doc.text(compName, marginX, y);
          }
          doc.setFont('helvetica', 'normal');
          const rightLine = [] as string[];
          if (compDoc) rightLine.push(`CNPJ: ${fmtCpfCnpjHeader(compDoc)}`);
          if (compPhone) rightLine.push(`Tel: ${compPhone}`);
          if (rightLine.length) {
            doc.text(rightLine.join('   '), marginX + contentWidth, y, { align: 'right' });
          }
          if (compAddr || compEmail) {
            y += 4.5;
            const left = compAddr ? `Endereço: ${compAddr}` : '';
            if (left) doc.text(left, marginX, y);
            if (compEmail) doc.text(`Email: ${compEmail}`, marginX + contentWidth, y, { align: 'right' });
          }
          // subtle divider before customer block
          y += 3.5;
          doc.setDrawColor(220);
          doc.line(marginX, y, marginX + contentWidth, y);
        }
        doc.setTextColor(20);
      }
    } catch {}
  }

  // Customer block (multi-line)
  y += 7;
  doc.setFontSize(9);
  const root: any = orderData as any;
  const c: any = root?.customer ?? root?.cliente ?? root?.client ?? {};
  const nameRaw = typeof c === 'string' ? c : (c?.razao_social ?? c?.nome_fantasia ?? c?.fantasia ?? c?.name ?? c?.nome ?? c?.corporate_name ?? c?.legal_name ?? '');
  const custName = String(nameRaw || '');
  const docRaw = (
    c?.document ?? c?.documento ?? c?.document_number ?? c?.documento_numero ?? c?.doc ?? c?.doc_number ??
    c?.cpf_cnpj ?? c?.cnpj ?? c?.cpf ?? c?.tax_id ?? c?.taxId ??
    root?.customer_document ?? root?.document ?? root?.documento ?? root?.document_number ?? root?.cpf_cnpj ?? root?.cnpj ?? root?.cpf ?? ''
  );
  const custDoc = String(docRaw || '');
  // RG e IE
  const ieRaw = (
    c?.ie ?? c?.inscricao_estadual ?? c?.state_registration ?? c?.inscricao_estadual_st ?? c?.ie_st ??
    root?.ie ?? root?.inscricao_estadual ?? root?.state_registration ?? ''
  );
  // Address extraction (supports object or string, and arrays)
  const addrObj = (Array.isArray(c?.addresses) && c.addresses.length > 0 ? c.addresses[0] : undefined)
    || (typeof c?.address === 'object' ? c.address : undefined)
    || (typeof c?.endereco === 'object' ? c.endereco : undefined)
    || (typeof c?.billing_address === 'object' ? c.billing_address : undefined)
    || (typeof c?.shipping_address === 'object' ? c.shipping_address : undefined)
    || (typeof root?.address === 'object' ? root.address : undefined)
    || (typeof root?.endereco === 'object' ? root.endereco : undefined)
    || (typeof root?.billing_address === 'object' ? root.billing_address : undefined)
    || (typeof root?.shipping_address === 'object' ? root.shipping_address : undefined);
  const streetRaw = (
    addrObj?.street ?? addrObj?.rua ?? addrObj?.logradouro ?? addrObj?.street_name ??
    c?.address ?? c?.street ?? c?.logradouro ?? c?.street_name ??
    root?.customer_address ?? root?.address ?? root?.rua ?? root?.logradouro ?? root?.street_name ?? ''
  );
  const street = String(streetRaw || '');
  const numberRaw = (addrObj?.number ?? addrObj?.numero ?? c?.number ?? c?.numero ?? root?.numero ?? root?.number ?? '');
  const number = String(numberRaw || '');
  const complementRaw = (addrObj?.complement ?? addrObj?.complemento ?? c?.complement ?? c?.complemento ?? root?.complemento ?? root?.complement ?? '');
  const complement = String(complementRaw || '');
  const districtRaw = (addrObj?.district ?? addrObj?.bairro ?? c?.district ?? c?.bairro ?? root?.bairro ?? root?.district ?? '');
  const district = String(districtRaw || '');
  const cityRaw = (addrObj?.city ?? addrObj?.cidade ?? c?.city ?? c?.cidade ?? root?.cidade ?? root?.city ?? '');
  const city = String(cityRaw || '');
  const stateRaw = (addrObj?.state ?? addrObj?.uf ?? c?.state ?? c?.uf ?? root?.uf ?? root?.state ?? '');
  const state = String(stateRaw || '');
  // IM/Contato não exibidos; evitar variáveis não utilizadas
  // Phones/emails (arrays supported)
  const phonesList = Array.isArray(c?.phones) ? c.phones : [c?.phone, c?.telefone, c?.mobile, c?.celular, root?.phone, root?.telefone, root?.celular];
  const phones = phonesList.filter((v: any) => v != null && v !== '').map((v: any) => String(v));
  const custPhone = phones.length > 0 ? phones[0] : '';
  // Email não exibido neste layout; evitar variáveis não utilizadas

  // Inline two-line layout with formatted fields
  let printed = 0;

  const onlyDigits = (s: string) => s.replace(/\D+/g, '');
  const formatCpfCnpj = (docStr: string): string => {
    const d = onlyDigits(docStr);
    if (d.length === 11) {
      return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (d.length === 14) {
      return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return docStr; // fallback as-is
  };
  const formatPhone = (ph: string): string => {
    const d = onlyDigits(ph);
    if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    if (d.length === 9)  return d.replace(/(\d{5})(\d{4})/, '$1-$2');
    if (d.length === 8)  return d.replace(/(\d{4})(\d{4})/, '$1-$2');
    return ph;
  };

  // --- BLOCO CLIENTE MAIS COMPACTO E LARGO ---
  const lineHeight = 4.1; // mais compacto
  // --- BLOCO CLIENTE MAIS COMPACTO E LARGO (com larguras personalizadas) ---
  // Primeira linha: Cliente | Endereço | Bairro
  const colWCliente = contentWidth * 0.4;
  const colWEndereco = contentWidth * 0.4;
  const colWBairro = contentWidth * 0.2;
  const xCliente = marginX;
  const xEndereco = marginX + colWCliente;
  const xBairro = marginX + colWCliente + colWEndereco;

  let yBase = y;
  let maxFirstRowHeight = lineHeight;
  // Cliente (sempre renderiza o rótulo)
  {
    doc.setFont('helvetica', 'normal');
    const label = 'Cliente';
    const labelW = doc.getTextWidth(label + ': ');
    doc.text(label + ': ', xCliente, yBase);
    doc.setFont('helvetica', 'bold');
    const value = custName || '—';
    const valLines = doc.splitTextToSize(value, colWCliente - labelW - 2);
    doc.text(valLines as unknown as string, xCliente + labelW, yBase);
    const thisHeight = (Array.isArray(valLines) ? valLines.length : 1) * lineHeight;
    if (thisHeight > maxFirstRowHeight) maxFirstRowHeight = thisHeight;
  }
  // Endereço
  const enderecoArr = [];
  if (street) enderecoArr.push(street);
  if (number) enderecoArr.push(number);
  if (complement) enderecoArr.push(complement);
  const enderecoStr = enderecoArr.filter(Boolean).join(', ');
  let enderecoCortado = enderecoStr;
  if (enderecoCortado.length > 48) enderecoCortado = enderecoCortado.slice(0, 45) + '...';
  {
    doc.setFont('helvetica', 'normal');
    const label = 'Endereço';
    const labelW = doc.getTextWidth(label + ': ');
    doc.text(label + ': ', xEndereco, yBase);
    doc.setFont('helvetica', 'bold');
    const value = enderecoCortado || '—';
    const valLines = doc.splitTextToSize(value, colWEndereco - labelW - 2);
    doc.text(valLines as unknown as string, xEndereco + labelW, yBase);
    const thisHeight = (Array.isArray(valLines) ? valLines.length : 1) * lineHeight;
    if (thisHeight > maxFirstRowHeight) maxFirstRowHeight = thisHeight;
  }
  // Bairro
  {
    doc.setFont('helvetica', 'normal');
    const label = 'Bairro';
    const labelW = doc.getTextWidth(label + ': ');
    doc.text(label + ': ', xBairro, yBase);
    doc.setFont('helvetica', 'bold');
    const value = district || '—';
    const valLines = doc.splitTextToSize(value, colWBairro - labelW - 2);
    doc.text(valLines as unknown as string, xBairro + labelW, yBase);
    const thisHeight = (Array.isArray(valLines) ? valLines.length : 1) * lineHeight;
    if (thisHeight > maxFirstRowHeight) maxFirstRowHeight = thisHeight;
  }
  y += maxFirstRowHeight;

  // Segunda linha em diante: alinhadas às colunas principais
  const colX = [xCliente, xEndereco, xBairro];
  const colW = [colWCliente, colWEndereco, colWBairro];

  // Linha 2: Cidade/UF | CNPJ | CPF
  const d = onlyDigits(custDoc);
  let cnpj = '', cpf = '';
  if (d.length === 14) cnpj = formatCpfCnpj(custDoc);
  if (d.length === 11) cpf = formatCpfCnpj(custDoc);
  const l2 = [
    { label: 'Cidade/UF', value: (city || state) ? [city, state].filter(Boolean).join('/') : '' },
    { label: 'CNPJ', value: cnpj },
    { label: 'CPF', value: cpf },
  ];
  let maxL2 = lineHeight;
  for (let i = 0; i < 3; i++) {
    doc.setFont('helvetica', 'normal');
    const labelW = doc.getTextWidth(l2[i].label ? l2[i].label + ': ' : '');
    if (l2[i].label) doc.text(l2[i].label + ': ', colX[i], y);
    doc.setFont('helvetica', 'bold');
    const value = l2[i].value || '—';
    const valLines = doc.splitTextToSize(value, colW[i] - labelW - 2);
    doc.text(valLines as unknown as string, colX[i] + labelW, y);
    const thisHeight = (Array.isArray(valLines) ? valLines.length : 1) * lineHeight;
    if (thisHeight > maxL2) maxL2 = thisHeight;
  }
  y += maxL2;

  // Linha 3: Telefone | Email | IE
  const l3 = [
    { label: 'Telefone', value: custPhone ? formatPhone(custPhone) : '' },
    { label: 'Email', value: c?.email ? String(c.email) : '' },
    { label: 'IE', value: ieRaw ? String(ieRaw) : '' },
  ];
  let maxL3 = lineHeight;
  for (let i = 0; i < 3; i++) {
    doc.setFont('helvetica', 'normal');
    const labelW = doc.getTextWidth(l3[i].label ? l3[i].label + ': ' : '');
    if (l3[i].label) doc.text(l3[i].label + ': ', colX[i], y);
    doc.setFont('helvetica', 'bold');
    const value = l3[i].value || '—';
    const valLines = doc.splitTextToSize(value, colW[i] - labelW - 2);
    doc.text(valLines as unknown as string, colX[i] + labelW, y);
    const thisHeight = (Array.isArray(valLines) ? valLines.length : 1) * lineHeight;
    if (thisHeight > maxL3) maxL3 = thisHeight;
  }
  y += maxL3;
  printed += 2;

  // --- FIM BLOCO CLIENTE MAIS COMPACTO ---


// Fallback: if almost nothing printed, dump common key-value pairs from the customer object
try {
  if (printed <= 1 && c && typeof c === 'object') {
    const candidates: Array<[string, any]> = [];
    const pick = (label: string, ...keys: string[]) => {
      for (const k of keys) {
        if (c[k] != null && c[k] !== '') { candidates.push([label, c[k]]); return; }
      }
    };
    pick('Nome', 'name', 'nome');
    pick('Documento', 'cpf', 'cnpj', 'doc', 'documento');
    pick('Telefone', 'telefone', 'phone', 'celular');
    pick('Email', 'email');
    pick('Endereço', 'endereco', 'address');
    pick('Bairro', 'bairro', 'district');
    pick('Cidade', 'cidade', 'city');
    pick('UF', 'uf', 'state');
    let fallbackY = y;
    for (const [label, val] of candidates) {
      doc.setFont('helvetica', 'normal');
      const labelW = doc.getTextWidth(label + ': ');
      doc.text(label + ': ', marginX, fallbackY);
      doc.setFont('helvetica', 'bold');
      doc.text(String(val), marginX + labelW, fallbackY);
      fallbackY += lineHeight;
    }
    y = fallbackY;
  }
} catch (e) {}
// --- FIM BLOCO CLIENTE ---
  // Linha/borda após bloco do cliente
  doc.setDrawColor(220);
  doc.line(marginX, y, marginX + contentWidth, y);
  y += 6;
  // Compute totals box metrics upfront to reserve space at the bottom
  const subtotal = Number(orderData.subtotal) || 0;
  const discount = Number(orderData.discount) || 0;
  const shipping = Number((orderData as any)?.shipping) || 0;
  const total = Number(orderData.total) || 0;
  const lineH = 6;
  const pad = 3;
  const rows = 3 + (discount > 0 ? 1 : 0); // Subtotal, (Desconto), Frete, Total
  const boxH = pad * 2 + rows * lineH;
  const footerReserve = 14; // keep space for payment/footer lines
  const reservedBottom = footerReserve + boxH + 4; // small safety gap
// Items table (compact)
  const col = {
    prod:  contentWidth * 0.46,
    unitType: contentWidth * 0.10,
    qty:   contentWidth * 0.10,
    unit:  contentWidth * 0.17,
    total: contentWidth * 0.17,
  } as const;
  const startX = marginX;

  // Header row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Produto', startX, y);
  doc.text('Un.', startX + col.prod + col.unitType / 2, y, { align: 'center' });
  doc.text('Qtd', startX + col.prod + col.unitType + col.qty / 2, y, { align: 'center' });
  doc.text('Unit.', startX + col.prod + col.unitType + col.qty + col.unit / 2, y, { align: 'center' });
  doc.text('Total', startX + col.prod + col.unitType + col.qty + col.unit + col.total / 2, y, { align: 'center' });

  y += 2;
  doc.setDrawColor(220);
  doc.line(marginX, y, marginX + contentWidth, y);

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const safeItems = Array.isArray(orderData.items) ? orderData.items : [];
  const rowHeight = 5.5;

  safeItems.forEach((item) => {
    // Ensure we don't overwrite the totals box at the bottom of the page
    if (y + rowHeight > pageHeight - marginY - reservedBottom) {
      doc.addPage();
      y = marginY;
      // repeat slim header on new page
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Pedido #${orderData.id}`, marginX, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
      doc.setDrawColor(200);
      doc.line(marginX, y, marginX + contentWidth, y);
      y += 7;
      // table header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Produto', startX, y);
      doc.text('Un.', startX + col.prod + col.unitType / 2, y, { align: 'center' });
      doc.text('Qtd', startX + col.prod + col.unitType + col.qty / 2, y, { align: 'center' });
      doc.text('Unit.', startX + col.prod + col.unitType + col.qty + col.unit / 2, y, { align: 'center' });
      doc.text('Total', startX + col.prod + col.unitType + col.qty + col.unit + col.total / 2, y, { align: 'center' });
      y += 4.5;
      doc.setDrawColor(220);
      doc.line(marginX, y, marginX + contentWidth, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    }

    const qty = Number((item as any)?.quantity) || 0;
    const unit = Number((item as any)?.unitPrice ?? (item as any)?.unit_price ?? (item as any)?.price) || 0;
    const tot = Number((item as any)?.total ?? qty * unit) || 0;
    const it: any = item as any;
    const name = String(
      it?.productName ??
      it?.name ??
      it?.product_name ??
      it?.product?.name ??
      it?.product?.nome ??
      it?.product_id?.name ??
      it?.product_id?.nome ??
      it?.title ??
      it?.descricao ??
      it?.description ??
      it?.sku ??
      it?.code ??
      ''
    );

    const unitType = String(
      it?.unitType ?? it?.unit_type ?? it?.unit_label ?? it?.unit ?? it?.unidade ?? it?.uom ?? it?.measure ??
      it?.product?.unit ?? it?.product_id?.unit ?? ''
    );

    // Product name (clip to column width)
    const nameLines = doc.splitTextToSize(name, col.prod - 2);
    const line1 = Array.isArray(nameLines) ? nameLines[0] : name;

    doc.text(line1, startX, y + 4);
    doc.text(unitType || '-', startX + col.prod + col.unitType / 2, y + 4, { align: 'center' });
    doc.text(String(qty), startX + col.prod + col.unitType + col.qty / 2, y + 4, { align: 'center' });
    doc.text(fmtBRL(unit), startX + col.prod + col.unitType + col.qty + col.unit / 2, y + 4, { align: 'center' });
    doc.text(fmtBRL(tot), startX + col.prod + col.unitType + col.qty + col.unit + col.total / 2, y + 4, { align: 'center' });

    y += rowHeight;
  });

  // Summary (totals) box at bottom-right with square border
  const boxW = 56; // narrower box, shrinking from left to right
  const boxX = marginX + contentWidth - boxW;
  const boxY = pageHeight - marginY - footerReserve - boxH;

  // Draw box with crisp stroke (align to half-pixel) to avoid disproportion on edges
  const crisp = (n: number) => Math.round(n) + 0.5;
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.rect(crisp(boxX), crisp(boxY), Math.round(boxW), Math.round(boxH));

  // Content inside box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let by = boxY + pad + lineH - 1.5;
  const right = boxX + boxW - pad;
  // Column layout inside box
  const left = boxX + 4; // tighter left padding to bring text closer to the box border
  const valueRightX = right; // values remain right-aligned at inner right
  const labelLeftX = left; // labels start near left border
  doc.text('Subtotal:', labelLeftX, by, { align: 'left' });
  doc.text(fmtBRL(subtotal), valueRightX, by, { align: 'right' });
  if (discount > 0) {
    by += lineH;
    doc.text('Desconto:', labelLeftX, by, { align: 'left' });
    doc.text(fmtBRL(discount), valueRightX, by, { align: 'right' });
  }
  by += lineH;
  doc.text('Frete:', labelLeftX, by, { align: 'left' });
  doc.text(fmtBRL(shipping), valueRightX, by, { align: 'right' });
  by += lineH;
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', labelLeftX, by, { align: 'left' });
  doc.text(fmtBRL(total), valueRightX, by, { align: 'right' });

  // Footer: Observations on the left, totals already at bottom-right, payment below
  const payment = orderData.paymentMethod || '';
  // If PIX, generate QR code with order value and company PIX key
  let pixDrawn = false;
  if (String(payment).toUpperCase().includes('PIX')) {
    const qrSize = 36; // mm
    const qrX = marginX;
    const qrY = pageHeight - marginY - 1 - qrSize - 6; // keep a small gap above payment line
    try {
      // Get company profile for PIX key
      let company: any = (orderData as any)?.companyProfile;
      if (!company) {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('companyProfile') : null;
        if (raw) company = JSON.parse(raw || '{}') || {};
      }
      
      const pixKey = String(company?.pixKey || '').trim();
      const merchantName = String(company?.razao_social || company?.nome_fantasia || 'BusinessPro').trim();
      const merchantCity = String(company?.cidade || 'São Paulo').trim();
      const orderId = String((orderData as any)?.id || '').trim();
      
      if (pixKey && total > 0) {
        const pixData: PIXPayload = {
          pixKey,
          merchantName: merchantName.substring(0, 25),
          merchantCity: merchantCity.substring(0, 15),
          amount: total,
          description: `Pedido ${orderId}`,
          txId: orderId.substring(0, 25)
        };
        
        const qrDataUrl = await generatePIXQRCode(pixData);
        if (qrDataUrl && /^data:image\//i.test(qrDataUrl)) {
          doc.addImage({ imageData: qrDataUrl, x: qrX, y: qrY, width: qrSize, height: qrSize });
          // Label
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(20);
          doc.text('PIX', qrX + qrSize / 2, qrY - 2, { align: 'center' });
          // Show PIX key below QR code
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(60);
          const keyText = pixKey.length > 20 ? pixKey.substring(0, 17) + '...' : pixKey;
          doc.text(keyText, qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
          pixDrawn = true;
        }
      }
    } catch (_) {
      // ignore QR failures; continue without PIX image
    }
  }
  // Observations block above payment (left)
  if (orderData.notes) {
    const notesText = String(orderData.notes);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60);
    const notesLabel = 'Observações:';
    const notesMaxWidth = contentWidth * 0.55; // keep away from totals box
    // Single-line rendering with ellipsis if needed, positioned close to payment line
    const paymentBaseY = pageHeight - marginY - 1; // same baseline used for payment text
    const notesY = paymentBaseY - 6; // place a bit above the payment line
    const prefix = `${notesLabel} `;
    // Measure available width after printing label on the same line
    const startX = marginX + doc.getTextWidth(prefix);
    const available = notesMaxWidth - doc.getTextWidth(prefix);
    const ellipsis = '…';
    const toSingleLine = (s: string): string => {
      let clean = s.replace(/\s+/g, ' ').trim();
      while (doc.getTextWidth(clean) > available && clean.length > 0) {
        clean = clean.slice(0, -1);
      }
      return clean.length < s.trim().length ? (clean.replace(/\s+$/, '') + ellipsis) : clean;
    };
    const single = toSingleLine(notesText);
    // Draw full line: label + content
    doc.setTextColor(60);
    doc.text(notesLabel, marginX, notesY);
    doc.setTextColor(20);
    doc.text(single, startX, notesY);
  }

  // Signature field (left), above the payment line
  {
    const paymentBaseY = pageHeight - marginY - 1;
    const sigWidth = 60;
    // If PIX QR drawn on the far left, keep signature starting a bit to the right to avoid overlap
    const sigX = pixDrawn ? (marginX + 42) : (marginX - -40);
    const sigY = paymentBaseY - 20; // between observations (-6) and payment (-1)
    const crisp = (n: number) => Math.round(n) + 0.5;

    // If a signature image was provided, render it above the line preserving aspect ratio
    const sigImg = (orderData as any)?.signatureImage as string | undefined;
    const sigMaxH = 16; // max height for signature drawing area
    if (sigImg && typeof sigImg === 'string' && sigImg.trim().startsWith('data:image')) {
      try {
        // Measure image to preserve aspect ratio against sigWidth x sigMaxH
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
          img.onerror = () => resolve({ w: sigWidth, h: sigMaxH });
          img.src = sigImg;
        });
        const ratio = Math.max(0.01, Math.min(sigWidth / dims.w, sigMaxH / dims.h));
        const drawW = Math.max(1, dims.w * ratio);
        const drawH = Math.max(1, dims.h * ratio);
        const drawX = sigX + (sigWidth - drawW) / 2;
        const drawY = sigY - 2 - drawH; // a bit above the line
        doc.addImage({ imageData: sigImg, x: drawX, y: drawY, width: drawW, height: drawH });
      } catch {}
    }

    // Draw signature line
    doc.setDrawColor(0);
    doc.setLineWidth(0);
    doc.line(crisp(sigX), crisp(sigY), crisp(sigX + sigWidth), crisp(sigY));
    // Label centered below the line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    const centerX = sigX + sigWidth / 2;
    doc.text('Assinatura', centerX, sigY + 3, { align: 'center' });
  }

  // Payment method + installments inline at very bottom-left
  {
    const rawInst: any = (orderData as any)?.installment_details || (orderData as any)?.installments || [];
    const instArr: any[] = Array.isArray(rawInst) ? rawInst : [];
    // Safe BR date formatter avoiding timezone shifts (no Date parsing)
    // - If starts with 'YYYY-MM-DD' (optionally followed by time), format by slicing date part to 'dd/mm/yy'
    // - If already looks like 'dd/mm/yyyy', keep as-is
    // - Else, return the original string
    const brDateSafe = (val: any): string => {
      if (!val) return '';
      const s = String(val);
      const ymdPrefix = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (ymdPrefix) {
        const yyyy = ymdPrefix[1];
        const mm = ymdPrefix[2];
        const dd = ymdPrefix[3];
        const yy = yyyy.slice(2);
        return `${dd}/${mm}/${yy}`; // dd/mm/yy
      }
      const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3].slice(2)}`; // normalize to dd/mm/yy
      return s;
    };
    const dueDates: string[] = Array.isArray(instArr)
      ? instArr
          .map((it: any) => it?.due_date || it?.vencimento || it?.date)
          .filter(Boolean)
          .map((d: any) => brDateSafe(d))
      : [];
    const count = Array.isArray(instArr) ? instArr.length : (typeof rawInst === 'number' ? Number(rawInst) : 0);
    const singleDue = !count && (orderData as any)?.dueDate ? brDateSafe((orderData as any).dueDate) : '';

    const parts: string[] = [];
    if (count > 0) {
      // Pagamento: <method> <N>x | Venc.: ... (no divider between method and count)
      parts.push(`Pagamento: ${payment || '—'} ${count}x`);
      if (dueDates.length) parts.push(`Venc.: ${dueDates.join(', ')}`);
    } else {
      parts.push(`Pagamento: ${payment || '—'}`);
      if (singleDue) parts.push(`Venc.: ${singleDue}`);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20);
    const line = parts.join(' | ');
    const maxW = contentWidth * 0.96; // slightly wider to fit one more date without overlapping totals
    const txt = doc.splitTextToSize(line, maxW);
    doc.text(txt, marginX, pageHeight - marginY - 1);
  }

  // Footer: page number at bottom-right (x de y)
  {
    const getCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages.bind(doc) : (doc as any).internal.getNumberOfPages.bind((doc as any).internal);
    const pageCount: number = getCount();
    const prevFontSize = doc.getFontSize();
    const prevColor = (doc as any).getTextColor ? (doc as any).getTextColor() : undefined;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120);
      const text = `${i} de ${pageCount}`;
      doc.text(text, pageWidth - marginX, pageHeight - marginY + 0.5, { align: 'right' });
    }
    // restore
    doc.setFontSize(prevFontSize);
    if (prevColor != null && (doc as any).setTextColor) (doc as any).setTextColor(prevColor);
  }

  // Save
  doc.save(`Pedido_${orderData.id}.pdf`);
};

export interface BilletPDFData {
  id: string;
  customer: {
    name: string;
    document: string;
    address: string;
  };
  amount: number;
  dueDate: string;
  issueDate: string;
  barcode: string;
  instructions?: string;
  interest?: number;
  fine?: number;
}

export const generateBilletPDF = (billetData: BilletPDFData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BusinessPro - Boleto Bancário', 20, 20);
  
  // Reset colors
  doc.setTextColor(31, 41, 55);
  
  // Billet info
  let yPos = 50;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Boleto ${billetData.id}`, 20, yPos);
  
  yPos += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Data de Emissão: ${formatBRFlexible(billetData.issueDate)}`, 20, yPos);
  doc.text(`Vencimento: ${formatBRFlexible(billetData.dueDate)}`, 120, yPos);
  
  // Customer data
  yPos += 20;
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Pagador:', 20, yPos);
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${billetData.customer.name}`, 20, yPos);
  
  yPos += 8;
  doc.text(`CPF/CNPJ: ${billetData.customer.document}`, 20, yPos);
  
  yPos += 8;
  doc.text(
    `Endereço: ${[billetData.customer.address, (billetData.customer as any)?.address_number]
      .filter(Boolean)
      .join(', ')}`,
    20,
    yPos
  );
  
  // Amount section
  yPos += 25;
  doc.setFillColor(243, 244, 246);
  doc.rect(20, yPos - 10, pageWidth - 40, 25, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Valor: R$ ${billetData.amount.toFixed(2)}`, pageWidth / 2, yPos, { align: 'center' });
  
  // Barcode section
  yPos += 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Código de Barras:', 20, yPos);
  
  yPos += 10;
  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  doc.text(billetData.barcode, 20, yPos);
  
  // Instructions
  if (billetData.instructions) {
    yPos += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Instruções:', 20, yPos);
    
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    const splitInstructions = doc.splitTextToSize(billetData.instructions, pageWidth - 40);
    doc.text(splitInstructions, 20, yPos);
  }
  
  // Save the PDF
  doc.save(`Boleto_${billetData.id}.pdf`);
};