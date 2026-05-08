import { useState, useEffect, useCallback } from 'react'
import { addMonths, isAfter, parseISO, startOfDay } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { convertirARS, cuentaComoSalidaDeEfectivo, esIngresoReintegroTarjetaCredito } from '../lib/utils'
import type { CompraCuotas, Moneda, Transaccion } from '../lib/types'

/** Último día del mes calendario (mes 1–12) en YYYY-MM-DD local. */
export function ultimoDiaDelMes(anio: number, mes: number): string {
  const d = new Date(anio, mes, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Cuántas cuotas ya vencieron hasta el último día del mes indicado (inclusive). */
export function cuotasPagadasHastaMes(
  c: Pick<CompraCuotas, 'cuotas_total' | 'fecha_primera_cuota'>,
  mes: number,
  anio: number,
): number {
  const hasta = startOfDay(new Date(anio, mes, 0))
  const primera = startOfDay(parseISO(c.fecha_primera_cuota))
  let count = 0
  for (let i = 0; i < c.cuotas_total; i++) {
    const fechaCuota = addMonths(primera, i)
    if (!isAfter(fechaCuota, hasta)) count++
    else break
  }
  return count
}

/**
 * Ingresos menos salidas que afectan efectivo/banco (efectivo, transferencia, débito en BD),
 * sumando todo el historial hasta el último día del mes/año elegidos. El superávit de meses
 * anteriores queda incluido al ver el mes siguiente (mismo criterio que el balance mensual, sin TC).
 *
 * Si `modoCredito` es true, también resta consumos con tarjeta de crédito y cuotas ya pagadas.
 */
export function useSaldoAcumuladoHastaMes({
  mes,
  anio,
  tc,
  modoCredito = false,
}: {
  mes: number
  anio: number
  tc: number
  modoCredito?: boolean
}) {
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

    const [txRes, cuotasRes] = await Promise.all([
      supabase
        .from('transacciones')
        .select('monto, moneda, tipo, medio_pago, excluye_saldo')
        .eq('user_id', user.id)
        .lte('fecha', hasta),
      supabase
        .from('compras_cuotas')
        .select('monto_cuota, cuotas_total, fecha_primera_cuota, moneda')
        .eq('user_id', user.id),
    ])

    if (txRes.error) {
      setError(txRes.error.message)
      setSaldoAcumulado(0)
      setLoading(false)
      return
    }

    let ing = 0
    let sal = 0
    for (const t of txRes.data ?? []) {
      const ars = convertirARS(Number(t.monto), t.moneda as Moneda, tc)
      if (t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t as Pick<Transaccion, 'tipo' | 'medio_pago'>))
        ing += ars
      else if (cuentaComoSalidaDeEfectivo(t as Pick<Transaccion, 'tipo' | 'medio_pago' | 'excluye_saldo'>, modoCredito)) sal += ars
    }

    if (modoCredito && !cuotasRes.error && cuotasRes.data) {
      for (const c of cuotasRes.data as CompraCuotas[]) {
        const pagadas = cuotasPagadasHastaMes(c, mes, anio)
        if (pagadas > 0) {
          sal += convertirARS(Number(c.monto_cuota) * pagadas, c.moneda as Moneda, tc)
        }
      }
    }

    setSaldoAcumulado(ing - sal)
    setLoading(false)
  }, [user, mes, anio, tc, modoCredito])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { saldoAcumulado, loading, error, refetch }
}
