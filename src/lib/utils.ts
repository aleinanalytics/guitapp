import type { Moneda, Transaccion } from './types'

/**
 * Salidas que restan del “balance” mensual y del disponible acumulado (useBolsillos):
 * - Efectivo y transferencia (`medio_pago` tal cual en BD).
 * - Tarjeta de débito: en Carga se guarda como `medio_pago === 'efectivo'`, así que también resta.
 * Tarjeta de crédito (`medio_pago === 'tarjeta'`) no resta; va al flujo de tarjeta.
 * Con `excluye_saldo === true` no resta (solo registro / lo pagó un tercero).
 */
export function cuentaComoSalidaDeEfectivo(
  t: Pick<Transaccion, 'tipo' | 'medio_pago'> & { excluye_saldo?: boolean | null },
): boolean {
  if (
    (t.tipo === 'gasto' || t.tipo === 'suscripcion') &&
    t.excluye_saldo === true
  ) {
    return false
  }
  return (
    (t.tipo === 'gasto' || t.tipo === 'suscripcion') &&
    (t.medio_pago === 'efectivo' || t.medio_pago === 'transferencia')
  )
}

/**
 * Ingreso como reintegro/promo/cashback en TC (`medio_pago === 'tarjeta'`).
 * No suma al efectivo disponible ni a “ingresos” del flujo caja; reduce el consumo TC del mes.
 */
export function esIngresoReintegroTarjetaCredito(t: Pick<Transaccion, 'tipo' | 'medio_pago'>): boolean {
  return t.tipo === 'ingreso' && t.medio_pago === 'tarjeta'
}

/** Último día del mes (mes 1–12). */
export function ultimoDiaDelMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate()
}

/**
 * Mes del resumen de tarjeta al que corresponde una fecha de compra:
 * hasta el día de cierre (inclusive) cuenta en ese mes calendario; lo posterior va al mes siguiente.
 */
export function mesResumenTarjetaCredito(
  fechaTx: string,
  diaCierrePreferido: number,
): { mes: number; anio: number } {
  const d = new Date(fechaTx + 'T12:00:00')
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const cap = ultimoDiaDelMes(y, m)
  const diaCierre = Math.min(Math.max(1, Math.floor(diaCierrePreferido)), cap)
  if (d.getDate() > diaCierre) {
    if (m === 12) return { mes: 1, anio: y + 1 }
    return { mes: m + 1, anio: y }
  }
  return { mes: m, anio: y }
}

export function fechaEnMesCalendario(fecha: string, mes: number, anio: number): boolean {
  const d = new Date(fecha + 'T12:00:00')
  return d.getFullYear() === anio && d.getMonth() + 1 === mes
}

/**
 * Con día de cierre configurado, gastos/suscripciones en TC usan el mes de resumen;
 * sin config o resto de movimientos, mes calendario (comportamiento anterior).
 */
export function transaccionEnMesVista(
  t: Pick<Transaccion, 'fecha' | 'tipo' | 'medio_pago'>,
  mes: number,
  anio: number,
  diaCierreTarjeta: number | null,
): boolean {
  const esTc =
    (t.tipo === 'gasto' || t.tipo === 'suscripcion') && t.medio_pago === 'tarjeta'
  if (esTc && diaCierreTarjeta != null) {
    const r = mesResumenTarjetaCredito(t.fecha, diaCierreTarjeta)
    return r.mes === mes && r.anio === anio
  }
  return fechaEnMesCalendario(t.fecha, mes, anio)
}

/** Grupos para listar movimientos por medio (Carga → Últimas transacciones). */
export type GrupoUltimasTransacciones = 'transferencias' | 'debito' | 'credito' | 'ingresos'

export function grupoUltimasTransacciones(t: Transaccion): GrupoUltimasTransacciones {
  if (t.tipo === 'ingreso') {
    return t.medio_pago === 'tarjeta' ? 'credito' : 'ingresos'
  }
  if (t.tipo === 'gasto' || t.tipo === 'suscripcion') {
    if (t.medio_pago === 'transferencia') return 'transferencias'
    if (t.medio_pago === 'tarjeta') return 'credito'
    return 'debito'
  }
  return 'ingresos'
}

/** Solo gastos: mismo criterio que Últimas transacciones (Transferencias / Débito / Crédito). */
export type GrupoGastoPorMedio = 'transferencias' | 'debito' | 'credito'

