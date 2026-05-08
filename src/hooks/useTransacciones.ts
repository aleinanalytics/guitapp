import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Transaccion } from '../lib/types'

export function useTransacciones({ mes, anio }: { mes: number; anio: number }) {
  const prevMes = mes === 1 ? 12 : mes - 1
  const prevAnio = mes === 1 ? anio - 1 : anio
  const firstDay = `${prevAnio}-${String(prevMes).padStart(2, '0')}-01`
  const lastDay = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, '0')}-01`

  const query = useQuery({
    queryKey: ['transacciones', mes, anio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transacciones')
        .select('*, categoria:categorias(*)')
        .gte('fecha', firstDay)
        .lt('fecha', lastDay)
        .order('fecha', { ascending: false })
      if (error) throw new Error(error.message)
      return (data as Transaccion[]) ?? []
    },
  })

  return {
    transacciones: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
