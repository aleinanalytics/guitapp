import { describe, it, expect } from 'vitest'
import {
  cuentaComoSalidaDeEfectivo,
  esIngresoReintegroTarjetaCredito,
  ultimoDiaDelMes,
  mesResumenTarjetaCredito,
  fechaEnMesCalendario,
  transaccionEnMesVista,
  grupoUltimasTransacciones,
  grupoGastoPorMedio,
  formatARS,
  formatUSD,
  convertirARS,
  sumarPorMoneda,
  calcularVariacion,
  parseMontoInput,
  formatMontoFromNumber,
  montoFieldNextValue,
} from './utils'
import type { Transaccion } from './types'

// ─── cuentaComoSalidaDeEfectivo ───────────────────────────────────────────────
describe('cuentaComoSalidaDeEfectivo', () => {
  it('devuelve false para ingresos', () => {
    expect(cuentaComoSalidaDeEfectivo({ tipo: 'ingreso', medio_pago: 'efectivo' })).toBe(false)
    expect(cuentaComoSalidaDeEfectivo({ tipo: 'ingreso', medio_pago: 'transferencia' })).toBe(false)
  })

  it('devuelve false si excluye_saldo es true', () => {
    expect(
      cuentaComoSalidaDeEfectivo({ tipo: 'gasto', medio_pago: 'efectivo', excluye_saldo: true }),
    ).toBe(false)
    expect(
      cuentaComoSalidaDeEfectivo({ tipo: 'suscripcion', medio_pago: 'transferencia', excluye_saldo: true }),
    ).toBe(false)
  })

  it('devuelve true para gastos/suscripciones en efectivo o transferencia', () => {
    expect(cuentaComoSalidaDeEfectivo({ tipo: 'gasto', medio_pago: 'efectivo' })).toBe(true)
    expect(cuentaComoSalidaDeEfectivo({ tipo: 'suscripcion', medio_pago: 'transferencia' })).toBe(true)
  })

  it('devuelve false para tarjeta de crédito salvo que se pida incluir', () => {
    expect(cuentaComoSalidaDeEfectivo({ tipo: 'gasto', medio_pago: 'tarjeta' })).toBe(false)
    expect(cuentaComoSalidaDeEfectivo({ tipo: 'gasto', medio_pago: 'tarjeta' }, true)).toBe(true)
  })
})

// ─── esIngresoReintegroTarjetaCredito ─────────────────────────────────────────
describe('esIngresoReintegroTarjetaCredito', () => {
  it('identifica ingreso con medio tarjeta', () => {
    expect(esIngresoReintegroTarjetaCredito({ tipo: 'ingreso', medio_pago: 'tarjeta' })).toBe(true)
  })

  it('devuelve false para otros casos', () => {
    expect(esIngresoReintegroTarjetaCredito({ tipo: 'ingreso', medio_pago: 'efectivo' })).toBe(false)
    expect(esIngresoReintegroTarjetaCredito({ tipo: 'gasto', medio_pago: 'tarjeta' })).toBe(false)
    expect(esIngresoReintegroTarjetaCredito({ tipo: 'gasto', medio_pago: 'efectivo' })).toBe(false)
  })
})

// ─── ultimoDiaDelMes ──────────────────────────────────────────────────────────
describe('ultimoDiaDelMes', () => {
  it('calcula correctamente días por mes', () => {
    expect(ultimoDiaDelMes(2024, 1)).toBe(31) // enero
    expect(ultimoDiaDelMes(2024, 2)).toBe(29) // feb bisiesto
    expect(ultimoDiaDelMes(2023, 2)).toBe(28) // feb no bisiesto
    expect(ultimoDiaDelMes(2024, 4)).toBe(30) // abril
    expect(ultimoDiaDelMes(2024, 12)).toBe(31) // diciembre
  })
})

// ─── mesResumenTarjetaCredito ─────────────────────────────────────────────────
describe('mesResumenTarjetaCredito', () => {
  it('asigna al mismo mes si la compra es hasta el cierre', () => {
    expect(mesResumenTarjetaCredito('2024-03-15', 20)).toEqual({ mes: 3, anio: 2024 })
    expect(mesResumenTarjetaCredito('2024-03-20', 20)).toEqual({ mes: 3, anio: 2024 })
  })

  it('asigna al mes siguiente si la compra es después del cierre', () => {
    expect(mesResumenTarjetaCredito('2024-03-21', 20)).toEqual({ mes: 4, anio: 2024 })
  })

  it('cruza de diciembre a enero', () => {
    expect(mesResumenTarjetaCredito('2024-12-25', 20)).toEqual({ mes: 1, anio: 2025 })
  })

  it('respeta el máximo de días del mes', () => {
    // Febrero 2024 tiene 29 días; cierre 31 se limita a 29
    expect(mesResumenTarjetaCredito('2024-02-15', 31)).toEqual({ mes: 2, anio: 2024 })
    expect(mesResumenTarjetaCredito('2024-02-28', 31)).toEqual({ mes: 2, anio: 2024 })
    // 29/02 no es > 29 (cierre ajustado), queda en febrero
    expect(mesResumenTarjetaCredito('2024-02-29', 31)).toEqual({ mes: 2, anio: 2024 })
  })
})

