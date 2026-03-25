import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import type { ReactNode } from 'react';
import { Colors } from '@/constants/colors';
import { ItemMenuContextProvider, useItemMenu, useItemMenuState } from '@/contexts/ItemMenuContext';
import { STATUS_BAR_HEIGHT } from '@/app/(app)/_layout';

// ─── Modal (rendered inside the context provider) ─────────────────────────────

function ItemMenuModal() {
  const { closeMenu } = useItemMenu();
  const { isVisible, menuItem, menuLayout, menuActions } = useItemMenuState();

  if (!menuLayout) return null;

  const MENU_ITEM_HEIGHT = 44;
  const MENU_HEADER_HEIGHT = 44;
  const screenHeight = Dimensions.get('window').height - STATUS_BAR_HEIGHT;
  const menuEstimatedHeight = MENU_HEADER_HEIGHT + menuActions.length * MENU_ITEM_HEIGHT;
  const spaceBelow = screenHeight - (menuLayout.top + menuLayout.itemHeight);
  const opensAbove = spaceBelow < menuEstimatedHeight;
  const menuTop = opensAbove
    ? menuLayout.top - menuEstimatedHeight
    : menuLayout.top + menuLayout.itemHeight;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={closeMenu}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        activeOpacity={1}
        onPress={closeMenu}
      >
        <View
          style={[
            styles.card,
            { top: menuTop, left: menuLayout.left, width: menuLayout.width },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText} numberOfLines={1}>
              {menuItem?.name}
            </Text>
          </View>

          {/* Actions */}
          {menuActions.map((action, idx) => (
            <View key={idx}>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  action.onPress();
                  closeMenu();
                }}
              >
                <Text style={[styles.optionText, action.destructive && { color: Colors.error }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── ItemMenuProvider ─────────────────────────────────────────────────────────

export default function ItemMenuProvider({ children }: { children: ReactNode }) {
  return (
    <ItemMenuContextProvider>
      {children}
      <ItemMenuModal />
    </ItemMenuContextProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
