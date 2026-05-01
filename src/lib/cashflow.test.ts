import { describe, it, expect } from 'vitest'
import { proyectarCashflow, primerMesNegativo, resumenAlertasCashflow } from './cashflow'
import type { CompraCuotas, Deuda } from './types'

const tx = (
  fecha: string,
  monto: number,
  tipo: string,
  opts: { moneda?: string; medio_pago?: string; es_gasto_fijo?: boolean; excluye_saldo?: boolean } = {},
) => ({
  fecha,
  monto,
  moneda: opts.moneda ?? 'ARS',
  tipo,
  medio_pago: opts.medio_pago ?? 'efectivo',
  es_gasto_fijo: opts.es_gasto_fijo ?? false,
  excluye_saldo: opts.excluye_saldo ?? false,
})

describe('proyectarCashflow', () => {
  it('proyecta saldo estable con ingresos = gastos', () => {
    const transacciones = [
      tx('2024-01-15', 100000, 'ingreso'),
      tx('2024-01-20', 50000, 'gasto'),
      tx('2024-02-15', 100000, 'ingreso'),
      tx('2024-02-20', 50000, 'gasto'),
      tx('2024-03-15', 100000, 'ingreso'),
      tx('2024-03-20', 50000, 'gasto'),
    ]
    const result = proyectarCashflow({
      transacciones,
      cuotas: [],
      deudas: [],
      saldoActual: 200000,
      tc: 1000,
      mesActual: 3,
      anioActual: 2024,
      mesesProyectar: 3,
    })
    expect(result).toHaveLength(3)
    // Ingreso promedio = 100k, gasto variable promedio = 50k
    // Saldo final debería mantenerse estable: 200k + 50k/mes
    expect(result[0].saldoFinal).toBe(250000)
    expect(result[1].saldoFinal).toBe(300000)
    expect(result[2].saldoFinal).toBe(350000)
  })

  it('considera gastos fijos por separado de variables', () => {
    const transacciones = [
      tx('2024-03-01', 200000, 'ingreso'),
      tx('2024-03-05', 30000, 'gasto', { es_gasto_fijo: true }),
      tx('2024-03-10', 20000, 'gasto'),
      tx('2024-03-15', 10000, 'suscripcion'),
    ]
    const result = proyectarCashflow({
      transacciones,
      cuotas: [],
      deudas: [],
      saldoActual: 0,
      tc: 1000,
      mesActual: 3,
      anioActual: 2024,
      mesesProyectar: 2,
    })
    expect(result[0].ingresos).toBe(200000)
    expect(result[0].gastosFijos).toBe(30000)
    expect(result[0].gastosVariables).toBe(30000) // 20k gasto + 10k suscripcion (no es fijo)
    expect(result[0].suscripciones).toBe(10000) // suscripcion promedio separada
    expect(result[0].saldoFinal).toBe(200000 - 30000 - 10000 - 30000) // = 130000
  })

  it('incluye cuotas de TC en la proyección', () => {
    const cuotas: CompraCuotas[] = [
      {
        id: '1',
        user_id: 'u1',
        descripcion: 'TV',
        monto_total: 60000,
        cuotas_total: 6,
        monto_cuota: 10000,
        fecha_primera_cuota: '2024-03-01',
        moneda: 'ARS',
        categoria_id: null,
        created_at: '',
      },
    ]
    const result = proyectarCashflow({
      transacciones: [tx('2024-03-01', 100000, 'ingreso')],
      cuotas,
      deudas: [],
      saldoActual: 0,
      tc: 1000,
      mesActual: 3,
      anioActual: 2024,
      mesesProyectar: 4,
    })
    expect(result[0].cuotasTC).toBe(10000) // Abril (cuota 2)
    expect(result[1].cuotasTC).toBe(10000) // Mayo (cuota 3)
    expect(result[2].cuotasTC).toBe(10000) // Junio (cuota 4)
    expect(result[3].cuotasTC).toBe(10000) // Julio (cuota 5)
  })

  it('incluye deudas en la proyección', () => {
    const deudas: Deuda[] = [
      {
        id: '1',
        user_id: 'u1',
        descripcion: 'Préstamo',
        tipo_deuda: 'prestamo_personal',
        monto_total: 120000,
        cuotas_total: 12,
        monto_cuota: 10000,
        fecha_primera_cuota: '2024-02-01',
        moneda: 'ARS',
        created_at: '',
      },
    ]
    const result = proyectarCashflow({
      transacciones: [tx('2024-03-01', 100000, 'ingreso')],
      cuotas: [],
      deudas,
      saldoActual: 0,
      tc: 1000,
      mesActual: 3,
      anioActual: 2024,
      mesesProyectar: 3,
    })
    expect(result[0].deudas).toBe(10000) // Abril (cuota 3)
    expect(result[1].deudas).toBe(10000) // Mayo (cuota 4)
    expect(result[2].deudas).toBe(10000) // Junio (cuota 5)
  })

  it('maneja cambio de año en la proyección', () => {
    const result = proyectarCashflow({
      transacciones: [tx('2024-11-01', 100000, 'ingreso')],
      cuotas: [],
      deudas: [],
      saldoActual: 0,
      tc: 1000,
      mesActual: 11,
      anioActual: 2024,
      mesesProyectar: 3,
    })
    expect(result[0].label).toBe('Dic 2024')
    expect(result[1].label).toBe('Ene 2025')
    expect(result[2].label).toBe('Feb 2025')
  })

  it('no cuenta ingresos reintegro TC como ingreso', () => {
    const transacciones = [
      tx('2024-03-01', 100000, 'ingreso'),
      tx('2024-03-05', 5000, 'ingreso', { medio_pago: 'tarjeta' }), // reintegro
    ]
    const result = proyectarCashflow({
      transacciones,
      cuotas: [],
      deudas: [],
      saldoActual: 0,
      tc: 1000,
      mesActual: 3,
      anioActual: 2024,
      mesesProyectar: 1,
    })
    expect(result[0].ingresos).toBe(100000) // sin el reintegro
  })

  it('no cuenta transacciones que excluyen saldo', () => {
    const transacciones = [
      tx('2024-03-01', 100000, 'ingreso'),
      tx('2024-03-05', 30000, 'gasto', { excluye_saldo: true }),
    ]
    const result = proyectarCashflow({
      transacciones,
      cuotas: [],
      deudas: [],
      saldoActual: 0,
      tc: 1000,
      mesActual: 3,
      anioActual: 2024,
      mesesProyectar: 1,
    })
    expect(result[0].gastosVariables).toBe(0)
    expect(result[0].saldoFinal).toBe(100000)
  })

  it('proyecta saldo negativo cuando los gastos superan ingresos', () => {
    const transacciones = [
      tx('2024-03-01', 50000, 'ingreso'),
      tx('2024-03-05', 80000, 'gasto'),
    ]
    const result = proyectarCashflow({
      transacciones,
      cuotas: [],
      deudas: [],
      saldoActual: 10000,
      tc: 1000,
      mesActual: 3,
      anioActual: 2024,
      mesesProyectar: 2,
    })
    expect(result[0].saldoFinal).toBe(-20000) // 10k + 50k - 80k
    expect(result[1].saldoFinal).toBe(-50000) // -20k + 50k - 80k
  })
})

