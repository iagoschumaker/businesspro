/**
 * Declaração de tipos para as funções de utilidades de datas
 */

export function formatDateBr(isoDate: string): string;
export function formatDateTimeBr(isoDate: string, time: string): string;
export function getCurrentISODate(): string;
export function isDatePast(isoDate: string, time?: string): boolean;
