import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { TaskService } from '../../services/task.service';
import { HouseholdService } from '../../services/household.service';
import { Colors } from '../../constants/colors';
import { formatDateParam, startOfToday } from '../../utils/taskDates';
import type { Task, CreateTaskRequest, RecurrencePattern } from '../../types/task';
import type { HouseholdUser } from '../../types/household';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskFormProps {
  visible: boolean;
  householdId: string;
  task?: Task;
  defaultDate?: Date;
  onClose: () => void;
  onSaved: (saved: Task | null) => void;
}

type RecurrenceOption = 'never' | RecurrencePattern;

const WEEKDAYS_PT = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado',
];

const MONTHS_PT_SHORT = [
  'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
  'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.',
];

function formatDateLabel(date: Date | null): string {
  if (!date) return 'Sem prazo';
  const today = startOfToday();
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return `${date.getDate()} ${MONTHS_PT_SHORT[date.getMonth()]}`;
}

// Build options: Sem prazo, Hoje, Amanhã, + 12 more days
function buildDateOptions(): Array<{ label: string; date: Date | null }> {
  const options: Array<{ label: string; date: Date | null }> = [
    { label: 'Sem prazo', date: null },
  ];
  const today = startOfToday();
  for (let i = 0; i <= 13; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : `${d.getDate()} ${MONTHS_PT_SHORT[d.getMonth()]}`;
    options.push({ label, date: d });
  }
  return options;
}

const DATE_OPTIONS = buildDateOptions();

// ─── Picker modal (reusable) ──────────────────────────────────────────────────

