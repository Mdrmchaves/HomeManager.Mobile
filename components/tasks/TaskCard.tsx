import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Circle,
  CheckCircle2,
  Repeat,
  Edit3,
  Trash2,
  RotateCcw,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { startOfToday } from '../../utils/taskDates';
import type { Task } from '../../types/task';

const MONTHS_PT = [
  'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
  'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.',
];

function formatDueLabel(task: Task, today: Date): string {
  if (task.status === 'completed') return 'Concluída';
  if (!task.dueDate) return 'Sem prazo';

  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Venceu ontem';
  if (diff < 0) return `Venceu há ${Math.abs(diff)} dias`;

  return `${due.getDate()} ${MONTHS_PT[due.getMonth()]}`;
}

interface TaskCardProps {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const TaskCard = memo(function TaskCard({
  task,
  expanded,
  onToggle,
  onComplete,
  onReopen,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const today = startOfToday();
  const isOverdue =
    task.status === 'active' &&
    !!task.dueDate &&
    new Date(task.dueDate) < today;
  const isCompleted = task.status === 'completed';
  const isRecurring = !!task.recurrenceId;
  const dueLabel = formatDueLabel(task, today);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isOverdue && styles.cardOverdue,
        isCompleted && styles.cardCompleted,
        expanded && styles.cardExpanded,
      ]}
      onLongPress={onToggle}
      onPress={expanded ? onToggle : undefined}
      delayLongPress={350}
      activeOpacity={0.75}
    >
      {/* Main row */}
      <View style={styles.cardTop}>
        {isCompleted ? (
          <CheckCircle2 size={20} color={Colors.primary} strokeWidth={2} />
        ) : (
          <Circle
            size={20}
            color={isOverdue ? Colors.error : Colors.textSecondary}
            strokeWidth={2}
          />
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[styles.cardTitle, isCompleted && styles.cardTitleCompleted]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            {isRecurring && (
              <Repeat size={13} color={Colors.textSecondary} strokeWidth={2} />
            )}
          </View>
          {!!task.assigneeName && (
            <Text style={styles.cardAssignee}>{task.assigneeName}</Text>
          )}
          <Text style={[styles.cardDate, isOverdue && styles.cardDateOverdue]}>
            {dueLabel}
          </Text>
        </View>
      </View>

      {/* Accordion */}
      {expanded && (
        <View style={styles.accordion}>
          <View style={styles.accordionDivider} />
          <View style={styles.accordionActions}>
            {!isCompleted ? (
              <>
                <TouchableOpacity style={styles.accordionBtn} onPress={onComplete}>
                  <CheckCircle2 size={14} color={Colors.primary} strokeWidth={2} />
                  <Text style={[styles.accordionBtnText, { color: Colors.primary }]}>
                    Concluir
                  </Text>
                </TouchableOpacity>
                <View style={styles.accordionSep} />
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.accordionBtn} onPress={onReopen}>
                  <RotateCcw size={14} color={Colors.textSecondary} strokeWidth={2} />
                  <Text style={[styles.accordionBtnText, { color: Colors.textSecondary }]}>
                    Reabrir
                  </Text>
                </TouchableOpacity>
                <View style={styles.accordionSep} />
              </>
            )}
            <TouchableOpacity style={styles.accordionBtn} onPress={onEdit}>
              <Edit3 size={14} color={Colors.primary} strokeWidth={2} />
              <Text style={[styles.accordionBtnText, { color: Colors.primary }]}>
                Editar
              </Text>
            </TouchableOpacity>
            <View style={styles.accordionSep} />
            <TouchableOpacity style={styles.accordionBtn} onPress={onDelete}>
              <Trash2 size={14} color={Colors.error} strokeWidth={2} />
              <Text style={[styles.accordionBtnText, { color: Colors.error }]}>
                Apagar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardOverdue: {
    backgroundColor: '#FFF5F5',
    borderColor: '#F5C6C6',
  },
  cardCompleted: {
    opacity: 0.6,
  },
  cardExpanded: {
    borderColor: Colors.primary,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  cardAssignee: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardDateOverdue: {
    color: Colors.error,
    fontWeight: '600',
  },
  accordion: {
    paddingTop: 4,
  },
  accordionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 10,
    marginBottom: 8,
  },
  accordionActions: {
    flexDirection: 'row',
  },
  accordionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
  },
  accordionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accordionSep: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
});
