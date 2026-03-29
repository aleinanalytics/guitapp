import type { Moneda, Transaccion } from './types'

/**
 * Solo efectivo/débito (medio_pago efectivo en BD). Lo cargado con tarjeta de crédito no sale del disponible.
 */
export function cuentaComoSalidaDeEfectivo(t: Pick<Transaccion, 'tipo' | 'medio_pago'>): boolean {
  return (
    (t.tipo === 'gasto' || t.tipo === 'suscripcion') &&
    t.medio_pago === 'efectivo'
  )
}

export function formatARS(n: number): string {
  return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatUSD(n: number): string {
  return 'USD ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
