import type { CompraCuotas, Deuda, Moneda, Transaccion } from './types'
import { convertirARS, cuentaComoSalidaDeEfectivo, esIngresoReintegroTarjetaCredito } from './utils'
import { getCuotaForMonth } from '../hooks/useCuotas'
import { getDeudaForMonth } from '../hooks/useDeudas'

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export interface ProyeccionMes {
  mes: number
  anio: number
  label: string
  saldoInicial: number
  ingresos: number
  gastosFijos: number
  suscripciones: number
  gastosVariables: number
  cuotasTC: number
  deudas: number
  saldoFinal: number
}

interface TxMin {
  fecha: string
  monto: number
  moneda: string
  tipo: string
  medio_pago: string
  excluye_saldo?: boolean | null
  es_gasto_fijo?: boolean | null
}

function labelMes(mes: number, anio: number): string {
  return `${MESES_CORTOS[mes - 1]} ${anio}`
}

/** Últimos N meses calendario con datos (incluyendo el actual). */
function ultimosMesesConDatos(
  transacciones: TxMin[],
  mesActual: number,
  anioActual: number,
  cantidad: number,
): Array<{ mes: number; anio: number; txs: TxMin[] }> {
  const result: Array<{ mes: number; anio: number; txs: TxMin[] }> = []
  let m = mesActual
  let a = anioActual
  while (result.length < cantidad) {
    const txs = transacciones.filter((t) => {
      const d = new Date(t.fecha + 'T00:00:00')
      return d.getMonth() + 1 === m && d.getFullYear() === a
    })
    result.unshift({ mes: m, anio: a, txs })
    m--
    if (m === 0) { m = 12; a-- }
  }
  return result
}

function promedioMensual(
  meses: Array<{ txs: TxMin[] }>,
  filtro: (t: TxMin) => boolean,
  tc: number,
): number {
  let total = 0
  let mesesConDatos = 0
  for (const mes of meses) {
    const suma = mes.txs
      .filter(filtro)
      .reduce((s, t) => s + convertirARS(Number(t.monto), t.moneda as Moneda, tc), 0)
    if (suma > 0 || mes.txs.some(filtro)) {
      total += suma
      mesesConDatos++
    }
  }
  if (mesesConDatos === 0) return 0
  return total / mesesConDatos
}

/**
 * Proyecta el cashflow para los próximos N meses.
 *
 * - Ingresos: promedio de los últimos 3 meses
 * - Gastos fijos: promedio de gastos marcados `es_gasto_fijo` (salidas de efectivo)
 * - Suscripciones: promedio de suscripciones (salidas de efectivo)
 * - Gastos variables: promedio de gastos no-fijos + no-suscripciones (salidas de efectivo)
 * - Cuotas TC: calculadas mes a mes según compras en cuotas activas
 * - Deudas: calculadas mes a mes según deudas activas
 */
export function proyectarCashflow({
  transacciones,
  cuotas,
  deudas,
  saldoActual,
  tc,
  mesActual,
  anioActual,
  mesesProyectar = 6,
}: {
  transacciones: TxMin[]
  cuotas: CompraCuotas[]
  deudas: Deuda[]
  saldoActual: number
  tc: number
  mesActual: number
  anioActual: number
  mesesProyectar?: number
}): ProyeccionMes[] {
  const historial = ultimosMesesConDatos(transacciones, mesActual, anioActual, 3)

  const ingresoPromedio = promedioMensual(
    historial,
    (t) => t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t as Pick<Transaccion, 'tipo' | 'medio_pago'>),
    tc,
  )

  const gastoFijoPromedio = promedioMensual(
    historial,
    (t) =>
      t.tipo === 'gasto' &&
      t.es_gasto_fijo === true &&
      cuentaComoSalidaDeEfectivo(t as Pick<Transaccion, 'tipo' | 'medio_pago'> & { excluye_saldo?: boolean | null }),
    tc,
  )

  const suscripcionPromedio = promedioMensual(
    historial,
    (t) =>
      t.tipo === 'suscripcion' &&
      cuentaComoSalidaDeEfectivo(t as Pick<Transaccion, 'tipo' | 'medio_pago'> & { excluye_saldo?: boolean | null }),
    tc,
  )

  const gastoVariablePromedio = promedioMensual(
    historial,
    (t) =>
      (t.tipo === 'gasto' || t.tipo === 'suscripcion') &&
      t.es_gasto_fijo !== true &&
      cuentaComoSalidaDeEfectivo(t as Pick<Transaccion, 'tipo' | 'medio_pago'> & { excluye_saldo?: boolean | null }),
    tc,
  )

  const result: ProyeccionMes[] = []
  let saldo = saldoActual

  for (let i = 1; i <= mesesProyectar; i++) {
    let m = mesActual + i
    let a = anioActual
    while (m > 12) { m -= 12; a++ }

    // Cuotas TC
    let cuotasMes = 0
    for (const c of cuotas) {
      const info = getCuotaForMonth(c, m, a)
      if (info) cuotasMes += convertirARS(info.monto, c.moneda, tc)
    }

    // Deudas
    let deudasMes = 0
    for (const d of deudas) {
      const info = getDeudaForMonth(d, m, a)
      if (info) deudasMes += convertirARS(info.monto, d.moneda, tc)
    }

    const saldoInicial = saldo
    const ingresos = ingresoPromedio
    const gastosFijos = gastoFijoPromedio
    const suscripciones = suscripcionPromedio
    const gastosVariables = gastoVariablePromedio
    const saldoFinal =
      saldoInicial + ingresos - gastosFijos - suscripciones - gastosVariables - cuotasMes - deudasMes

    result.push({
      mes: m,
      anio: a,
      label: labelMes(m, a),
      saldoInicial,
      ingresos,
      gastosFijos,
      suscripciones,
      gastosVariables,
      cuotasTC: cuotasMes,
      deudas: deudasMes,
      saldoFinal,
    })

    saldo = saldoFinal
  }

  return result
}

/** Encuentra el primer mes donde el saldo proyectado cae bajo cero. */
export function primerMesNegativo(proyeccion: ProyeccionMes[]): ProyeccionMes | null {
  return proyeccion.find((p) => p.saldoFinal < 0) ?? null
}

/** Resumen de alertas para mostrar en la UI. */
export function resumenAlertasCashflow(
  proyeccion: ProyeccionMes[],
  fondoEmergencia: number = 0,
): {
  hayAlerta: boolean
  primerNegativo: ProyeccionMes | null
  mesesBajoEmergencia: ProyeccionMes[]
  saldoFinal6Meses: number
} {
  const primerNegativo = primerMesNegativo(proyeccion)
  const mesesBajoEmergencia = proyeccion.filter((p) => p.saldoFinal < fondoEmergencia)
  const saldoFinal6Meses = proyeccion[proyeccion.length - 1]?.saldoFinal ?? 0
  return {
    hayAlerta: primerNegativo !== null || mesesBajoEmergencia.length > 0,
    primerNegativo,
    mesesBajoEmergencia,
    saldoFinal6Meses,
  }
}
