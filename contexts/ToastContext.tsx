import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [visible, setVisible] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 16, duration: 180, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [opacity, translateY]);

  const showToast = useCallback((msg: string, t: ToastType = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    opacity.setValue(0);
    translateY.setValue(16);
    setMessage(msg);
    setType(t);
    setVisible(true);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(dismiss, 2800);
  }, [opacity, translateY, dismiss]);

  const bg =
    type === 'success' ? '#059669' :
    type === 'error'   ? Colors.error :
    '#374151';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[styles.toast, { backgroundColor: bg, opacity, transform: [{ translateY }] }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity onPress={dismiss} activeOpacity={0.85} style={styles.inner}>
            <Text style={styles.message} numberOfLines={2}>{message}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  inner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
