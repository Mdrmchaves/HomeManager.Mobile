import { View, TextInput, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

// ─── SearchBar ────────────────────────────────────────────────────────────────

type Props = {
  value: string;
  onChange: (text: string) => void;
};

export default function SearchBar({ value, onChange }: Props) {
  return (
    <View style={styles.searchBar}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Pesquisar pertences..."
        placeholderTextColor={Colors.textSecondary}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
});
