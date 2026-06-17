import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Package, AlertCircle, ArrowRight } from 'lucide-react-native';
import { DashboardCard } from './DashboardCard';
import { InventoryService } from '../../services/inventory.service';
import { Colors } from '../../constants/colors';
import { Destination } from '../../constants/destinations';

function SkeletonLine({ width }: { width: number | string }) {
  return <View style={{ width: width as number, height: 13, borderRadius: 4, backgroundColor: Colors.border }} />;
}

export function InventorySummaryCard({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [total, setTotal] = useState(0);
  const [undecided, setUndecided] = useState(0);
  const [toResolve, setToResolve] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    InventoryService.getCountsByDestination(householdId)
      .then((counts) => {
        let t = 0, u = 0, r = 0;
        for (const c of counts ?? []) {
          t += c.count;
          if (!c.destination || c.destination === Destination.Undecided) u += c.count;
          if (
            c.destination === Destination.Sell ||
            c.destination === Destination.Donate ||
            c.destination === Destination.Trash
          ) r += c.count;
        }
        setTotal(t);
        setUndecided(u);
        setToResolve(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [householdId]);

  return (
    <DashboardCard title="Inventário" onPress={() => router.push('/(app)/inventory')}>
      {loading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonLine width="55%" />
          <SkeletonLine width="65%" />
          <SkeletonLine width="60%" />
        </View>
      ) : (
        <View style={styles.stats}>
          <View style={styles.statRow}>
            <Package size={14} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              <Text style={styles.statBold}>{total}</Text> itens ativos
            </Text>
          </View>
          {undecided > 0 && (
            <View style={styles.statRow}>
              <AlertCircle size={14} color={Colors.warning} />
              <Text style={styles.statText}>
                <Text style={[styles.statBold, { color: Colors.warning }]}>{undecided}</Text> sem destino definido
              </Text>
            </View>
          )}
          {toResolve > 0 && (
            <View style={styles.statRow}>
              <ArrowRight size={14} color={Colors.primary} />
              <Text style={styles.statText}>
                <Text style={[styles.statBold, { color: Colors.primary }]}>{toResolve}</Text> prontos a resolver
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
