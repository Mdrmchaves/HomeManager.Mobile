import { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import InventoryItemRow from '@/components/inventory/InventoryItemRow';
import type { InventoryItem } from '@/types/inventory-item';
import type { Location } from '@/types/location';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Group {
  locationId: string | null;
  locationName: string;
  locationIcon?: string;
  location: Location | null;
  items: InventoryItem[];
}

// ─── LocationGroupCard ────────────────────────────────────────────────────────

type Props = {
  group: Group;
  collapsed: boolean;
  photoUrls: Record<string, string>;
  onToggle: () => void;
  onEditItem: (item: InventoryItem) => void;
  onAddItem: () => void;
  onOpenMenu: (top: number) => void;
};

export default function LocationGroupCard({
  group,
  collapsed,
  photoUrls,
  onToggle,
  onEditItem,
  onAddItem,
  onOpenMenu,
}: Props) {
  const isSemLocal = group.locationId === null;
  const menuButtonRef = useRef<View>(null);

  return (
    <View style={groupStyles.wrapper}>
      <View style={groupStyles.card}>
        {/* Header */}
        <View style={groupStyles.locationHeader}>
          {/* Área clicável para toggle — ocupa todo o espaço menos o ⋮ */}
          <TouchableOpacity
            style={groupStyles.locationHeaderLeft}
            onPress={onToggle}
            activeOpacity={0.7}
          >
            {!!group.locationIcon && (
              <Text style={groupStyles.locationIcon}>{group.locationIcon}</Text>
            )}
            <Text style={[groupStyles.locationHeaderText, isSemLocal && groupStyles.locationHeaderTextMuted]}>
              {group.locationName}
            </Text>
            <View style={groupStyles.locationBadge}>
              <Text style={groupStyles.locationBadgeText}>{group.items.length}</Text>
            </View>
            <Text style={groupStyles.locationChevron}>{collapsed ? '▸' : '▾'}</Text>
          </TouchableOpacity>

          {/* Botão menu — separado, não propaga para o toggle */}
          {group.location && (
            <TouchableOpacity
              ref={menuButtonRef as any}
              style={groupStyles.locationMenuButton}
              onPress={() => {
                menuButtonRef.current?.measure((_x, _y, _width, height, _pageX, pageY) => {
                  onOpenMenu(pageY + height);
                });
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={groupStyles.locationMenuIcon}>⋮</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Items + add button */}
        {!collapsed && (
          <>
            {group.items.map((item, idx) => (
              <InventoryItemRow
                key={item.id}
                item={item}
                isLast={idx === group.items.length - 1}
                photoUrls={photoUrls}
                onEdit={() => onEditItem(item)}
              />
            ))}

            {!isSemLocal && (
              <TouchableOpacity style={groupStyles.addItemBtn} onPress={onAddItem}>
                <Text style={groupStyles.addItemBtnPlus}>+</Text>
                <Text style={groupStyles.addItemBtnText}>Adicionar a {group.locationName}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Group card styles ────────────────────────────────────────────────────────

const groupStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  locationHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationIcon: {
    fontSize: 18,
  },
  locationHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  locationHeaderTextMuted: {
    color: Colors.textSecondary,
  },
  locationBadge: {
    backgroundColor: Colors.border,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBadgeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  locationChevron: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  locationMenuButton: {
    padding: 8,
  },
  locationMenuIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addItemBtnPlus: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '300',
  },
  addItemBtnText: {
    fontSize: 14,
    color: Colors.primary,
  },
});
