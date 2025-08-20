// Centralized date helpers using the computer's local time

// Returns current local Date (computer clock)
export const nowLocal = (): Date => new Date();

// Converts a Date to 'YYYY-MM-DD' using local components
export const ymdFromDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Today's date as 'YYYY-MM-DD'
export const todayYMD = (): string => ymdFromDate(nowLocal());

// Add days in local time, returning a new Date
export const addDaysLocal = (date: Date, days: number): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
};

// Parse a 'YYYY-MM-DD' into a local Date (no UTC shift)
export const parseYMDToDate = (ymd: string): Date => {
  const [y, m, d] = (ymd || '').split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
};

// Format 'YYYY-MM-DD' to 'DD/MM/YYYY' without Date parsing (avoids UTC shifts)
export const formatBRFromYMD = (ymd: string): string => {
  if (!ymd || typeof ymd !== 'string') return '';
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

// Detects if string is in 'YYYY-MM-DD' format
export const isYMD = (value: any): value is string => {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
};

// Flexible BR formatter: handles 'YYYY-MM-DD' or Date/ISO
export const formatBRFlexible = (value: any): string => {
  if (!value) return '';
  // Handle 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss...' as pure local dates
  if (typeof value === 'string') {
    if (isYMD(value)) return formatBRFromYMD(String(value).slice(0, 10));
    const startsWithYMD = /^\d{4}-\d{2}-\d{2}/.test(value);
    if (startsWithYMD) {
      return formatBRFromYMD(String(value).slice(0, 10));
    }
  }
  const dt = new Date(value);
  return isNaN(dt.getTime()) ? String(value) : dt.toLocaleDateString('pt-BR');
};

// Date + time in pt-BR: 'DD/MM/YYYY HH:mm'
export const formatBRDateTime = (value: any): string => {
  if (!value) return '';
  // If only YMD is provided, use local midnight time
  const dt = isYMD(value) ? parseYMDToDate(String(value).slice(0, 10)) : new Date(value);
  if (isNaN(dt.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dd = pad(dt.getDate());
  const mm = pad(dt.getMonth() + 1);
  const yyyy = dt.getFullYear();
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

// For API: ensure backend does not shift day by timezone
// If your backend expects a DateTime, send noon in local day
export const toAPIDateLocal = (ymd: string): string => `${ymd}T12:00:00`;

// Format a Date as ISO 8601 with local timezone offset, e.g. 2025-08-08T09:05:12-03:00
export const toAPIDateTimeLocal = (dt: Date): string => {
  if (!(dt instanceof Date) || isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = dt.getFullYear();
  const month = pad(dt.getMonth() + 1);
  const day = pad(dt.getDate());
  const hour = pad(dt.getHours());
  const minute = pad(dt.getMinutes());
  const second = pad(dt.getSeconds());
  const tzOffset = -dt.getTimezoneOffset(); // minutes east of UTC
  const sign = tzOffset >= 0 ? '+' : '-';
  const tzh = pad(Math.floor(Math.abs(tzOffset) / 60));
  const tzm = pad(Math.abs(tzOffset) % 60);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${tzh}:${tzm}`;
};
