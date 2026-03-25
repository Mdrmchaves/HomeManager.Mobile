import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';
import { getDestinationMeta, getDestinationLabel, DEFAULT_BAR_COLOR } from '@/constants/destinations';
import type { InventoryItem } from '@/types/inventory-item';

export { getDestinationLabel };

// ─── InventoryItemRow ─────────────────────────────────────────────────────────

type Props = {
  item: InventoryItem;
  isLast: boolean;
  photoUrls: Record<string, string>;
  onEdit: () => void;
  onLongPress: () => void;
};

export default function InventoryItemRow({ item, isLast, photoUrls, onEdit, onLongPress }: Props) {
  const destMeta = getDestinationMeta(item.destination);
  const signedUrl = item.photoUrl ? photoUrls[item.photoUrl] : null;
  const barColor = destMeta?.barColor ?? DEFAULT_BAR_COLOR;

  return (
    <TouchableOpacity
      style={[itemStyles.row, !isLast && itemStyles.rowBorder]}
      onPress={onEdit}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.7}
    >
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

        {destMeta && (
          <View style={itemStyles.badges}>
            <View style={[itemStyles.destBadge, { backgroundColor: destMeta.badge.bg }]}>
              <Text style={[itemStyles.destBadgeText, { color: destMeta.badge.text }]}>
                {destMeta.label}
              </Text>
            </View>
          </View>
        )}

        {item.ownerName && (
          <Text style={itemStyles.ownerName}>👤 {item.ownerName}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Item row styles ──────────────────────────────────────────────────────────

const itemStyles = StyleSheet.create({
  row: {
    flex: 1,
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
  ownerName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
