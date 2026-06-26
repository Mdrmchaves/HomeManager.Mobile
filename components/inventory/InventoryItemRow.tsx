import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Edit3, Trash2, LogOut } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { getDestinationMeta, getDestinationLabel, DEFAULT_BAR_COLOR } from '@/constants/destinations';
import type { InventoryItem } from '@/types/inventory-item';

export { getDestinationLabel };

type Props = {
  item: InventoryItem;
  isLast: boolean;
  photoUrls: Record<string, string>;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onResolve: () => void;
  onDelete: () => void;
};

function InventoryItemRow({
  item,
  isLast,
  photoUrls,
  expanded,
  onToggle,
  onEdit,
  onResolve,
  onDelete,
}: Props) {
  const destMeta = getDestinationMeta(item.destination);
  const signedUrl = item.photoUrl ? photoUrls[item.photoUrl] : null;
  const barColor = destMeta?.barColor ?? DEFAULT_BAR_COLOR;

  return (
    <View style={[itemStyles.card, expanded && itemStyles.cardExpanded]}>
      <TouchableOpacity
        style={itemStyles.row}
        onLongPress={onToggle}
        onPress={expanded ? onToggle : undefined}
        delayLongPress={350}
        activeOpacity={0.75}
      >
        <View style={[itemStyles.colorBar, { backgroundColor: barColor }]} />

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

      {expanded && (
        <View style={itemStyles.accordion}>
          <View style={itemStyles.accordionDivider} />
          <View style={itemStyles.accordionActions}>
            <TouchableOpacity style={itemStyles.accordionBtn} onPress={onEdit}>
              <Edit3 size={14} color={Colors.primary} strokeWidth={2} />
              <Text style={[itemStyles.accordionBtnText, { color: Colors.primary }]}>Editar</Text>
            </TouchableOpacity>
            <View style={itemStyles.accordionSep} />
            <TouchableOpacity style={itemStyles.accordionBtn} onPress={onResolve}>
              <LogOut size={14} color={Colors.primary} strokeWidth={2} />
              <Text style={[itemStyles.accordionBtnText, { color: Colors.primary }]}>Dar saída</Text>
            </TouchableOpacity>
            <View style={itemStyles.accordionSep} />
            <TouchableOpacity style={itemStyles.accordionBtn} onPress={onDelete}>
              <Trash2 size={14} color={Colors.error} strokeWidth={2} />
              <Text style={[itemStyles.accordionBtnText, { color: Colors.error }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!expanded && <View style={itemStyles.divider} />}
    </View>
  );
}

export default memo(InventoryItemRow);

const itemStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: Colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    minHeight: 72,
  },
  divider: {
    height: 0,
  },
  colorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: Colors.background,
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
    fontWeight: '600',
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
  accordion: {
    paddingBottom: 4,
  },
  accordionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
    marginBottom: 4,
  },
  accordionActions: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  accordionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  accordionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accordionSep: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
});
