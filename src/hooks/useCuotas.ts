import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CompraCuotas } from '../lib/types'

export function useCuotas() {
  const [cuotas, setCuotas] = useState<CompraCuotas[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCuotas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('compras_cuotas')
      .select('*, categoria:categorias(*)')
      .order('fecha_primera_cuota', { ascending: false })
    setCuotas((data as CompraCuotas[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCuotas() }, [fetchCuotas])

  const insertCuota = useCallback(async (cuota: {
    descripcion: string
    monto_total: number
    cuotas_total: number
    fecha_primera_cuota: string
    moneda: string
    categoria_id: string
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const monto_cuota = Math.round((cuota.monto_total / cuota.cuotas_total) * 100) / 100
    const { error } = await supabase.from('compras_cuotas').insert({
      user_id: user.id,
      ...cuota,
      monto_cuota,
    })
    if (error) {
      window.alert('Error: ' + error.message)
      return false
    }
    await fetchCuotas()
    return true
  }, [fetchCuotas])

  const deleteCuota = useCallback(async (id: string) => {
    const { error } = await supabase.from('compras_cuotas').delete().eq('id', id)
    if (error) window.alert('Error: ' + error.message)
    else await fetchCuotas()
  }, [fetchCuotas])

  return { cuotas, loading, insertCuota, deleteCuota, refetch: fetchCuotas }
}

/** Get the installment number for a given cuota in a specific month/year. Returns null if not active that month. */
export function getCuotaForMonth(c: CompraCuotas, mes: number, anio: number): { numero: number; total: number; monto: number } | null {
  const start = new Date(c.fecha_primera_cuota + 'T00:00:00')
  const startMonth = start.getFullYear() * 12 + start.getMonth()
  const targetMonth = anio * 12 + (mes - 1)
  const diff = targetMonth - startMonth
  if (diff < 0 || diff >= c.cuotas_total) return null
  return { numero: diff + 1, total: c.cuotas_total, monto: c.monto_cuota }
}
