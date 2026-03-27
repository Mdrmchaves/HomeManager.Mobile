import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { useHousehold } from '../../contexts/HouseholdContext';

export default function DashboardScreen() {
  const { selectedHousehold } = useHousehold();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Início</Text>
      {selectedHousehold && (
        <Text style={styles.householdName}>{selectedHousehold.name}</Text>
      )}
      <Text style={styles.subtitle}>Dashboard — em breve</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  householdName: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
