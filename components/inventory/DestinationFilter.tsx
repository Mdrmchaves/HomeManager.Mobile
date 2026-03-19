import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

// ─── DestinationFilter ────────────────────────────────────────────────────────

type Props = {
  selected: string;
  options: string[];
  onChange: (dest: string) => void;
};

export default function DestinationFilter({ selected, options, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersRow}
      style={styles.filtersScroll}
    >
      {options.map((dest) => (
        <TouchableOpacity
          key={dest}
          style={[styles.chip, selected === dest && styles.chipActive]}
          onPress={() => onChange(dest)}
        >
          <Text style={[styles.chipText, selected === dest && styles.chipTextActive]}>
            {dest}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  filtersScroll: {
    marginBottom: 16,
  },
  filtersRow: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
