import { useCallback, useRef } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

const WEEKDAYS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ARROW_WIDTH = 40;
const ITEM_WIDTH = 56;
const DATE_AREA_WIDTH = Dimensions.get('window').width - ARROW_WIDTH * 2;
// Padding so that item 0 and the last item can reach the center
const SIDE_PADDING = (DATE_AREA_WIDTH - ITEM_WIDTH) / 2;
const TODAY_INDEX = 60;
const TOTAL = 121; // -60..+60

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
const THIS_YEAR = new Date().getFullYear();

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
  // Tracks current center index so arrow handlers don't need state
  const currentIndexRef = useRef(TODAY_INDEX);

  const scrollTo = useCallback((index: number, animated: boolean) => {
    const clamped = Math.max(0, Math.min(TOTAL - 1, index));
    flatListRef.current?.scrollToOffset({ offset: clamped * ITEM_WIDTH, animated });
    currentIndexRef.current = clamped;
  }, []);

  function handleScrollEnd(event: { nativeEvent: { contentOffset: { x: number } } }) {
    const index = Math.max(
      0,
      Math.min(TOTAL - 1, Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH))
    );
    currentIndexRef.current = index;
    onSelectDate(DATE_WINDOW[index]);
  }

  function handlePrev() {
    const next = Math.max(0, currentIndexRef.current - 1);
    scrollTo(next, true);
    onSelectDate(DATE_WINDOW[next]);
  }

  function handleNext() {
    const next = Math.min(TOTAL - 1, currentIndexRef.current + 1);
    scrollTo(next, true);
    onSelectDate(DATE_WINDOW[next]);
  }

  const today = DATE_WINDOW[TODAY_INDEX];
  const month = MONTHS_PT[selectedDate.getMonth()];
  const monthLabel =
    selectedDate.getFullYear() === THIS_YEAR
      ? month
      : `${month} ${selectedDate.getFullYear()}`;

  return (
    <View style={styles.container}>
      <Text style={styles.monthLabel}>{monthLabel}</Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.arrowBtn} onPress={handlePrev} activeOpacity={0.6}>
          <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>

        <FlatList
          ref={flatListRef}
          data={DATE_WINDOW}
          keyExtractor={(_, i) => String(i)}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
          contentOffset={{ x: TODAY_INDEX * ITEM_WIDTH, y: 0 }}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          renderItem={({ item: date }) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            return (
              <View
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                  !isSelected && isToday && styles.chipToday,
                ]}
              >
                <Text style={[styles.weekday, isSelected && styles.textSelected]}>
                  {WEEKDAYS_PT[date.getDay()]}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.textSelected]}>
                  {date.getDate()}
                </Text>
                {isToday && !isSelected && <View style={styles.todayDot} />}
              </View>
            );
          }}
        />

        <TouchableOpacity style={styles.arrowBtn} onPress={handleNext} activeOpacity={0.6}>
          <ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 8,
    paddingBottom: 10,
  },
  monthLabel: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowBtn: {
    width: ARROW_WIDTH,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    width: ITEM_WIDTH,
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
