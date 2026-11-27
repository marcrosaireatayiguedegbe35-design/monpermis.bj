/** Nombre minimal d'heures de conduite exigé pour présenter le permis. */
export const DRIVING_MIN_HOURS = 48

/** Objectif d'heures d'un élève : jamais en dessous du minimum (les anciens comptes à 20 h passent à 48 h). */
export function drivingObjective(value) {
  const n = Number(value)
  return Math.max(DRIVING_MIN_HOURS, Number.isFinite(n) ? n : 0)
}
