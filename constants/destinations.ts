// ─── Destination const + type ────────────────────────────────────────────────
// Usar const object + type derivado em vez de enum para manter compatibilidade
// com strings da API sem necessidade de cast.

export const Destination = {
  Undecided: 'Undecided',
  Keep: 'Keep',
  Sell: 'Sell',
  Donate: 'Donate',
  Trash: 'Trash',
} as const;

export type Destination = typeof Destination[keyof typeof Destination];

// ─── Metadata por destino ─────────────────────────────────────────────────────

export interface DestinationMeta {
  value: Destination;
  label: string;
  badge: { bg: string; text: string };
  barColor: string;
}

const DESTINATION_META: DestinationMeta[] = [
  { value: Destination.Keep,   label: 'Manter',    badge: { bg: '#d1fae5', text: '#065f46' }, barColor: '#059669' },
  { value: Destination.Sell,   label: 'Vender',    badge: { bg: '#dbeafe', text: '#1e40af' }, barColor: '#2563eb' },
  { value: Destination.Donate, label: 'Doar',      badge: { bg: '#ede9fe', text: '#5b21b6' }, barColor: '#7c3aed' },
  { value: Destination.Trash,  label: 'Descartar', badge: { bg: '#fee2e2', text: '#991b1b' }, barColor: '#dc2626' },
];

export const DEFAULT_BAR_COLOR = '#d1d5db';

// ─── Conjuntos de opções ──────────────────────────────────────────────────────

/** Todas as opções para o picker de destino no formulário (inclui "Sem destino") */
export const DESTINATION_ALL_OPTIONS: Array<{ value: Destination | ''; label: string }> = [
  { value: '', label: 'Sem destino' },
  ...DESTINATION_META.map((d) => ({ value: d.value, label: d.label })),
];

/** Labels para os chips de filtro (inclui "Todos") */
export const DESTINATION_FILTER_OPTIONS: string[] =
  ['Todos', ...DESTINATION_META.map((d) => d.label)];

/** Opções disponíveis para "dar saída" — exclui Keep e Undecided */
export const DESTINATION_RESOLVE_OPTIONS: DestinationMeta[] = DESTINATION_META.filter(
  (d) => d.value !== Destination.Keep
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Devolve os metadados completos de um destino, ou undefined se ausente/Undecided */
export function getDestinationMeta(value?: string | null): DestinationMeta | undefined {
  if (!value || value === Destination.Undecided) return undefined;
  return DESTINATION_META.find((d) => d.value === value);
}

/** Devolve o label em PT, ou null se não definido */
export function getDestinationLabel(value?: string): string | null {
  return getDestinationMeta(value)?.label ?? null;
}
