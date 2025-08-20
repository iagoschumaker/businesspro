/**
 * Utilitários para formatação e manipulação de datas
 */

/**
 * Formata uma data no formato ISO (YYYY-MM-DD) para o formato brasileiro (DD/MM/YYYY)
 * @param isoDate String de data no formato ISO (YYYY-MM-DD)
 * @returns String formatada no padrão brasileiro
 */
export const formatDateBr = (isoDate: string): string => {
  if (!isoDate) return '';
  
  try {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return isoDate;
  }
};

/**
 * Formata uma data e hora para exibição amigável
 * @param isoDate Data no formato ISO (YYYY-MM-DD)
 * @param time Hora no formato HH:MM
 * @returns String formatada com data e hora
 */
export const formatDateTimeBr = (isoDate: string, time: string): string => {
  const dateBr = formatDateBr(isoDate);
  return `${dateBr} às ${time}`;
};

/**
 * Retorna a data atual no formato ISO (YYYY-MM-DD)
 * @returns String com a data atual
 */
export const getCurrentISODate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Verifica se uma data já passou
 * @param isoDate Data no formato ISO (YYYY-MM-DD)
 * @param time Hora no formato HH:MM
 * @returns boolean indicando se a data já passou
 */
export const isDatePast = (isoDate: string, time?: string): boolean => {
  if (!isoDate) return false;
  
  const now = new Date();
  const [year, month, day] = isoDate.split('-').map(Number);
  
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(year, month - 1, day, hours, minutes);
    return date < now;
  } else {
    const date = new Date(year, month - 1, day);
    return date < now;
  }
};