// ─── fechaEnMesCalendario ─────────────────────────────────────────────────────
describe('fechaEnMesCalendario', () => {
  it('devuelve true para fechas en el mes', () => {
    expect(fechaEnMesCalendario('2024-03-15', 3, 2024)).toBe(true)
  })

  it('devuelve false para fechas fuera del mes', () => {
    expect(fechaEnMesCalendario('2024-03-15', 4, 2024)).toBe(false)
    expect(fechaEnMesCalendario('2024-03-15', 3, 2023)).toBe(false)
  })
})

// ─── transaccionEnMesVista ────────────────────────────────────────────────────
describe('transaccionEnMesVista', () => {
  it('usa mes calendario para movimientos no-TC', () => {
    expect(transaccionEnMesVista({ fecha: '2024-03-15', tipo: 'gasto', medio_pago: 'efectivo' }, 3, 2024, 20)).toBe(true)
    expect(transaccionEnMesVista({ fecha: '2024-03-15', tipo: 'ingreso', medio_pago: 'transferencia' }, 4, 2024, 20)).toBe(false)
  })

  it('usa mes de resumen TC cuando hay día de cierre', () => {
    // Compra 21/03 con cierre 20/03 → va a abril
    expect(transaccionEnMesVista({ fecha: '2024-03-21', tipo: 'gasto', medio_pago: 'tarjeta' }, 4, 2024, 20)).toBe(true)
    expect(transaccionEnMesVista({ fecha: '2024-03-21', tipo: 'gasto', medio_pago: 'tarjeta' }, 3, 2024, 20)).toBe(false)
  })

  it('usa mes calendario para TC si no hay día de cierre', () => {
    expect(transaccionEnMesVista({ fecha: '2024-03-15', tipo: 'gasto', medio_pago: 'tarjeta' }, 3, 2024, null)).toBe(true)
  })
})

// ─── grupoUltimasTransacciones ────────────────────────────────────────────────
describe('grupoUltimasTransacciones', () => {
  it('clasifica ingresos', () => {
    expect(grupoUltimasTransacciones({ tipo: 'ingreso', medio_pago: 'efectivo' } as Transaccion)).toBe('ingresos')
    expect(grupoUltimasTransacciones({ tipo: 'ingreso', medio_pago: 'tarjeta' } as Transaccion)).toBe('credito')
  })

  it('clasifica gastos y suscripciones', () => {
    expect(grupoUltimasTransacciones({ tipo: 'gasto', medio_pago: 'transferencia' } as Transaccion)).toBe('transferencias')
    expect(grupoUltimasTransacciones({ tipo: 'gasto', medio_pago: 'tarjeta' } as Transaccion)).toBe('credito')
    expect(grupoUltimasTransacciones({ tipo: 'suscripcion', medio_pago: 'efectivo' } as Transaccion)).toBe('debito')
    expect(grupoUltimasTransacciones({ tipo: 'gasto', medio_pago: 'efectivo' } as Transaccion)).toBe('debito')
  })
})

// ─── grupoGastoPorMedio ───────────────────────────────────────────────────────
describe('grupoGastoPorMedio', () => {
  it('devuelve null para no-gastos', () => {
    expect(grupoGastoPorMedio({ tipo: 'ingreso', medio_pago: 'efectivo' })).toBeNull()
    expect(grupoGastoPorMedio({ tipo: 'suscripcion', medio_pago: 'efectivo' })).toBeNull()
  })

  it('clasifica gastos por medio', () => {
    expect(grupoGastoPorMedio({ tipo: 'gasto', medio_pago: 'transferencia' })).toBe('transferencias')
    expect(grupoGastoPorMedio({ tipo: 'gasto', medio_pago: 'tarjeta' })).toBe('credito')
    expect(grupoGastoPorMedio({ tipo: 'gasto', medio_pago: 'efectivo' })).toBe('debito')
  })
})

// ─── formatARS / formatUSD ────────────────────────────────────────────────────
describe('formatARS', () => {
  it('formatea con símbolo y separadores es-AR', () => {
    expect(formatARS(1234.56)).toBe('$\u00a01.234,56')
    expect(formatARS(1000000)).toBe('$\u00a01.000.000,00')
    expect(formatARS(0)).toBe('$\u00a00,00')
  })
})

