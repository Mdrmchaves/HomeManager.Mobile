import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useHousehold } from '../../contexts/HouseholdContext';
import { UserService } from '../../services/user.service';
import { FinanceSummaryCard } from '../../components/dashboard/FinanceSummaryCard';
import { InventorySummaryCard } from '../../components/dashboard/InventorySummaryCard';
import { TasksSummaryCard } from '../../components/dashboard/TasksSummaryCard';
import { Colors } from '../../constants/colors';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function DashboardScreen() {
  const { selectedHousehold } = useHousehold();
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    UserService.getMe()
      .then((u) => setFirstName(u?.name?.split(' ')[0] ?? ''))
      .catch(() => {});
  }, []);

  if (!selectedHousehold) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>
          {greeting()}{firstName ? `, ${firstName}` : ''}!
        </Text>
        <Text style={styles.householdName}>{selectedHousehold.name}</Text>
      </View>

      <FinanceSummaryCard householdId={selectedHousehold.id} />
      <InventorySummaryCard householdId={selectedHousehold.id} />
      <TasksSummaryCard householdId={selectedHousehold.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  greetingSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  householdName: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});