function PickerModal<T>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Array<{ label: string; value: T }>;
  selectedValue: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={pickerStyles.sheet}>
            <View style={pickerStyles.header}>
              <Text style={pickerStyles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {options.map((opt) => (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[
                    pickerStyles.option,
                    opt.value === selectedValue && pickerStyles.optionActive,
                  ]}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      pickerStyles.optionText,
                      opt.value === selectedValue && pickerStyles.optionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TaskForm({
  visible,
  householdId,
  task,
  defaultDate,
  onClose,
  onSaved,
}: TaskFormProps) {
  const isEditing = !!task;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceOption>('never');
  const [recurrenceDay, setRecurrenceDay] = useState<number>(1);

  const [members, setMembers] = useState<HouseholdUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [showRecurrenceDayPicker, setShowRecurrenceDayPicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTitleError(false);
    setSaving(false);

    HouseholdService.getHousehold(householdId)
      .then((h) => setMembers(h.householdUsers ?? []))
      .catch(() => setMembers([]));

    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setAssigneeId(task.assigneeId ?? '');
      setDueDate(task.dueDate ? (() => { const d = new Date(task.dueDate!); d.setHours(0,0,0,0); return d; })() : null);
      setRecurrence('never');
      setRecurrenceDay(1);
    } else {
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setDueDate(defaultDate ?? startOfToday());
      setRecurrence('never');
      setRecurrenceDay(1);
    }
  }, [visible, task?.id, householdId]);

  async function handleSave() {
    if (!title.trim()) {
      setTitleError(true);
      setError('O título é obrigatório.');
      return;
    }
    setTitleError(false);
    setError(null);
    setSaving(true);

    try {
      let saved: Task;

      if (isEditing) {
        const result = await TaskService.updateTask(task.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate ? formatDateParam(dueDate) : undefined,
        });
        saved = result;
      } else {
        const request: CreateTaskRequest = {
          householdId,
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate ? formatDateParam(dueDate) : undefined,
          recurrencePattern: recurrence === 'never' ? undefined : recurrence,
          recurrenceDay:
            recurrence === 'weekly' || recurrence === 'monthly'
              ? recurrenceDay
              : undefined,
        };
        const result = await TaskService.createTask(request);
        saved = result;
      }

      onSaved(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar tarefa.');
    } finally {
      setSaving(false);
    }
  }

  // Derived labels
  const assigneeLabel =
    members.find((m) => m.userId === assigneeId)?.user.name ?? 'Nenhum';

  const recurrenceLabel: Record<RecurrenceOption, string> = {
    never: 'Nunca',
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal',
  };

  const recurrenceDayLabel =
    recurrence === 'weekly'
      ? WEEKDAYS_PT[recurrenceDay - 1] // recurrenceDay 1=Dom ... 7=Sáb
      : `Dia ${recurrenceDay}`;

  // Picker options
  const recurrenceOptions: Array<{ label: string; value: RecurrenceOption }> = [
    { label: 'Nunca', value: 'never' },
    { label: 'Diária', value: 'daily' },
    { label: 'Semanal', value: 'weekly' },
    { label: 'Mensal', value: 'monthly' },
  ];

  const weekdayOptions = WEEKDAYS_PT.map((d, i) => ({ label: d, value: i + 1 }));

  const monthdayOptions = Array.from({ length: 31 }, (_, i) => ({
    label: `Dia ${i + 1}`,
    value: i + 1,
  }));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerSide}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar tarefa' : 'Nova tarefa'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerSide}>
            <Text style={[styles.saveBtn, saving && styles.saveBtnDisabled]}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Título */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Título</Text>
              <TextInput
                style={[styles.input, titleError && styles.inputError]}
                value={title}
                onChangeText={(t) => { setTitle(t); if (titleError) setTitleError(false); }}
                placeholder="Nome da tarefa"
                placeholderTextColor={Colors.textSecondary}
                maxLength={255}
                autoFocus
              />
            </View>

            {/* Descrição */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Detalhes da tarefa..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Prazo */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Prazo</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.selectorText}>{formatDateLabel(dueDate)}</Text>
              </TouchableOpacity>
            </View>

            {/* Responsável (só se >1 membro) */}
            {members.length > 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Responsável</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowAssigneePicker(true)}
                >
                  <Text style={styles.selectorText}>{assigneeLabel}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Recorrência (só na criação) */}
            {!isEditing && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Recorrência</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setShowRecurrencePicker(true)}
                >
                  <Text style={styles.selectorText}>{recurrenceLabel[recurrence]}</Text>
                </TouchableOpacity>

                {(recurrence === 'weekly' || recurrence === 'monthly') && (
                  <TouchableOpacity
                    style={[styles.selector, { marginTop: 8 }]}
                    onPress={() => setShowRecurrenceDayPicker(true)}
                  >
                    <Text style={styles.selectorText}>{recurrenceDayLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Date picker */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={pickerStyles.sheet}>
              <View style={pickerStyles.header}>
                <Text style={pickerStyles.title}>Prazo</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {DATE_OPTIONS.map((opt, i) => {
                  const isSelected =
                    opt.date === null ? dueDate === null : dueDate !== null && formatDateParam(opt.date) === formatDateParam(dueDate);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[pickerStyles.option, isSelected && pickerStyles.optionActive]}
                      onPress={() => { setDueDate(opt.date); setShowDatePicker(false); }}
                    >
                      <Text style={[pickerStyles.optionText, isSelected && pickerStyles.optionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Assignee picker */}
      <PickerModal
        visible={showAssigneePicker}
        title="Responsável"
        options={[
          { label: 'Nenhum', value: '' },
          ...members.map((m) => ({ label: m.user.name, value: m.userId })),
        ]}
        selectedValue={assigneeId}
        onSelect={setAssigneeId}
        onClose={() => setShowAssigneePicker(false)}
      />

      {/* Recurrence picker */}
      <PickerModal
        visible={showRecurrencePicker}
        title="Recorrência"
        options={recurrenceOptions}
        selectedValue={recurrence}
        onSelect={(v) => { setRecurrence(v); if (v === 'weekly') setRecurrenceDay(1); if (v === 'monthly') setRecurrenceDay(1); }}
        onClose={() => setShowRecurrencePicker(false)}
      />

      {/* Recurrence day picker */}
      {recurrence === 'weekly' && (
        <PickerModal
          visible={showRecurrenceDayPicker}
          title="Dia da semana"
          options={weekdayOptions}
          selectedValue={recurrenceDay}
          onSelect={setRecurrenceDay}
          onClose={() => setShowRecurrenceDayPicker(false)}
        />
      )}
      {recurrence === 'monthly' && (
        <PickerModal
          visible={showRecurrenceDayPicker}
          title="Dia do mês"
          options={monthdayOptions}
          selectedValue={recurrenceDay}
          onSelect={setRecurrenceDay}
          onClose={() => setShowRecurrenceDayPicker(false)}
        />
      )}
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerSide: {
    minWidth: 70,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cancelBtn: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  saveBtn: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'right',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: Colors.error,
  },
  selector: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
});

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionActive: {
    backgroundColor: '#E8F5EE',
  },
  optionText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  optionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
