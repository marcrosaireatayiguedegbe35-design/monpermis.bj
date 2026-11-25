/** Palette et helpers de la page « Mes résultats » (vert de la marque). */
export const RES = {
  bg: '#F4F7FB',
  navy: '#00A344',
  navyDeep: '#007A33',
  ink: '#10261B',
  tint: '#E6F7EC',
  line: 'rgba(0,100,50,0.10)',
  muted: '#6B7F74',
  ok: '#16A34A',
  okSoft: 'rgba(22,163,74,0.12)',
  ko: '#DC2626',
  koSoft: 'rgba(220,38,38,0.10)',
  warn: '#B7791F',
  warnSoft: 'rgba(245,158,11,0.16)',
} as const

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** 12,5 — virgule décimale ; « — » si la note n'existe pas. */
export function formatNote(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value).replace('.', ',')
}

/** 22 oct. 2026 — sans dépendre d'Intl (variable selon les appareils Android). */
export function formatDateFr(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function percent(done: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0
}