describe('primerMesNegativo', () => {
  it('devuelve null si no hay meses negativos', () => {
    const proy = [
      { saldoFinal: 100 } as any,
      { saldoFinal: 200 } as any,
    ]
    expect(primerMesNegativo(proy)).toBeNull()
  })

  it('devuelve el primer mes con saldo negativo', () => {
    const proy = [
      { saldoFinal: 100, label: 'Mes 1' } as any,
      { saldoFinal: -50, label: 'Mes 2' } as any,
      { saldoFinal: -100, label: 'Mes 3' } as any,
    ]
    expect(primerMesNegativo(proy)?.label).toBe('Mes 2')
  })
})

describe('resumenAlertasCashflow', () => {
  it('detecta meses bajo fondo de emergencia', () => {
    const proy = [
      { saldoFinal: 50000, label: 'Mes 1' } as any,
      { saldoFinal: 30000, label: 'Mes 2' } as any,
      { saldoFinal: 10000, label: 'Mes 3' } as any,
    ]
    const res = resumenAlertasCashflow(proy, 20000)
    expect(res.hayAlerta).toBe(true)
    expect(res.mesesBajoEmergencia).toHaveLength(1)
    expect(res.mesesBajoEmergencia[0].label).toBe('Mes 3')
  })

  it('no alerta si todo está por encima del fondo', () => {
    const proy = [
      { saldoFinal: 50000, label: 'Mes 1' } as any,
      { saldoFinal: 40000, label: 'Mes 2' } as any,
    ]
    const res = resumenAlertasCashflow(proy, 10000)
    expect(res.hayAlerta).toBe(false)
    expect(res.mesesBajoEmergencia).toHaveLength(0)
  })
})
