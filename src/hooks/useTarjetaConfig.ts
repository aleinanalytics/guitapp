import { addMonths, format, isBefore, parseISO, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notify } from '../components/Toaster'
import { tarjetaConfigSchema, parseFormData } from '../lib/schemas'
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

  const modo_credito = !!row.modo_credito

  return { id, user_id, fecha_cierre, fecha_vencimiento, modo_credito }
}

async function fetchTarjetaConfig(): Promise<TarjetaConfig | null> {
  const { data } = await supabase.from('tarjeta_config').select('*').maybeSingle()
  return normalizarConfig(data as Record<string, unknown> | null)
}

export function useTarjetaConfig() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['tarjeta_config'],
    queryFn: fetchTarjetaConfig,
  })

  const upsertMutation = useMutation({
    mutationFn: async ({ fecha_cierre, fecha_vencimiento }: { fecha_cierre: string; fecha_vencimiento: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const parsed = parseFormData(tarjetaConfigSchema, { fecha_cierre, fecha_vencimiento })
      if (!parsed.success) throw new Error(parsed.errors.join(' · '))

      const { min, max } = rangoPickerTarjeta()
      if (fecha_cierre < min || fecha_cierre > max || fecha_vencimiento < min || fecha_vencimiento > max) {
        throw new Error('Las fechas deben estar entre aproximadamente 15 años atrás y 5 años adelante.')
      }
      if (fecha_vencimiento < fecha_cierre) {
        throw new Error('El vencimiento no puede ser anterior al cierre.')
      }

      if (query.data) {
        const { error } = await supabase
          .from('tarjeta_config')
          .update({ fecha_cierre, fecha_vencimiento })
          .eq('user_id', user.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from('tarjeta_config')
          .insert({ user_id: user.id, fecha_cierre, fecha_vencimiento })
        if (error) throw new Error(error.message)
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarjeta_config'] })
    },
    onError: (err: Error) => {
      notify.error('No se pudo guardar', err.message)
    },
  })

  const toggleModoCreditoMutation = useMutation({
    mutationFn: async () => {
      if (!query.data) throw new Error('No hay configuración')
      const nuevo = !query.data.modo_credito
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase
        .from('tarjeta_config')
        .update({ modo_credito: nuevo })
        .eq('user_id', user.id)
      if (error) throw new Error(error.message)
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarjeta_config'] })
    },
    onError: (err: Error) => {
      notify.error('No se pudo actualizar', err.message)
    },
  })

  return {
    config: query.data ?? null,
    loading: query.isLoading,
    upsert: upsertMutation.mutateAsync,
    toggleModoCredito: toggleModoCreditoMutation.mutateAsync,
    refetch: query.refetch,
  }
}
