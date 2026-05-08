import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notify } from '../components/Toaster'
import type { TipoCambio } from '../lib/types'

async function fetchDolarOficial(): Promise<number | null> {
  try {
    const res = await window.fetch('https://dolarapi.com/v1/dolares/oficial')
    if (!res.ok) return null
    const data = await res.json()
    return data.venta ?? null
  } catch {
    return null
  }
}

async function fetchTipoCambioDB(): Promise<TipoCambio | null> {
  const { data, error } = await supabase
    .from('tipo_cambio')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(1)
    .single()
  if (error) throw new Error(error.message)
  return (data as TipoCambio) ?? null
}

export function useTipoCambio() {
  const queryClient = useQueryClient()
  const [dolarLive, setDolarLive] = useState<number | null>(null)

  const query = useQuery({
    queryKey: ['tipo_cambio'],
    queryFn: fetchTipoCambioDB,
  })

  const upsertMutation = useMutation({
    mutationFn: async (usd_ars: number) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('tipo_cambio')
        .upsert({ user_id: user.id, fecha: today, usd_ars }, { onConflict: 'user_id,fecha' })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipo_cambio'] })
    },
    onError: (err: Error) => {
      notify.error('Error: ' + err.message)
    },
  })

  const fetchDolar = useCallback(async () => {
    const v = await fetchDolarOficial()
    if (v) setDolarLive(v)
  }, [])

  useEffect(() => {
    fetchDolar()
  }, [fetchDolar])

  // Auto-save if we got a live rate and DB doesn't have today's rate
  useEffect(() => {
    if (!dolarLive) return
    const today = new Date().toISOString().split('T')[0]
    if (query.data?.fecha === today) return
    upsertMutation.mutate(dolarLive)
  }, [dolarLive, query.data])

  return {
    tipoCambio: query.data ?? null,
    dolarLive,
    loading: query.isLoading,
    upsertTipoCambio: upsertMutation.mutateAsync,
  }
}
