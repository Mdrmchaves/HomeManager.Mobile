import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { CheckCircle2, Circle, CalendarClock } from 'lucide-react-native';
import { DashboardCard } from './DashboardCard';
import { TaskService } from '../../services/task.service';
import { Colors } from '../../constants/colors';
import { formatDateParam, startOfToday } from '../../utils/taskDates';

function SkeletonLine({ width }: { width: number | string }) {
  return <View style={{ width: width as number, height: 13, borderRadius: 4, backgroundColor: Colors.border }} />;
}

export function TasksSummaryCard({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Only show skeleton on first load; subsequent focus gains refresh silently
      if (!hasDataRef.current) setLoading(true);
      TaskService.getTasksByDate(householdId, formatDateParam(startOfToday()))
        .then((tasks) => {
          hasDataRef.current = true;
          const list = tasks ?? [];
          setTotal(list.length);
          setCompleted(list.filter((t) => t.status === 'completed').length);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [householdId])
  );

  const pending = total - completed;
  const allDone = total > 0 && pending === 0;

  return (
    <DashboardCard title="Tarefas de hoje" onPress={() => router.push('/(app)/tasks')}>
      {loading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonLine width="50%" />
          <SkeletonLine width="65%" />
        </View>
      ) : total === 0 ? (
        <View style={styles.statRow}>
          <CalendarClock size={14} color={Colors.textSecondary} />
          <Text style={styles.statText}>Nenhuma tarefa para hoje</Text>
        </View>
      ) : (
        <View style={styles.stats}>
          <View style={styles.statRow}>
            <CheckCircle2 size={14} color="#059669" />
            <Text style={styles.statText}>
              <Text style={[styles.statBold, { color: '#059669' }]}>{completed}</Text> de{' '}
              <Text style={styles.statBold}>{total}</Text> concluída{total !== 1 ? 's' : ''}
            </Text>
          </View>
          {pending > 0 && !allDone && (
            <View style={styles.statRow}>
              <Circle size={14} color={Colors.warning} />
              <Text style={styles.statText}>
                <Text style={[styles.statBold, { color: Colors.warning }]}>{pending}</Text>{' '}
                pendente{pending !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      )}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: { gap: 8 },
  stats: { gap: 10 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statText: { fontSize: 14, color: Colors.textPrimary },
  statBold: { fontWeight: '700' },
});
