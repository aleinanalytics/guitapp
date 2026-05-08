import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notify } from '../components/Toaster'
import type { CompraCuotas } from '../lib/types'

async function fetchCuotas(): Promise<CompraCuotas[]> {
  const { data, error } = await supabase
    .from('compras_cuotas')
    .select('*, categoria:categorias(*)')
    .order('fecha_primera_cuota', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as CompraCuotas[]) ?? []
}

export function useCuotas() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['compras_cuotas'],
    queryFn: fetchCuotas,
  })

  const insertCuota = useMutation({
    mutationFn: async (cuota: {
      descripcion: string
      monto_total: number
      cuotas_total: number
      fecha_primera_cuota: string
      moneda: string
      categoria_id: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const monto_cuota = Math.round((cuota.monto_total / cuota.cuotas_total) * 100) / 100
      const { error } = await supabase.from('compras_cuotas').insert({
        user_id: user.id,
        ...cuota,
        monto_cuota,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras_cuotas'] })
      notify.success('Compra registrada')
    },
    onError: (err: Error) => {
      notify.error('No se pudo crear la compra', err.message)
    },
  })

  const deleteCuota = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('compras_cuotas').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras_cuotas'] })
      notify.success('Compra eliminada')
    },
    onError: (err: Error) => {
      notify.error('No se pudo eliminar', err.message)
    },
  })

  return {
    cuotas: query.data ?? [],
    loading: query.isLoading,
    insertCuota: insertCuota.mutateAsync,
    deleteCuota: deleteCuota.mutateAsync,
    refetch: query.refetch,
  }
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
