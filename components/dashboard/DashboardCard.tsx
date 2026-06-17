import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  onPress?: () => void;
  children: ReactNode;
}

export function DashboardCard({ title, onPress, children }: Props) {
  if (onPress) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <ChevronRight size={16} color={Colors.textSecondary} />
        </View>
        {children}
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.card}>
      <Text style={[styles.title, { marginBottom: 12 }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
