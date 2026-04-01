import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useTipoCambio } from './useTipoCambio'
import { convertirARS, cuentaComoSalidaDeEfectivo, esIngresoReintegroTarjetaCredito } from '../lib/utils'
import type { BolsilloTipo, BolsilloConfig, BolsilloMovimiento, Moneda, Transaccion } from '../lib/types'

function movimientoEquivalenteARS(m: BolsilloMovimiento, tc: number): number {
  const mon = m.moneda ?? 'ARS'
  return mon === 'USD' ? m.monto * tc : m.monto
}

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
    else {
      const rows = (movRes.data as BolsilloMovimiento[]) ?? []
      setMovimientos(
        rows.map((r) => ({
          ...r,
          moneda: (r as BolsilloMovimiento & { moneda?: Moneda }).moneda ?? 'ARS',
        })),
      )
    }

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

  /** Saldos reales por moneda (solo movimientos de ese tipo). */
  const saldoPorMoneda = useCallback(
    (tipo: BolsilloTipo): { ars: number; usd: number } => {
      let ars = 0
      let usd = 0
      for (const m of movimientos) {
        if (m.tipo !== tipo) continue
        const mon = m.moneda ?? 'ARS'
        if (mon === 'USD') usd += m.monto
        else ars += m.monto
      }
      return { ars, usd }
    },
    [movimientos],
  )

  /** Equivalente en ARS al tipo de cambio actual (disponible, metas, dashboard). */
  const saldoEquivARS = useCallback(
    (tipo: BolsilloTipo) =>
      movimientos
        .filter((m) => m.tipo === tipo)
        .reduce((s, m) => s + movimientoEquivalenteARS(m, tc), 0),
    [movimientos, tc],
  )

  const saldoTotalBolsillos = useMemo(
    () => movimientos.reduce((s, m) => s + movimientoEquivalenteARS(m, tc), 0),
    [movimientos, tc],
  )

  const disponible = useMemo(
    () => fluidoHistorial - saldoTotalBolsillos,
    [fluidoHistorial, saldoTotalBolsillos]
  )

  const registrarMovimiento = async (tipo: BolsilloTipo, monto: number, moneda: Moneda = 'ARS') => {
    if (!user) return { error: 'No autenticado' }
    const { error: err } = await supabase.from('bolsillo_movimientos').insert({
      user_id: user.id,
      tipo,
      monto,
      moneda,
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
    saldoPorMoneda,
    saldoEquivARS,
    saldoTotalBolsillos,
    fluidoHistorial,
    disponible,
    registrarMovimiento,
    upsertConfig,
    tc,
  }
}
