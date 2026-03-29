import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useTipoCambio } from './useTipoCambio'
import { convertirARS } from '../lib/utils'
import type { Transaccion } from '../lib/types'

/** Categorías usadas para estimar gastos fijos del fondo de emergencia (nombres en BD). */
export const CATEGORIAS_GASTO_FIJO = ['Alquiler', 'Servicios', 'Supermercado', 'Alimentos'] as const

/** Últimos n meses calendario, del más antiguo al actual (YYYY-MM). */
function monthKeysLastN(n: number): string[] {
  const d = new Date()
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    const y = x.getFullYear()
    const m = x.getMonth() + 1
    keys.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return keys
}

function firstDayOfMonthKey(key: string): string {
  return `${key}-01`
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useGastoFijoMensualPromedio() {
  const { user } = useAuth()
  const { tipoCambio } = useTipoCambio()
  const tc = tipoCambio?.usd_ars ?? 1000
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)

  const keys = useMemo(() => monthKeysLastN(3), [])

  useEffect(() => {
    if (!user) {
      setTransacciones([])
      setLoading(false)
      return
    }
    const oldest = firstDayOfMonthKey(keys[0]!)
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('transacciones')
        .select('*, categoria:categorias(*)')
        .eq('tipo', 'gasto')
        .gte('fecha', oldest)
        .lte('fecha', todayStr())
      if (!error && data) setTransacciones(data as Transaccion[])
      else setTransacciones([])
      setLoading(false)
    })()
  }, [user, keys])

  const promedioMensual = useMemo(() => {
    const set = new Set<string>(CATEGORIAS_GASTO_FIJO)
    const byMonth: Record<string, number> = {}
    for (const k of keys) byMonth[k] = 0
    for (const t of transacciones) {
      const nombre = t.categoria?.nombre
      if (!nombre || !set.has(nombre)) continue
      const ym = t.fecha.slice(0, 7)
      if (byMonth[ym] === undefined) continue
      byMonth[ym] += convertirARS(t.monto, t.moneda, tc)
    }
    const sums = keys.map((k) => byMonth[k] ?? 0)
    return sums.reduce((a, b) => a + b, 0) / keys.length
  }, [transacciones, keys, tc])

  return { promedioMensual, loading, mesesEnPromedio: keys.length }
}
