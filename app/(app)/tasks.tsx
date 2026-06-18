import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
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

export default function TasksScreen() {
  const { selectedHousehold } = useHousehold();

  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfToday());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>();
  const fetchingRef = useRef(false);

  async function loadTasks(date: Date) {
    if (fetchingRef.current) return;
    if (!selectedHousehold) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await TaskService.getTasksByDate(
        selectedHousehold.id,
        formatDateParam(date)
      );
      setTasks(result ?? []);
    } catch {
      setError('Erro ao carregar tarefas.');
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks(selectedDate);
    setExpandedTaskId(null);
  }, [selectedDate, selectedHousehold?.id]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setTasks([]);
        setExpandedTaskId(null);
      };
    }, [])
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleComplete(task: Task) {
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
      Alert.alert('Erro', 'Não foi possível concluir a tarefa.');
      loadTasks(selectedDate);
    }
  }

  async function handleReopen(task: Task) {
    setExpandedTaskId(null);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: 'active', completedAt: undefined } : t
      )
    );
    try {
      await TaskService.reopenTask(task.id);
    } catch {
      Alert.alert('Erro', 'Não foi possível reabrir a tarefa.');
      loadTasks(selectedDate);
    }
  }

  function handleDelete(task: Task) {
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
            Alert.alert('Erro', 'Não foi possível apagar.');
            loadTasks(selectedDate);
          }
        },
      },
    ]);
  }

  function handleEdit(task: Task) {
    setExpandedTaskId(null);
    setEditTask(task);
    setShowForm(true);
  }

  function openCreateForm() {
    setEditTask(undefined);
    setShowForm(true);
  }

  function handleSaved() {
    setShowForm(false);
    loadTasks(selectedDate);
  }

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
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              expanded={expandedTaskId === item.id}
              onToggle={() =>
                setExpandedTaskId((prev) => (prev === item.id ? null : item.id))
              }
              onComplete={() => handleComplete(item)}
              onReopen={() => handleReopen(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma tarefa neste dia.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreateForm}>
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Form modal */}
      <TaskForm
        visible={showForm}
        householdId={selectedHousehold?.id ?? ''}
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
