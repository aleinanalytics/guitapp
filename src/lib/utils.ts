import type { Moneda } from './types'

export function formatARS(n: number): string {
  return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatUSD(n: number): string {
  return 'USD ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function convertirARS(monto: number, moneda: Moneda, tipoCambio: number): number {
  return moneda === 'USD' ? monto * tipoCambio : monto
}

export function calcularVariacion(actual: number, anterior: number): number {
  if (anterior === 0) return 0
  return ((actual - anterior) / anterior) * 100
}

/** Miles con punto y decimales con coma (es-AR), p. ej. "18.000" o "18.000,50" */
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
 * onChange de campo monto: reformatea miles (.) y preserva coma decimal mientras se escribe.
 */
export function montoFieldNextValue(prev: string, raw: string): string {
  let v = raw.replace(/[^\d.,]/g, '')
  if (v === '') return ''

  const commaIdx = v.indexOf(',')
  if (commaIdx !== v.lastIndexOf(',')) return prev

  if (commaIdx === -1) {
    const digitsOnly = v.replace(/\./g, '')
    if (digitsOnly === '') return ''
    const intNum = parseInt(digitsOnly, 10)
    if (!Number.isFinite(intNum)) return prev
    return intNum.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  }

  const left = v.slice(0, commaIdx).replace(/\./g, '')
  const right = v.slice(commaIdx + 1).replace(/\D/g, '').slice(0, 2)
  const intNum = left === '' ? 0 : parseInt(left, 10)
  if (left !== '' && !Number.isFinite(intNum)) return prev
  const intFmt = intNum.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  if (v.endsWith(',')) return `${intFmt},`
  return `${intFmt},${right}`
}
