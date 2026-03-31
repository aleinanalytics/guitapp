import { useState, useEffect, useCallback } from 'react'
import { addMonths, format, isBefore, parseISO, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import type { TarjetaConfig } from '../lib/types'

/** Próxima fecha de ciclo: la guardada o la misma fecha en meses futuros hasta que sea ≥ hoy */
export function fechaProximaCiclo(iso: string): Date {
  const today = startOfDay(new Date())
  let d = startOfDay(parseISO(iso))
  while (isBefore(d, today)) {
    d = addMonths(d, 1)
  }
  return d
}

export function diasHastaFecha(iso: string): number {
  const target = fechaProximaCiclo(iso)
  const today = startOfDay(new Date())
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/** Texto corto para KPIs: "Hoy", "Mañana", "Faltan N días". */
export function countdownTarjeta(iso: string): string {
  const n = diasHastaFecha(iso)
  if (n <= 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  return `Faltan ${n} días`
}

export function formatFechaTarjeta(iso: string): string {
  return format(fechaProximaCiclo(iso), "d MMM yyyy", { locale: es })
}

/**
 * Rango amplio para cierre/vencimiento: permite fechas pasadas (alta tardía) y vencimientos
 * varios meses después del cierre (antes el tope ~2 meses rechazaba p. ej. junio si hoy es marzo).
 */
export function rangoPickerTarjeta(): { min: string; max: string } {
  const today = startOfDay(new Date())
  return {
    min: format(addMonths(today, -180), 'yyyy-MM-dd'),
    max: format(addMonths(today, 60), 'yyyy-MM-dd'),
  }
}

/** Convierte respuesta legacy (solo día del mes) a fecha YYYY-MM-DD de la próxima ocurrencia */
function legacyDiaAFecha(dia: number): string {
  const d = Math.min(28, Math.max(1, Math.floor(dia)))
  const today = startOfDay(new Date())
  let cur = startOfDay(new Date(today.getFullYear(), today.getMonth(), d))
  while (isBefore(cur, today)) {
    cur = addMonths(cur, 1)
  }
  return format(cur, 'yyyy-MM-dd')
}

function normalizarConfig(row: Record<string, unknown> | null): TarjetaConfig | null {
  if (!row || typeof row !== 'object') return null
  const id = row.id as string
  const user_id = row.user_id as string
  let fecha_cierre = row.fecha_cierre as string | null | undefined
  let fecha_vencimiento = row.fecha_vencimiento as string | null | undefined
  const dia_cierre = row.dia_cierre as number | undefined
  const dia_vencimiento = row.dia_vencimiento as number | undefined

  if (!fecha_cierre && dia_cierre != null) fecha_cierre = legacyDiaAFecha(dia_cierre)
  if (!fecha_vencimiento && dia_vencimiento != null) fecha_vencimiento = legacyDiaAFecha(dia_vencimiento)
  if (!fecha_cierre || !fecha_vencimiento) return null

  return { id, user_id, fecha_cierre, fecha_vencimiento }
}

export function useTarjetaConfig() {
  const [config, setConfig] = useState<TarjetaConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('tarjeta_config').select('*').maybeSingle()
    setConfig(normalizarConfig(data as Record<string, unknown> | null))
    setLoading(false)
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const upsert = useCallback(async (fecha_cierre: string, fecha_vencimiento: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { min, max } = rangoPickerTarjeta()
    if (fecha_cierre < min || fecha_cierre > max || fecha_vencimiento < min || fecha_vencimiento > max) {
      window.alert(
        'Las fechas deben estar entre aproximadamente 15 años atrás y 5 años adelante. Si ves este mensaje con fechas razonables, revisá el año en el calendario.',
      )
      return false
    }
    if (fecha_vencimiento < fecha_cierre) {
      window.alert('El vencimiento no puede ser anterior al cierre.')
      return false
    }

    if (config) {
      const { error } = await supabase
        .from('tarjeta_config')
        .update({ fecha_cierre, fecha_vencimiento })
        .eq('user_id', user.id)
      if (error) { window.alert('Error: ' + error.message); return false }
    } else {
      const { error } = await supabase
        .from('tarjeta_config')
        .insert({ user_id: user.id, fecha_cierre, fecha_vencimiento })
      if (error) { window.alert('Error: ' + error.message); return false }
    }
    await fetchConfig()
    return true
  }, [config, fetchConfig])

  return { config, loading, upsert, refetch: fetchConfig }
}
