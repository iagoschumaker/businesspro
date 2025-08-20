// Use qrcode-pix (maintained) to build BR Code payload and base64 QR image
const { QrCodePix } = require('qrcode-pix');

function sanitize(str, upper = true) {
  if (!str) return '';
  try {
    const s = upper ? String(str).toUpperCase() : String(str);
    // remove acentos
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  } catch (_) {
    return String(str);
  }
}

function buildTxid(order) {
  // Max 25 chars for txid
  const base = order.order_number ? String(order.order_number).replace(/[^A-Z0-9]/gi, '') : '';
  const id = order._id ? String(order._id) : '';
  const short = id.slice(-8);
  const raw = `ORD${base ? '-' + base : ''}-${short}`;
  return raw.slice(0, 25);
}

async function generatePixPayloadAndQr({
  amount,
  key,
  merchantName,
  merchantCity,
  txid,
  message,
}) {
  // Ensure numbers
  const value = Number(amount || 0);
  const name = sanitize(merchantName || 'EMPRESA');
  const city = sanitize(merchantCity || 'BRASIL');

  const qrCodePix = QrCodePix({
    version: '01',
    key: String(key || ''),
    name,
    city,
    message: message ? String(message) : undefined,
    transactionId: String(txid || 'ORD'),
    value: isNaN(value) ? undefined : value,
  });

  const payload = qrCodePix.payload();
  const qrDataUrl = await qrCodePix.base64({ scale: 6 });
  return { payload, qrDataUrl };
}

module.exports = {
  sanitize,
  buildTxid,
  generatePixPayloadAndQr,
};
