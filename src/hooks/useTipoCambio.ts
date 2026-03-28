import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
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

export function useTipoCambio() {
  const [tipoCambio, setTipoCambio] = useState<TipoCambio | null>(null)
  const [dolarLive, setDolarLive] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDB = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tipo_cambio')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(1)
      .single()
    setTipoCambio(data as TipoCambio | null)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDB()
    fetchDolarOficial().then((v) => { if (v) setDolarLive(v) })
  }, [fetchDB])

  // Auto-save if we got a live rate and DB doesn't have today's rate
  useEffect(() => {
    if (!dolarLive) return
    const today = new Date().toISOString().split('T')[0]
    if (tipoCambio?.fecha === today) return
    // Auto-upsert today's rate
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('tipo_cambio')
        .upsert({ user_id: user.id, fecha: today, usd_ars: dolarLive }, { onConflict: 'user_id,fecha' })
      await fetchDB()
    })()
  }, [dolarLive, tipoCambio, fetchDB])

  const upsertTipoCambio = useCallback(async (usd_ars: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('tipo_cambio')
      .upsert({ user_id: user.id, fecha: today, usd_ars }, { onConflict: 'user_id,fecha' })
    if (error) {
      window.alert('Error: ' + error.message)
    } else {
      await fetchDB()
    }
  }, [fetchDB])

  return { tipoCambio, dolarLive, loading, upsertTipoCambio }
}
