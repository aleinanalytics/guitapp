import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaccion } from '../lib/types'

export function useAnalisis({ anio }: { anio: number }) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const firstDay = `${anio}-01-01`
    const lastDay = `${anio + 1}-01-01`
    const { data, error: err } = await supabase
      .from('transacciones')
      .select('*, categoria:categorias(*)')
      .gte('fecha', firstDay)
      .lt('fecha', lastDay)
      .order('fecha', { ascending: false })
    if (err) {
      setError(err.message)
    } else {
      setTransacciones((data as Transaccion[]) ?? [])
    }
    setLoading(false)
  }, [anio])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { transacciones, loading, error }
}
