import { Text, StyleSheet, TextStyle } from 'react-native';
import { CURRENCY_SYMBOLS } from '../../constants/finance-constants';
import { Colors } from '../../constants/colors';
import type { TransactionType } from '../../types/finance';
import type { SupportedCurrency } from '../../constants/finance-constants';

interface Props {
  amount: number;
  currency: string;
  type?: TransactionType;
  style?: TextStyle;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  neutral?: boolean; // não colorir por tipo
}

export function AmountText({ amount, currency, type, style, size = 'md', neutral = false }: Props) {
  const symbol = CURRENCY_SYMBOLS[currency as SupportedCurrency] ?? currency;
  const formatted = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const sign = type === 'income' ? '+' : type === 'expense' ? '−' : '';
  const color = neutral
    ? Colors.textPrimary
    : type === 'income'
    ? '#059669'
    : type === 'expense'
    ? Colors.error
    : Colors.textSecondary;

  return (
    <Text style={[styles.base, styles[size], { color }, style]}>
      {sign}{symbol} {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: '600',
  },
  sm: { fontSize: 12 },
  md: { fontSize: 14 },
  lg: { fontSize: 18 },
  xl: { fontSize: 24 },
});
