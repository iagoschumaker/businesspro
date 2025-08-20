import QRCode from 'qrcode';

// PIX QR Code Generator
export interface PIXPayload {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  description?: string;
  txId?: string;
}

// Sanitize text for EMV: remove accents, uppercase, trim length
function sanitize(text: string, maxLen: number): string {
  const noAccents = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\x20-\x7E]/g, ''); // ASCII only
  return noAccents.toUpperCase().slice(0, maxLen);
}

// Format EMV field: ID(2) + LEN(2) + VALUE
function f(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// CRC16-CCITT (0x1021) per PIX spec
function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Build PIX EMV payload
export function generatePIXPayload(data: PIXPayload): string {
  const pixKey = String(data.pixKey || '').trim();
  const name = sanitize(String(data.merchantName || 'MERCHANT'), 25);
  const city = sanitize(String(data.merchantCity || 'SAO PAULO'), 15);
  const amount = Math.max(0, Number(data.amount) || 0);
  const desc = data.description ? sanitize(String(data.description), 72) : '';
  // Static QR when using PIX key (not dynamic URL). TXID must be '***'.
  const txId = '***';

  // Merchant Account Information (26)
  let mai = '';
  mai += f('00', 'BR.GOV.BCB.PIX'); // GUI
  mai += f('01', pixKey); // PIX key
  if (desc) mai += f('02', desc); // description optional

  let emv = '';
  emv += f('00', '01'); // Payload Format Indicator
  emv += f('01', '11'); // static QR
  emv += f('26', mai); // Merchant Account Information
  emv += f('52', '0000'); // Merchant Category Code
  emv += f('53', '986'); // Currency BRL
  if (amount > 0) emv += f('54', amount.toFixed(2)); // Amount
  emv += f('58', 'BR'); // Country
  emv += f('59', name); // Merchant Name
  emv += f('60', city); // Merchant City

  // Additional Data Field Template (62) with TXID (05)
  const add = f('05', txId);
  emv += f('62', add);

  // CRC (63)
  const partial = emv + '63' + '04';
  const crc = crc16(partial);
  emv += '63' + '04' + crc;
  return emv;
}

// Generate QR Code as data URL using qrcode library
export async function generatePIXQRCode(data: PIXPayload): Promise<string> {
  const payload = generatePIXPayload(data);
  // Use higher ECC and margin for bank scanners
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 8,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