describe('formatUSD', () => {
  it('formatea con símbolo y separadores en-US', () => {
    expect(formatUSD(1234.56)).toBe('USD\u00a01,234.56')
    expect(formatUSD(1000000)).toBe('USD\u00a01,000,000.00')
  })
})

// ─── convertirARS ─────────────────────────────────────────────────────────────
describe('convertirARS', () => {
  it('convierte USD a ARS', () => {
    expect(convertirARS(100, 'USD', 1250)).toBe(125000)
    expect(convertirARS(50.5, 'USD', 1000)).toBe(50500)
  })

  it('deja ARS sin cambios', () => {
    expect(convertirARS(5000, 'ARS', 1250)).toBe(5000)
  })
})

// ─── sumarPorMoneda ───────────────────────────────────────────────────────────
describe('sumarPorMoneda', () => {
  it('suma separando ARS y USD', () => {
    const items = [
      { monto: 1000, moneda: 'ARS' as const },
      { monto: 500, moneda: 'ARS' as const },
      { monto: 100, moneda: 'USD' as const },
      { monto: 50, moneda: 'USD' as const },
    ]
    expect(sumarPorMoneda(items)).toEqual({ ars: 1500, usd: 150 })
  })

  it('devuelve ceros si el array está vacío', () => {
    expect(sumarPorMoneda([])).toEqual({ ars: 0, usd: 0 })
  })
})

// ─── calcularVariacion ────────────────────────────────────────────────────────
describe('calcularVariacion', () => {
  it('calcula variación porcentual', () => {
    expect(calcularVariacion(110, 100)).toBe(10)
    expect(calcularVariacion(90, 100)).toBe(-10)
    expect(calcularVariacion(100, 100)).toBe(0)
  })

  it('devuelve 0 si el anterior es 0', () => {
    expect(calcularVariacion(100, 0)).toBe(0)
  })
})

// ─── parseMontoInput ──────────────────────────────────────────────────────────
describe('parseMontoInput', () => {
  it('parsea formato es-AR', () => {
    expect(parseMontoInput('1.234,56')).toBe(1234.56)
    expect(parseMontoInput('18.000')).toBe(18000)
    expect(parseMontoInput('18.000,50')).toBe(18000.5)
  })

  it('parsea formato punto decimal', () => {
    expect(parseMontoInput('1234.56')).toBe(1234.56)
    expect(parseMontoInput('38.63')).toBe(38.63) // iPhone: punto como decimal
  })

  it('parsea enteros', () => {
    expect(parseMontoInput('1234')).toBe(1234)
  })

  it('devuelve NaN para valores inválidos', () => {
    expect(parseMontoInput('')).toBeNaN()
    expect(parseMontoInput('abc')).toBeNaN()
    expect(parseMontoInput('1,23,45')).toBeNaN()
  })
})

// ─── formatMontoFromNumber ────────────────────────────────────────────────────
describe('formatMontoFromNumber', () => {
  it('formatea números a es-AR', () => {
    expect(formatMontoFromNumber(1234.56)).toBe('1.234,56')
    expect(formatMontoFromNumber(18000)).toBe('18.000')
    expect(formatMontoFromNumber(0)).toBe('0')
  })

  it('devuelve string vacío para negativos o no finitos', () => {
    expect(formatMontoFromNumber(-10)).toBe('')
    expect(formatMontoFromNumber(NaN)).toBe('')
    expect(formatMontoFromNumber(Infinity)).toBe('')
  })
})

// ─── montoFieldNextValue ──────────────────────────────────────────────────────
describe('montoFieldNextValue', () => {
  it('formatea enteros con separadores de miles', () => {
    expect(montoFieldNextValue('', '18000')).toBe('18.000')
    expect(montoFieldNextValue('', '1234')).toBe('1.234')
  })

  it('maneja decimales con coma', () => {
    expect(montoFieldNextValue('', '1234,56')).toBe('1.234,56')
    expect(montoFieldNextValue('', '1234,')).toBe('1.234,')
  })

  it('maneja punto como decimal mientras se escribe', () => {
    expect(montoFieldNextValue('', '38.63')).toBe('38,63')
    expect(montoFieldNextValue('', '38.')).toBe('38,')
  })

  it('rechaza múltiples comas', () => {
    expect(montoFieldNextValue('1.234,56', '1,23,45')).toBe('1.234,56')
  })

  it('devuelve vacío para string vacío', () => {
    expect(montoFieldNextValue('', '')).toBe('')
  })
})
