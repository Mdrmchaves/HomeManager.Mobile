import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';
import PertencesTab from './pertences';
import DespensaTab from './despensa';

type ActiveTab = 'pertences' | 'despensa';

export default function InventoryScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pertences');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventário</Text>

        {/* Pill tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pertences' && styles.tabActive]}
            onPress={() => setActiveTab('pertences')}
          >
            <Text style={[styles.tabText, activeTab === 'pertences' && styles.tabTextActive]}>
              Pertences
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'despensa' && styles.tabActive]}
            onPress={() => setActiveTab('despensa')}
          >
            <Text style={[styles.tabText, activeTab === 'despensa' && styles.tabTextActive]}>
              Despensa
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        {activeTab === 'pertences' ? <PertencesTab /> : <DespensaTab />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 20,
    padding: 4,
    alignSelf: 'flex-start',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});
