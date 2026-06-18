import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

function SkeletonCard({ wide }: { wide?: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.circle} />
        <View style={styles.lines}>
          <View style={[styles.line, wide ? styles.lineWide : styles.lineMedium]} />
          <View style={[styles.line, styles.lineShort]} />
        </View>
      </View>
    </View>
  );
}

export function TasksSkeleton() {
  return (
    <View style={styles.container}>
      {[false, true, false, true, false, false].map((wide, i) => (
        <SkeletonCard key={i} wide={wide} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
  lines: {
    flex: 1,
    gap: 6,
  },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  lineWide: { width: '75%' },
  lineMedium: { width: '60%' },
  lineShort: { width: '35%' },
});
