import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useToast } from '../../contexts/ToastContext';
import { Plus } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { TaskService } from '../../services/task.service';
import { useHousehold } from '../../contexts/HouseholdContext';
import { DateCarousel } from '../../components/tasks/DateCarousel';
import { TaskCard } from '../../components/tasks/TaskCard';
import { TasksSkeleton } from '../../components/tasks/TasksSkeleton';
import { Colors } from '../../constants/colors';
import { formatDateParam, startOfToday } from '../../utils/taskDates';
import type { Task } from '../../types/task';
import TaskForm from './task-form';

const ItemSeparator = () => <View style={styles.separator} />;

const EmptyList = () => (
  <View style={styles.empty}>
    <Text style={styles.emptyText}>Nenhuma tarefa neste dia.</Text>
  </View>
);

export default function TasksScreen() {
  const { selectedHousehold } = useHousehold();
  const householdId = selectedHousehold?.id;

  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfToday());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>();
  const fetchingRef = useRef(false);
  const { showToast } = useToast();

  const loadTasks = useCallback(async (date: Date) => {
    if (fetchingRef.current) return;
    if (!householdId) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await TaskService.getTasksByDate(householdId, formatDateParam(date));
      setTasks(result ?? []);
    } catch {
      setError('Erro ao carregar tarefas.');
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [householdId]);

  // Reload when date or household changes while already focused
  useEffect(() => {
    loadTasks(selectedDate);
    setExpandedTaskId(null);
  }, [loadTasks, selectedDate]);

  // Reload when regaining focus (e.g. returning from another tab); clear on blur
  const refreshRef = useRef<() => void>(() => {});
  refreshRef.current = () => loadTasks(selectedDate);

  useFocusEffect(
    useCallback(() => {
      refreshRef.current();
      return () => {
        setTasks([]);
        setExpandedTaskId(null);
      };
    }, [])
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async (task: Task) => {
    setExpandedTaskId(null);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: 'completed', completedAt: new Date().toISOString() }
          : t
      )
    );
    try {
      await TaskService.completeTask(task.id);
    } catch {
      showToast('Não foi possível concluir a tarefa.', 'error');
      loadTasks(selectedDate);
    }
  }, [loadTasks, selectedDate, showToast]);

  const handleReopen = useCallback(async (task: Task) => {
    setExpandedTaskId(null);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: 'active', completedAt: undefined } : t
      )
    );
    try {
      await TaskService.reopenTask(task.id);
    } catch {
      showToast('Não foi possível reabrir a tarefa.', 'error');
      loadTasks(selectedDate);
    }
  }, [loadTasks, selectedDate]);

  const handleDelete = useCallback((task: Task) => {
    setExpandedTaskId(null);
    Alert.alert('Apagar tarefa', `Apagar "${task.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          try {
            await TaskService.deleteTask(task.id);
          } catch {
            showToast('Não foi possível apagar a tarefa.', 'error');
            loadTasks(selectedDate);
          }
        },
      },
    ]);
  }, [loadTasks, selectedDate, showToast]);

  const handleEdit = useCallback((task: Task) => {
    setExpandedTaskId(null);
    setEditTask(task);
    setShowForm(true);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditTask(undefined);
    setShowForm(true);
  }, []);

  const handleSaved = useCallback(() => {
    setShowForm(false);
    loadTasks(selectedDate);
  }, [loadTasks, selectedDate]);

  const renderItem = useCallback(({ item }: { item: Task }) => (
    <TaskCard
      task={item}
      expanded={expandedTaskId === item.id}
      onToggle={() => setExpandedTaskId((prev) => (prev === item.id ? null : item.id))}
      onComplete={() => handleComplete(item)}
      onReopen={() => handleReopen(item)}
      onEdit={() => handleEdit(item)}
      onDelete={() => handleDelete(item)}
    />
  ), [expandedTaskId, handleComplete, handleReopen, handleEdit, handleDelete]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <DateCarousel selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {loading ? (
        <TasksSkeleton />
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          ListEmptyComponent={EmptyList}
          ItemSeparatorComponent={ItemSeparator}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreateForm}>
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Form modal */}
      <TaskForm
        visible={showForm}
        householdId={householdId ?? ''}
        task={editTask}
        defaultDate={selectedDate}
        onClose={() => setShowForm(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  separator: {
    height: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
});
