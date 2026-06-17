import { View, Text, StyleSheet } from 'react-native';
import { CATEGORY_COLORS, CATEGORY_SHORT_LABELS } from '../../constants/finance-constants';
import type { FinanceCategory } from '../../types/finance';

interface Props {
  category: FinanceCategory;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'md' }: Props) {
  const colors = CATEGORY_COLORS[category];
  const label = CATEGORY_SHORT_LABELS[category];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        isSmall && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.dot }, isSmall && styles.dotSm]} />
      <Text
        style={[styles.label, { color: colors.text }, isSmall && styles.labelSm]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSm: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
  },
});
