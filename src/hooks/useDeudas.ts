import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { notify } from '../components/Toaster'
import type { Deuda } from '../lib/types'

export function useDeudas() {
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDeudas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('deudas')
      .select('*')
      .order('created_at', { ascending: false })
    setDeudas((data as Deuda[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDeudas() }, [fetchDeudas])

  const insertDeuda = useCallback(async (deuda: {
    descripcion: string
    tipo_deuda: string
    monto_total: number
    cuotas_total: number
    fecha_primera_cuota: string
    moneda: string
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const monto_cuota = Math.round((deuda.monto_total / deuda.cuotas_total) * 100) / 100
    const { error } = await supabase.from('deudas').insert({
      user_id: user.id,
      ...deuda,
      monto_cuota,
    })
    if (error) {
      notify.error('No se pudo crear la deuda', error.message)
      return false
    }
    await fetchDeudas()
    return true
  }, [fetchDeudas])

  const updateDeuda = useCallback(async (id: string, deuda: {
    descripcion?: string
    tipo_deuda?: string
    monto_total?: number
    cuotas_total?: number
    fecha_primera_cuota?: string
    moneda?: string
  }) => {
    const updates: Record<string, unknown> = { ...deuda }
    if (deuda.monto_total != null && deuda.cuotas_total != null) {
      updates.monto_cuota = Math.round((deuda.monto_total / deuda.cuotas_total) * 100) / 100
    } else if (deuda.monto_total != null) {
      const existing = deudas.find(d => d.id === id)
      if (existing) {
        updates.monto_cuota = Math.round((deuda.monto_total / existing.cuotas_total) * 100) / 100
      }
    } else if (deuda.cuotas_total != null) {
      const existing = deudas.find(d => d.id === id)
      if (existing) {
        updates.monto_cuota = Math.round((existing.monto_total / deuda.cuotas_total) * 100) / 100
      }
    }
    const { error } = await supabase.from('deudas').update(updates).eq('id', id)
    if (error) {
      notify.error('No se pudo actualizar la deuda', error.message)
      return false
    }
    await fetchDeudas()
    return true
  }, [fetchDeudas, deudas])

  const deleteDeuda = useCallback(async (id: string) => {
    const { error } = await supabase.from('deudas').delete().eq('id', id)
    if (error) {
      notify.error('No se pudo eliminar la deuda', error.message)
      return false
    }
    await fetchDeudas()
    notify.success('Deuda eliminada')
    return true
  }, [fetchDeudas])

  return { deudas, loading, insertDeuda, updateDeuda, deleteDeuda, refetch: fetchDeudas }
}

/**
 * Get the installment number for a given deuda in a specific month/year.
 * Returns null if not active that month.
 */
export function getDeudaForMonth(d: Deuda, mes: number, anio: number): { numero: number; total: number; monto: number } | null {
  const start = new Date(d.fecha_primera_cuota + 'T00:00:00')
  const startMonth = start.getFullYear() * 12 + start.getMonth()
  const targetMonth = anio * 12 + (mes - 1)
  const diff = targetMonth - startMonth
  if (diff < 0 || diff >= d.cuotas_total) return null
  return { numero: diff + 1, total: d.cuotas_total, monto: d.monto_cuota }
}

/**
 * Check if a deuda is fully paid off (all installments completed).
 */
export function isDeudaFinalizada(d: Deuda, mesActual: number, anioActual: number): boolean {
  const start = new Date(d.fecha_primera_cuota + 'T00:00:00')
  const startMonth = start.getFullYear() * 12 + start.getMonth()
  const currentMonth = anioActual * 12 + (mesActual - 1)
  const diff = currentMonth - startMonth
  return diff >= d.cuotas_total
}

/**
 * Get progress percentage (0-100) of a deuda.
 */
export function getDeudaProgress(d: Deuda, mesActual: number, anioActual: number): number {
  const cuotaActual = getDeudaForMonth(d, mesActual, anioActual)
  if (cuotaActual) {
    return Math.round((cuotaActual.numero / cuotaActual.total) * 100)
  }
  if (isDeudaFinalizada(d, mesActual, anioActual)) return 100
  return 0
}