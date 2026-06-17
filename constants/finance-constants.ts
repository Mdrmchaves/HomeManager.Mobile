import type { FinanceCategory } from '../types/finance';

export const FINANCE_CATEGORIES: FinanceCategory[] = ['lf', 'cf', 'co', 'mt', 'pr', 'es'];

export const CATEGORY_LABELS: Record<FinanceCategory, string> = {
  lf: 'Liberdade Financeira',
  cf: 'Custos Fixos',
  co: 'Conforto',
  mt: 'Metas',
  pr: 'Prazeres',
  es: 'Estudo',
};

export const CATEGORY_SHORT_LABELS: Record<FinanceCategory, string> = {
  lf: 'Lib. Financeira',
  cf: 'Custos Fixos',
  co: 'Conforto',
  mt: 'Metas',
  pr: 'Prazeres',
  es: 'Estudo',
};

// Cores hex para React Native (não Tailwind classes)
export const CATEGORY_COLORS: Record<FinanceCategory, { bg: string; text: string; dot: string }> = {
  lf: { bg: '#ede9fe', text: '#6d28d9', dot: '#8b5cf6' },
  cf: { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  co: { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  mt: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  pr: { bg: '#fce7f3', text: '#9d174d', dot: '#ec4899' },
  es: { bg: '#cffafe', text: '#155e75', dot: '#06b6d4' },
};

export const SUPPORTED_CURRENCIES = ['BRL', 'EUR', 'USD', 'PYG'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  BRL: 'R$',
  EUR: '€',
  USD: '$',
  PYG: '₲',
};

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  BRL: 'Real Brasileiro',
  EUR: 'Euro',
  USD: 'Dólar Americano',
  PYG: 'Guarani Paraguaio',
};
