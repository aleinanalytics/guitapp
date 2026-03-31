/**
 * IPC nacional Argentina: variación mensual respecto del mes anterior (%).
 * Fuente habitual: INDEC. Los valores se actualizan a mano; podés sobreescribir desde Análisis (localStorage).
 * Última revisión: referencia pública 2025–2026 (verificar en https://www.indec.gob.ar)
 */
export const IPC_MENSUAL_VARIACION_PCT: Record<string, number> = {
  '2024-01': 20.6,
  '2024-02': 13.2,
  '2024-03': 11.0,
  '2024-04': 8.8,
  '2024-05': 4.2,
  '2024-06': 4.6,
  '2024-07': 4.0,
  '2024-08': 4.2,
  '2024-09': 3.5,
  '2024-10': 2.7,
  '2024-11': 2.4,
  '2024-12': 2.7,
  '2025-01': 2.4,
  '2025-02': 2.1,
  '2025-03': 1.8,
  '2025-04': 2.5,
  '2025-05': 2.7,
  '2025-06': 2.2,
  '2025-07': 1.1,
  '2025-08': 1.7,
  '2025-09': 2.3,
  '2025-10': 1.8,
  '2025-11': 2.4,
  '2025-12': 2.1,
  '2026-01': 2.9,
  '2026-02': 2.9,
}

const LS_KEY = 'guita_ipc_mensual_overrides'

export function ipcMonthKey(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}`
}

export function readIpcOverrides(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as unknown
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const out: Record<string, number> = {}
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        const n = Number(v)
        if (Number.isFinite(n)) out[k] = n
      }
      return out
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function writeIpcOverride(anio: number, mes: number, pct: number | null): void {
  if (typeof localStorage === 'undefined') return
  const key = ipcMonthKey(anio, mes)
  const cur = readIpcOverrides()
  if (pct === null || !Number.isFinite(pct)) {
    delete cur[key]
  } else {
    cur[key] = pct
  }
  localStorage.setItem(LS_KEY, JSON.stringify(cur))
}

/** Variación mensual IPC del mes indicado (vs mes anterior), o null si no hay dato. */
export function getIpcMensual(anio: number, mes: number): number | null {
  const key = ipcMonthKey(anio, mes)
  const over = readIpcOverrides()[key]
  if (over !== undefined && Number.isFinite(over)) return over
  const v = IPC_MENSUAL_VARIACION_PCT[key]
  return v !== undefined ? v : null
}

/** IPC más reciente disponible hacia atrás desde (anio, mes); 0 si no hay dato en 24 meses. */
export function getUltimoIpcReferencia(anio: number, mes: number): number {
  let y = anio
  let m = mes
  for (let i = 0; i < 24; i++) {
    const v = getIpcMensual(y, m)
    if (v !== null) return v
    if (m === 1) {
      m = 12
      y -= 1
    } else {
      m -= 1
    }
  }
  return 0
}
