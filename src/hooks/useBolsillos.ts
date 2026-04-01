import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useTipoCambio } from './useTipoCambio'
import { convertirARS, cuentaComoSalidaDeEfectivo, esIngresoReintegroTarjetaCredito } from '../lib/utils'
import type { BolsilloTipo, BolsilloConfig, BolsilloMovimiento, Transaccion } from '../lib/types'

export function useBolsillos() {
  const { user } = useAuth()
  const { tipoCambio } = useTipoCambio()
  const tc = tipoCambio?.usd_ars ?? 1000

  const [movimientos, setMovimientos] = useState<BolsilloMovimiento[]>([])
  const [configs, setConfigs] = useState<Partial<Record<BolsilloTipo, BolsilloConfig>>>({})
  const [fluidoHistorial, setFluidoHistorial] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!user) {
      setMovimientos([])
      setConfigs({})
      setFluidoHistorial(0)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const [movRes, cfgRes, txRes] = await Promise.all([
      supabase
        .from('bolsillo_movimientos')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('bolsillos_config').select('*'),
      supabase.from('transacciones').select('monto, moneda, tipo, medio_pago, excluye_saldo'),
    ])

    if (movRes.error) setError(movRes.error.message)
    else setMovimientos((movRes.data as BolsilloMovimiento[]) ?? [])

    if (!cfgRes.error && cfgRes.data) {
      const next: Partial<Record<BolsilloTipo, BolsilloConfig>> = {}
      for (const row of cfgRes.data as BolsilloConfig[]) next[row.tipo] = row
      setConfigs(next)
    }

    if (txRes.error) {
      setError(txRes.error.message)
    } else {
      let ing = 0
      let salidasEf = 0
      for (const t of txRes.data ?? []) {
        const ars = convertirARS(Number(t.monto), t.moneda as 'ARS' | 'USD', tc)
        if (t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t as Pick<Transaccion, 'tipo' | 'medio_pago'>))
          ing += ars
        else if (cuentaComoSalidaDeEfectivo(t as Pick<Transaccion, 'tipo' | 'medio_pago' | 'excluye_saldo'>)) salidasEf += ars
      }
      setFluidoHistorial(ing - salidasEf)
    }

    setLoading(false)
  }, [user, tc])

  useEffect(() => {
    refetch()
  }, [refetch])

  const saldo = useCallback(
    (tipo: BolsilloTipo) => movimientos.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.monto, 0),
    [movimientos]
  )

  const saldoTotalBolsillos = useMemo(() => saldo('ahorro') + saldo('emergencia'), [saldo])

  const disponible = useMemo(
    () => fluidoHistorial - saldoTotalBolsillos,
    [fluidoHistorial, saldoTotalBolsillos]
  )

  const registrarMovimiento = async (tipo: BolsilloTipo, monto: number) => {
    if (!user) return { error: 'No autenticado' }
    const { error: err } = await supabase.from('bolsillo_movimientos').insert({
      user_id: user.id,
      tipo,
      monto,
    })
    if (err) return { error: err.message }
    await refetch()
    return { error: null }
  }

  const upsertConfig = async (
    tipo: BolsilloTipo,
    patch: { objetivo_monto?: number | null; meses_sugerencia?: number }
  ) => {
    if (!user) return { error: 'No autenticado' }
    const existing = configs[tipo]
    const row = {
      user_id: user.id,
      tipo,
      objetivo_monto: patch.objetivo_monto !== undefined ? patch.objetivo_monto : (existing?.objetivo_monto ?? null),
      meses_sugerencia:
        patch.meses_sugerencia !== undefined ? patch.meses_sugerencia : (existing?.meses_sugerencia ?? 3),
      updated_at: new Date().toISOString(),
    }
    const { error: err } = await supabase.from('bolsillos_config').upsert(row, {
      onConflict: 'user_id,tipo',
    })
    if (err) return { error: err.message }
    await refetch()
    return { error: null }
  }

  return {
    movimientos,
    configs,
    loading,
    error,
    refetch,
    saldo,
    saldoTotalBolsillos,
    fluidoHistorial,
    disponible,
    registrarMovimiento,
    upsertConfig,
    tc,
  }
}