export function grupoGastoPorMedio(t: Pick<Transaccion, 'tipo' | 'medio_pago'>): GrupoGastoPorMedio | null {
  if (t.tipo !== 'gasto') return null
  if (t.medio_pago === 'transferencia') return 'transferencias'
  if (t.medio_pago === 'tarjeta') return 'credito'
  return 'debito'
}

export function formatARS(n: number): string {
  // NBSP: evita que el símbolo quede solo en una línea al hacer wrap (KPIs angostas, montos grandes).
  return '$\u00a0' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatUSD(n: number): string {
  return 'USD\u00a0' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Escala tipografía según magnitud para que montos en millones no desborden la tarjeta o el input.
 */
export function montoDisplayClass(
  value: number,
  kind:
    | 'cargaInput'
    | 'kpiHero'
    | 'kpiStat'
    | 'kpiInline'
    | 'pairArs'
    | 'pairArsTarjeta'
    | 'pairUsd'
    | 'pairUsdTarjeta'
    | 'heroUsd'
    | 'saldoHero'
    | 'saldoHeroUsd'
    | 'kpiStatProminent'
    | 'kpiStatProminentResponsive'
    | 'pairUsdProminent'
    | 'pairUsdProminentResponsive',
): string {
  const n = Math.abs(value)
  /** Saldo acumulado en inicio: más grande y fluido al ancho (clamp + vw). */
  if (kind === 'saldoHero') {
    if (n >= 10_000_000)
      return 'text-[clamp(1.5rem,calc(4.5vw_+_0.85rem),2.65rem)] sm:text-[clamp(1.65rem,calc(5vw_+_0.9rem),3rem)] lg:text-[clamp(1.75rem,calc(3.8vw_+_1rem),3.35rem)]'
    if (n >= 1_000_000)
      return 'text-[clamp(1.65rem,calc(5.5vw_+_1rem),3.2rem)] sm:text-[clamp(1.85rem,calc(6vw_+_1.1rem),3.65rem)] lg:text-[clamp(2rem,calc(4.8vw_+_1.2rem),4.1rem)]'
    if (n >= 100_000)
      return 'text-[clamp(1.85rem,calc(6.5vw_+_1.1rem),3.5rem)] sm:text-[clamp(2.05rem,calc(7vw_+_1.2rem),4rem)] lg:text-[clamp(2.2rem,calc(5.5vw_+_1.35rem),4.5rem)]'
    return 'text-[clamp(2rem,calc(7.5vw_+_1.2rem),3.85rem)] sm:text-[clamp(2.2rem,calc(7vw_+_1.4rem),4.35rem)] lg:text-[clamp(2.4rem,calc(5.8vw_+_1.5rem),5rem)]'
  }
  if (kind === 'saldoHeroUsd') {
    if (n >= 100_000) return 'text-[clamp(0.8rem,calc(2.2vw_+_0.55rem),1rem)]'
    if (n >= 10_000) return 'text-[clamp(0.85rem,calc(2.5vw_+_0.6rem),1.1rem)]'
    return 'text-[clamp(0.9rem,calc(2.8vw_+_0.65rem),1.25rem)] sm:text-[clamp(1rem,calc(2.4vw_+_0.7rem),1.35rem)]'
  }
  if (kind === 'cargaInput') {
    if (n >= 10_000_000) return 'text-3xl sm:text-4xl'
    if (n >= 1_000_000) return 'text-4xl sm:text-5xl'
    if (n >= 100_000) return 'text-5xl sm:text-6xl'
    return 'text-6xl sm:text-7xl'
  }
  if (kind === 'kpiHero') {
    if (n >= 10_000_000) return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
    if (n >= 1_000_000) return 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl'
    if (n >= 100_000) return 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl'
    return 'text-4xl sm:text-5xl lg:text-6xl'
  }
  if (kind === 'kpiStat') {
    if (n >= 10_000_000) return 'text-lg sm:text-xl lg:text-xl'
    if (n >= 1_000_000) return 'text-xl sm:text-2xl lg:text-2xl'
    if (n >= 100_000) return 'text-2xl sm:text-2xl lg:text-xl'
    return 'text-3xl sm:text-3xl lg:text-xl'
  }
  /** KPI con el monto como protagonista (p. ej. Gastos sin TC). */
  if (kind === 'kpiStatProminent') {
    if (n >= 10_000_000)
      return 'text-xl sm:text-2xl lg:text-3xl xl:text-4xl'
    if (n >= 1_000_000)
      return 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl'
    if (n >= 100_000)
      return 'text-3xl sm:text-4xl lg:text-5xl xl:text-5xl'
    return 'text-4xl sm:text-5xl lg:text-6xl xl:text-6xl'
  }
  /** Igual que kpiStatProminent en móvil/tablet; en desktop (`lg+`) un poco más que kpiStat (Gastos sin TC). */
  if (kind === 'kpiStatProminentResponsive') {
    if (n >= 10_000_000)
      return 'text-xl sm:text-2xl lg:text-base xl:text-lg'
    if (n >= 1_000_000)
      return 'text-2xl sm:text-3xl lg:text-lg xl:text-xl'
    if (n >= 100_000)
      return 'text-3xl sm:text-4xl lg:text-xl xl:text-xl'
    return 'text-4xl sm:text-5xl lg:text-xl xl:text-xl'
  }
  /** KPI compactos en grilla (p. ej. Análisis anual): base ~text-xl, se achica con millones. */
  if (kind === 'kpiInline') {
    if (n >= 10_000_000) return 'text-sm sm:text-base'
    if (n >= 1_000_000) return 'text-base sm:text-lg'
    if (n >= 100_000) return 'text-lg sm:text-xl'
    return 'text-xl'
  }
  if (kind === 'pairArs') {
    if (n >= 10_000_000) return 'text-base sm:text-lg'
    if (n >= 1_000_000) return 'text-lg sm:text-xl'
    if (n >= 100_000) return 'text-xl sm:text-2xl'
    return 'text-2xl sm:text-3xl'
  }
  /** Home / detalle TC: un escalón más que pairArs para los montos principales. */
  if (kind === 'pairArsTarjeta') {
    if (n >= 10_000_000) return 'text-lg sm:text-xl'
    if (n >= 1_000_000) return 'text-xl sm:text-2xl'
    if (n >= 100_000) return 'text-2xl sm:text-3xl'
    return 'text-3xl sm:text-4xl'
  }
  if (kind === 'pairUsd') {
    if (n >= 100_000) return 'text-lg sm:text-xl lg:text-lg'
    if (n >= 10_000) return 'text-xl sm:text-2xl lg:text-xl'
    return 'text-2xl sm:text-3xl lg:text-2xl'
  }
  if (kind === 'pairUsdTarjeta') {
    if (n >= 100_000) return 'text-lg sm:text-xl'
    if (n >= 10_000) return 'text-xl sm:text-2xl'
    return 'text-2xl sm:text-3xl'
  }
  if (kind === 'pairUsdProminent') {
    if (n >= 100_000) return 'text-lg sm:text-xl'
    if (n >= 10_000) return 'text-xl sm:text-2xl'
    return 'text-xl sm:text-2xl lg:text-3xl'
  }
  /** USD bajo monto ARS protagonista: acompaña kpiStatProminentResponsive un escalón por debajo. */
  if (kind === 'pairUsdProminentResponsive') {
    if (n >= 100_000) return 'text-lg sm:text-xl lg:text-base'
    if (n >= 10_000) return 'text-xl sm:text-2xl lg:text-lg'
    return 'text-xl sm:text-2xl lg:text-lg'
  }
  if (kind === 'heroUsd') {
    if (n >= 100_000) return 'text-sm sm:text-base'
    if (n >= 10_000) return 'text-base sm:text-lg'
    return 'text-lg sm:text-xl'
  }
  return ''
}

export function convertirARS(monto: number, moneda: Moneda, tipoCambio: number): number {
  return moneda === 'USD' ? monto * tipoCambio : monto
}

/** Suma por moneda sin convertir (útil para totales de tarjeta en ARS y USD por separado). */
export function sumarPorMoneda(items: Array<{ monto: number; moneda: Moneda }>): { ars: number; usd: number } {
  let ars = 0
  let usd = 0
  for (const it of items) {
    if (it.moneda === 'USD') usd += it.monto
    else ars += it.monto
  }
  return { ars, usd }
}

export function calcularVariacion(actual: number, anterior: number): number {
  if (anterior === 0) return 0
  return ((actual - anterior) / anterior) * 100
}

/**
 * Miles con punto y decimales con coma (es-AR), p. ej. "18.000" o "18.000,50".
 * Sin coma: si el teclado (p. ej. iPhone) usa "." como decimal ("38.63"), el último punto
 * cuenta como decimal solo si a la derecha hay 0–2 dígitos; si hay 3+ (p. ej. "18.000"), son miles.
 */
export function parseMontoInput(s: string): number {
  const t = s.trim().replace(/\s/g, '')
  if (!t) return NaN
  const commaIdx = t.indexOf(',')
  if (commaIdx !== t.lastIndexOf(',')) return NaN
  if (commaIdx >= 0) {
    const left = t.slice(0, commaIdx).replace(/\./g, '')
    const right = t.slice(commaIdx + 1).replace(/\D/g, '').slice(0, 2)
    const intNum = left === '' ? 0 : parseInt(left, 10)
    if (left !== '' && !Number.isFinite(intNum)) return NaN
    if (right === '') return intNum
    return parseFloat(`${intNum}.${right}`)
  }
  const lastDot = t.lastIndexOf('.')
  if (lastDot >= 0) {
    const afterLast = t.slice(lastDot + 1).replace(/\D/g, '')
    if (afterLast.length >= 3) {
      const digits = t.replace(/\./g, '')
      if (digits === '') return NaN
      const n = parseInt(digits, 10)
      return Number.isFinite(n) ? n : NaN
    }
    const left = t.slice(0, lastDot).replace(/\./g, '')
    const right = afterLast.slice(0, 2)
    const intNum = left === '' ? 0 : parseInt(left, 10)
    if (left !== '' && !Number.isFinite(intNum)) return NaN
    if (right === '') return intNum
    return parseFloat(`${intNum}.${right}`)
  }
  const digits = t.replace(/\./g, '')
  if (digits === '') return NaN
  const n = parseInt(digits, 10)
  return Number.isFinite(n) ? n : NaN
}

/** Valor numérico → texto para mostrar en inputs de monto */
export function formatMontoFromNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ''
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/**
 * onChange de campo monto: reformatea miles (.) y decimales con coma (es-AR).
 * Acepta "." como decimal mientras se escribe (teclado iOS) y lo muestra como ",".
 */
export function montoFieldNextValue(prev: string, raw: string): string {
  let v = raw.replace(/[^\d.,]/g, '')
  if (v === '') return ''

  const commaIdx = v.indexOf(',')
  if (commaIdx !== v.lastIndexOf(',')) return prev

  if (commaIdx === -1) {
    const lastDot = v.lastIndexOf('.')
    if (lastDot === -1) {
      const digitsOnly = v.replace(/\./g, '')
      if (digitsOnly === '') return ''
      const intNum = parseInt(digitsOnly, 10)
      if (!Number.isFinite(intNum)) return prev
      return intNum.toLocaleString('es-AR', { maximumFractionDigits: 0 })
    }
    const afterLast = v.slice(lastDot + 1).replace(/\D/g, '')
    if (afterLast.length >= 3) {
      const digitsOnly = v.replace(/\./g, '')
      if (digitsOnly === '') return ''
      const intNum = parseInt(digitsOnly, 10)
      if (!Number.isFinite(intNum)) return prev
      return intNum.toLocaleString('es-AR', { maximumFractionDigits: 0 })
    }
    const left = v.slice(0, lastDot).replace(/\./g, '')
    const right = afterLast.slice(0, 2)
    const intNum = left === '' ? 0 : parseInt(left, 10)
    if (left !== '' && !Number.isFinite(intNum)) return prev
    const intFmt = intNum.toLocaleString('es-AR', { maximumFractionDigits: 0 })
    if (v.endsWith('.')) return `${intFmt},`
    return `${intFmt},${right}`
  }

  const left = v.slice(0, commaIdx).replace(/\./g, '')
  const right = v.slice(commaIdx + 1).replace(/\D/g, '').slice(0, 2)
  const intNum = left === '' ? 0 : parseInt(left, 10)
  if (left !== '' && !Number.isFinite(intNum)) return prev
  const intFmt = intNum.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  if (v.endsWith(',')) return `${intFmt},`
  return `${intFmt},${right}`
}
