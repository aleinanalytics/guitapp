import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaccion } from '../lib/types'

export function useTransacciones({ mes, anio }: { mes: number; anio: number }) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const prevMes = mes === 1 ? 12 : mes - 1
    const prevAnio = mes === 1 ? anio - 1 : anio
    const firstDay = `${prevAnio}-${String(prevMes).padStart(2, '0')}-01`
    const { data, error: err } = await supabase
      .from('transacciones')
      .select('*, categoria:categorias(*)')
      .gte('fecha', firstDay)
      .lt('fecha', mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, '0')}-01`)
      .order('fecha', { ascending: false })
    if (err) {
      setError(err.message)
    } else {
      setTransacciones((data as Transaccion[]) ?? [])
    }
    setLoading(false)
  }, [mes, anio])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { transacciones, loading, error, refetch }
}
