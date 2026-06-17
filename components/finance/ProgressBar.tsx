import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  percent: number;   // 0-100 (pode ultrapassar 100 → vermelho)
  color: string;
  height?: number;
}

export function ProgressBar({ percent, color, height = 6 }: Props) {
  const clamped = Math.min(percent, 100);
  const isOver = percent > 100;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            height,
            borderRadius: height / 2,
            backgroundColor: isOver ? Colors.error : color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
