import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Home, Package } from 'lucide-react-native';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { HouseholdService } from '../../services/household.service';
import { AuthService, supabase } from '../../services/auth.service';
import { Colors } from '../../constants/colors';
import type { Household } from '../../types/household';

// ─── Context ─────────────────────────────────────────────────────────────────

interface HouseholdContextValue {
  selectedHousehold: Household | null;
  households: Household[];
  refreshHouseholds: () => Promise<void>;
  setSelectedHousehold: (h: Household) => void;
}

const HouseholdContext = createContext<HouseholdContextValue>({
  selectedHousehold: null,
  households: [],
  refreshHouseholds: async () => {},
  setSelectedHousehold: () => {},
});

export function useHousehold() {
  return useContext(HouseholdContext);
}

// ─── Header ──────────────────────────────────────────────────────────────────

export const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 50;

function AppHeader({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const { selectedHousehold, households, setSelectedHousehold } = useHousehold();
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const avatarLetter = userEmail ? userEmail[0].toUpperCase() : '?';

  return (
    <>
      {/* Header bar */}
      <View style={headerStyles.statusBarSpacer} />
      <View style={headerStyles.container}>
        {/* Household selector */}
        <TouchableOpacity
          style={headerStyles.selectorButton}
          onPress={() => setShowHouseholdModal(true)}
        >
          <Text style={headerStyles.selectorText} numberOfLines={1}>
            {selectedHousehold ? selectedHousehold.name : 'Selecionar casa'}
          </Text>
          <Text style={headerStyles.chevron}>{'▾'}</Text>
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity
          style={headerStyles.avatar}
          onPress={() => setShowAvatarModal(true)}
        >
          <Text style={headerStyles.avatarLetter}>{avatarLetter}</Text>
        </TouchableOpacity>
      </View>

      {/* Household modal */}
      <Modal visible={showHouseholdModal} transparent animationType="fade">
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setShowHouseholdModal(false)}
        >
          {/* Inner TouchableOpacity absorbs touches so card doesn't dismiss */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={modalStyles.topCard}>
              <Text style={modalStyles.cardTitle}>As suas casas</Text>

              {households.map((h, index) => (
                <TouchableOpacity
                  key={h.id}
                  style={[
                    modalStyles.householdItem,
                    index < households.length - 1 && modalStyles.householdItemBorder,
                  ]}
                  onPress={() => {
                    setSelectedHousehold(h);
                    setShowHouseholdModal(false);
                  }}
                >
                  <Text
                    style={[
                      modalStyles.householdItemText,
                      selectedHousehold?.id === h.id && modalStyles.householdItemActive,
                    ]}
                  >
                    {h.name}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={modalStyles.divider} />

              <TouchableOpacity
                style={modalStyles.addButton}
                onPress={() => {
                  setShowHouseholdModal(false);
                  router.push('/(app)/household-setup');
                }}
              >
                <Text style={modalStyles.addButtonText}>+ Adicionar casa</Text>
              </TouchableOpacity>

              <View style={modalStyles.divider} />

              <TouchableOpacity
                style={modalStyles.closeButton}
                onPress={() => setShowHouseholdModal(false)}
              >
                <Text style={modalStyles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Avatar modal */}
      <Modal visible={showAvatarModal} transparent animationType="fade">
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={() => setShowAvatarModal(false)}
        >
          <View style={[modalStyles.avatarCard, { top: STATUS_BAR_HEIGHT + 62 }]}>
            <TouchableOpacity
              onPress={() => {
                setShowAvatarModal(false);
                router.push('/(app)/profile');
              }}
            >
              <Text style={modalStyles.profileText}>Perfil</Text>
            </TouchableOpacity>
            <View style={modalStyles.divider} />
            <TouchableOpacity
              onPress={async () => {
                setShowAvatarModal(false);
                try {
                  await AuthService.signOut();
                } catch {
                  // Mesmo que falhe, forçar limpeza local
                  await supabase.auth.signOut();
                }
              }}
            >
              <Text style={modalStyles.signOutText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [userEmail, setUserEmail] = useState('');

  // Use a ref so refreshHouseholds stays stable (no selectedHousehold dep)
  const selectedRef = useRef<Household | null>(null);
  selectedRef.current = selectedHousehold;

  const refreshHouseholds = useCallback(async () => {
    try {
      const list = await HouseholdService.getMyHouseholds();
      setHouseholds(list);
      // Auto-select first only when nothing is selected yet
      if (list.length > 0 && !selectedRef.current) {
        setSelectedHousehold(list[0]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    refreshHouseholds();
    AuthService.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? '');
    });
  }, []);

  // Refresh when returning to any screen in this group (e.g. after household-setup)
  useFocusEffect(
    useCallback(() => {
      refreshHouseholds();
    }, [refreshHouseholds])
  );

  return (
    <HouseholdContext.Provider
      value={{ selectedHousehold, households, refreshHouseholds, setSelectedHousehold }}
    >
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <AppHeader userEmail={userEmail} />
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.textSecondary,
            tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Início',
              tabBarIcon: ({ focused, color }) => (
                <Home size={22} color={color} strokeWidth={focused ? 2 : 1.5} />
              ),
            }}
          />
          <Tabs.Screen
            name="inventory"
            options={{
              title: 'Inventário',
              tabBarIcon: ({ focused, color }) => (
                <Package size={22} color={color} strokeWidth={focused ? 2 : 1.5} />
              ),
            }}
          />
          <Tabs.Screen name="household-setup" options={{ href: null }} />
          <Tabs.Screen name="profile" options={{ href: null }} />
        </Tabs>
      </View>
    </HouseholdContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const headerStyles = StyleSheet.create({
  statusBarSpacer: {
    height: STATUS_BAR_HEIGHT,
    backgroundColor: Colors.surface,
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 12,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  chevron: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // Household modal card
  topCard: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  householdItem: {
    paddingVertical: 14,
  },
  householdItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  householdItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  householdItemActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  addButton: {
    paddingVertical: 14,
  },
  addButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },

  // Avatar modal card
  avatarCard: {
    position: 'absolute',
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  profileText: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 14,
    fontWeight: '500',
  },
  signOutText: {
    fontSize: 15,
    color: Colors.error,
    paddingVertical: 14,
    fontWeight: '500',
  },
});
