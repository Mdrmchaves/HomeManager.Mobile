import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';

export default function DespensaTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🛒</Text>
      <Text style={styles.title}>Despensa</Text>
      <Text style={styles.subtitle}>Em breve...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
