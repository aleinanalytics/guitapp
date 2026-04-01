import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { convertirARS, cuentaComoSalidaDeEfectivo, esIngresoReintegroTarjetaCredito } from '../lib/utils'
import type { Moneda, Transaccion } from '../lib/types'

/** Último día del mes calendario (mes 1–12) en YYYY-MM-DD local. */
export function ultimoDiaDelMes(anio: number, mes: number): string {
  const d = new Date(anio, mes, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Ingresos menos salidas que afectan efectivo/banco (efectivo, transferencia, débito en BD),
 * sumando todo el historial hasta el último día del mes/año elegidos. El superávit de meses
 * anteriores queda incluido al ver el mes siguiente (mismo criterio que el balance mensual, sin TC).
 */
export function useSaldoAcumuladoHastaMes({ mes, anio, tc }: { mes: number; anio: number; tc: number }) {
  const { user } = useAuth()
  const [saldoAcumulado, setSaldoAcumulado] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!user) {
      setSaldoAcumulado(0)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const hasta = ultimoDiaDelMes(anio, mes)
    const { data, error: err } = await supabase
      .from('transacciones')
      .select('monto, moneda, tipo, medio_pago, excluye_saldo')
      .lte('fecha', hasta)

    if (err) {
      setError(err.message)
      setSaldoAcumulado(0)
    } else {
      let ing = 0
      let sal = 0
      for (const t of data ?? []) {
        const ars = convertirARS(Number(t.monto), t.moneda as Moneda, tc)
        if (t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t as Pick<Transaccion, 'tipo' | 'medio_pago'>))
          ing += ars
        else if (cuentaComoSalidaDeEfectivo(t as Pick<Transaccion, 'tipo' | 'medio_pago' | 'excluye_saldo'>)) sal += ars
      }
      setSaldoAcumulado(ing - sal)
    }
    setLoading(false)
  }, [user, mes, anio, tc])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { saldoAcumulado, loading, error, refetch }
}
