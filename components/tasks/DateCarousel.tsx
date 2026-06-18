import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

const WEEKDAYS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const ITEM_WIDTH = 52;
const TODAY_INDEX = 60;

function buildDateWindow(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = -60; offset <= 60; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    days.push(d);
  }
  return days;
}

const DATE_WINDOW = buildDateWindow();

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface DateCarouselProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function DateCarousel({ selectedDate, onSelectDate }: DateCarouselProps) {
  const flatListRef = useRef<FlatList<Date>>(null);
  const today = DATE_WINDOW[TODAY_INDEX];

  useEffect(() => {
    // Scroll to today on mount
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: TODAY_INDEX,
        animated: false,
        viewPosition: 0.5,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={DATE_WINDOW}
        keyExtractor={(_, i) => String(i)}
        horizontal
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: index * ITEM_WIDTH,
              animated: false,
            });
          }, 100);
        }}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: date }) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          return (
            <TouchableOpacity
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                !isSelected && isToday && styles.chipToday,
              ]}
              onPress={() => onSelectDate(date)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.weekday, isSelected && styles.textSelected]}
              >
                {WEEKDAYS_PT[date.getDay()]}
              </Text>
              <Text
                style={[styles.dayNum, isSelected && styles.textSelected]}
              >
                {date.getDate()}
              </Text>
              {isToday && !isSelected && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listContent: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  chip: {
    width: ITEM_WIDTH - 4,
    marginRight: 4,
    flexShrink: 0,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
  },
  chipToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  weekday: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  textSelected: {
    color: '#fff',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
});
