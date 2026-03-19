import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';
import type { InventoryItem } from '@/types/inventory-item';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DESTINATION_MAP: Record<string, string> = {
  Keep: 'Manter',
  Sell: 'Vender',
  Donate: 'Doar',
  Trash: 'Descartar',
};

const DESTINATION_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  Manter: { bg: '#d1fae5', text: '#065f46' },
  Vender: { bg: '#dbeafe', text: '#1e40af' },
  Doar: { bg: '#ede9fe', text: '#5b21b6' },
  Descartar: { bg: '#fee2e2', text: '#991b1b' },
};

const DESTINATION_BAR_COLORS: Record<string, string> = {
  Keep: '#059669',
  Sell: '#2563eb',
  Donate: '#7c3aed',
  Trash: '#dc2626',
};

export function getDestinationLabel(destination?: string): string | null {
  if (!destination || destination === 'Undecided') return null;
  return DESTINATION_MAP[destination] ?? null;
}

export function getDestinationBarColor(destination?: string): string {
  if (!destination || destination === 'Undecided') return '#d1d5db';
  return DESTINATION_BAR_COLORS[destination] ?? '#d1d5db';
}

// ─── InventoryItemRow ─────────────────────────────────────────────────────────

type Props = {
  item: InventoryItem;
  isLast: boolean;
  photoUrls: Record<string, string>;
  onEdit: () => void;
};

export default function InventoryItemRow({ item, isLast, photoUrls, onEdit }: Props) {
  const destLabel = getDestinationLabel(item.destination);
  const destBadgeStyle = destLabel ? DESTINATION_BADGE_STYLES[destLabel] : null;
  const signedUrl = item.photoUrl ? photoUrls[item.photoUrl] : null;
  const barColor = getDestinationBarColor(item.destination);

  return (
    <View style={[itemStyles.row, !isLast && itemStyles.rowBorder]}>
      {/* Colored left bar */}
      <View style={[itemStyles.colorBar, { backgroundColor: barColor }]} />

      {/* Photo */}
      {signedUrl ? (
        <Image
          source={{ uri: signedUrl }}
          style={itemStyles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={null}
        />
      ) : (
        <View style={itemStyles.photoPlaceholder}>
          <Text style={itemStyles.photoEmoji}>📦</Text>
        </View>
      )}

      {/* Info */}
      <View style={itemStyles.info}>
        <Text style={itemStyles.name} numberOfLines={1}>
          {item.name}
          {item.quantity != null && item.quantity > 1 && (
            <Text style={itemStyles.qty}> ×{item.quantity}</Text>
          )}
        </Text>

        {destLabel && destBadgeStyle && (
          <View style={itemStyles.badges}>
            <View style={[itemStyles.destBadge, { backgroundColor: destBadgeStyle.bg }]}>
              <Text style={[itemStyles.destBadgeText, { color: destBadgeStyle.text }]}>
                {destLabel}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Edit button */}
      <TouchableOpacity style={itemStyles.editButton} onPress={onEdit}>
        <Text style={itemStyles.editButtonText}>Editar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Item row styles ──────────────────────────────────────────────────────────

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEmoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  qty: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  destBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  destBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
});
