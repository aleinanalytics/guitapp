import { describe, it, expect } from 'vitest'
import {
  monedaSchema,
  tipoTransaccionSchema,
  medioPagoSchema,
  transaccionSchema,
  compraCuotasSchema,
  deudaSchema,
  tarjetaConfigSchema,
  feedbackSchema,
  bolsilloMovimientoSchema,
  tipoCambioSchema,
  montoInputSchema,
  cuotasInputSchema,
  parseFormData,
  getValidationErrors,
} from './schemas'
import { z } from 'zod'

// ─── enums ────────────────────────────────────────────────────────────────────
describe('monedaSchema', () => {
  it('acepta ARS y USD', () => {
    expect(monedaSchema.parse('ARS')).toBe('ARS')
    expect(monedaSchema.parse('USD')).toBe('USD')
  })

  it('rechaza otros valores', () => {
    expect(() => monedaSchema.parse('EUR')).toThrow()
  })
})

describe('tipoTransaccionSchema', () => {
  it('acepta valores válidos', () => {
    expect(tipoTransaccionSchema.parse('ingreso')).toBe('ingreso')
    expect(tipoTransaccionSchema.parse('gasto')).toBe('gasto')
    expect(tipoTransaccionSchema.parse('suscripcion')).toBe('suscripcion')
  })
})

describe('medioPagoSchema', () => {
  it('acepta valores válidos', () => {
    expect(medioPagoSchema.parse('efectivo')).toBe('efectivo')
    expect(medioPagoSchema.parse('tarjeta')).toBe('tarjeta')
    expect(medioPagoSchema.parse('transferencia')).toBe('transferencia')
  })
})

// ─── transaccionSchema ────────────────────────────────────────────────────────
describe('transaccionSchema', () => {
  const base = {
    descripcion: 'Compra',
    monto: 1000,
    moneda: 'ARS',
    tipo: 'gasto',
    medio_pago: 'efectivo',
    fecha: '2024-03-15',
    categoria_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  }

  it('acepta transacción válida', () => {
    expect(transaccionSchema.parse(base)).toEqual(base)
  })

  it('rechaza descripción vacía', () => {
    expect(() => transaccionSchema.parse({ ...base, descripcion: '' })).toThrow()
  })

  it('rechaza descripción mayor a 100 caracteres', () => {
    expect(() => transaccionSchema.parse({ ...base, descripcion: 'a'.repeat(101) })).toThrow()
  })

  it('rechaza monto negativo o cero', () => {
    expect(() => transaccionSchema.parse({ ...base, monto: 0 })).toThrow()
    expect(() => transaccionSchema.parse({ ...base, monto: -10 })).toThrow()
  })

  it('rechaza fecha inválida', () => {
    expect(() => transaccionSchema.parse({ ...base, fecha: '15-03-2024' })).toThrow()
    expect(() => transaccionSchema.parse({ ...base, fecha: '2024/03/15' })).toThrow()
  })

  it('rechaza categoria_id inválido', () => {
    expect(() => transaccionSchema.parse({ ...base, categoria_id: 'no-uuid' })).toThrow()
  })

  it('acepta flags opcionales', () => {
    expect(transaccionSchema.parse({ ...base, es_gasto_fijo: true, excluye_saldo: false })).toEqual({
      ...base,
      es_gasto_fijo: true,
      excluye_saldo: false,
    })
  })
})

// ─── compraCuotasSchema ───────────────────────────────────────────────────────
describe('compraCuotasSchema', () => {
  const base = {
    descripcion: 'Televisor',
    monto_total: 500000,
    cuotas_total: 12,
    fecha_primera_cuota: '2024-03-15',
    moneda: 'ARS',
    categoria_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  }

  it('acepta compra válida', () => {
    expect(compraCuotasSchema.parse(base)).toEqual(base)
  })

  it('rechaza menos de 2 cuotas', () => {
    expect(() => compraCuotasSchema.parse({ ...base, cuotas_total: 1 })).toThrow()
  })

  it('rechaza más de 48 cuotas', () => {
    expect(() => compraCuotasSchema.parse({ ...base, cuotas_total: 49 })).toThrow()
  })
})

// ─── deudaSchema ──────────────────────────────────────────────────────────────
describe('deudaSchema', () => {
  const base = {
    descripcion: 'Préstamo',
    tipo_deuda: 'prestamo_personal',
    monto_total: 1000000,
    cuotas_total: 24,
    fecha_primera_cuota: '2024-03-15',
    moneda: 'ARS',
  }

  it('acepta deuda válida', () => {
    expect(deudaSchema.parse(base)).toEqual(base)
  })

  it('rechaza tipo_deuda inválido', () => {
    expect(() => deudaSchema.parse({ ...base, tipo_deuda: 'hipotecario' })).toThrow()
  })

  it('permite hasta 84 cuotas', () => {
    expect(deudaSchema.parse({ ...base, cuotas_total: 84 })).toEqual({ ...base, cuotas_total: 84 })
    expect(() => deudaSchema.parse({ ...base, cuotas_total: 85 })).toThrow()
  })
})

// ─── tarjetaConfigSchema ──────────────────────────────────────────────────────
describe('tarjetaConfigSchema', () => {
  it('acepta fechas válidas', () => {
    expect(tarjetaConfigSchema.parse({ fecha_cierre: '2024-03-20', fecha_vencimiento: '2024-04-05' })).toEqual({
      fecha_cierre: '2024-03-20',
      fecha_vencimiento: '2024-04-05',
    })
  })

  it('rechaza fechas inválidas', () => {
    expect(() => tarjetaConfigSchema.parse({ fecha_cierre: '20-03-2024', fecha_vencimiento: '2024-04-05' })).toThrow()
  })
})

// ─── feedbackSchema ───────────────────────────────────────────────────────────
describe('feedbackSchema', () => {
  it('acepta feedback válido', () => {
    expect(feedbackSchema.parse({ tipo: 'fallo', mensaje: 'No funciona el botón de guardar' })).toEqual({
      tipo: 'fallo',
      mensaje: 'No funciona el botón de guardar',
      email: undefined,
    })
  })

  it('acepta feedback con email', () => {
    expect(feedbackSchema.parse({ tipo: 'funcion', mensaje: 'Agregar modo oscuro', email: 'test@example.com' })).toEqual({
      tipo: 'funcion',
      mensaje: 'Agregar modo oscuro',
      email: 'test@example.com',
    })
  })

  it('rechaza tipo inválido', () => {
    expect(() => feedbackSchema.parse({ tipo: 'bug', mensaje: 'No funciona el botón de guardar' })).toThrow()
  })

  it('rechaza mensaje corto', () => {
    expect(() => feedbackSchema.parse({ tipo: 'fallo', mensaje: 'corto' })).toThrow()
  })

  it('rechaza email inválido', () => {
    expect(() => feedbackSchema.parse({ tipo: 'otro', mensaje: 'Mensaje válido de más de diez caracteres', email: 'no-es-email' })).toThrow()
  })
})

// ─── bolsilloMovimientoSchema ─────────────────────────────────────────────────
describe('bolsilloMovimientoSchema', () => {
  it('acepta movimiento válido', () => {
    expect(bolsilloMovimientoSchema.parse({ tipo: 'ahorro', monto: 5000, moneda: 'ARS' })).toEqual({
      tipo: 'ahorro',
      monto: 5000,
      moneda: 'ARS',
    })
  })

  it('rechaza tipo inválido', () => {
    expect(() => bolsilloMovimientoSchema.parse({ tipo: 'inversion', monto: 5000, moneda: 'ARS' })).toThrow()
  })
})

// ─── tipoCambioSchema ─────────────────────────────────────────────────────────
describe('tipoCambioSchema', () => {
  it('acepta tipo de cambio válido', () => {
    expect(tipoCambioSchema.parse({ fecha: '2024-03-15', usd_ars: 1250 })).toEqual({ fecha: '2024-03-15', usd_ars: 1250 })
  })

  it('rechaza valor fuera de rango', () => {
    expect(() => tipoCambioSchema.parse({ fecha: '2024-03-15', usd_ars: 0.5 })).toThrow()
    expect(() => tipoCambioSchema.parse({ fecha: '2024-03-15', usd_ars: 15000 })).toThrow()
  })
})

// ─── montoInputSchema ─────────────────────────────────────────────────────────
describe('montoInputSchema', () => {
  it('parsea formato es-AR', () => {
    expect(montoInputSchema.parse('1.234,56')).toBe(1234.56)
    expect(montoInputSchema.parse('18.000')).toBe(18000)
  })

  it('trata puntos como separadores de miles (formato es-AR)', () => {
    // En el schema, puntos se eliminan (miles) y solo la coma es decimal
    expect(montoInputSchema.parse('1.234')).toBe(1234)
    expect(montoInputSchema.parse('1.234.567')).toBe(1234567)
  })

  it('rechaza valores inválidos', () => {
    expect(() => montoInputSchema.parse('abc')).toThrow()
    expect(() => montoInputSchema.parse('0')).toThrow()
    expect(() => montoInputSchema.parse('-100')).toThrow()
  })
})

// ─── cuotasInputSchema ────────────────────────────────────────────────────────
describe('cuotasInputSchema', () => {
  it('parsea números válidos', () => {
    expect(cuotasInputSchema.parse('12')).toBe(12)
    expect(cuotasInputSchema.parse('1')).toBe(1)
  })

  it('rechaza valores inválidos', () => {
    expect(() => cuotasInputSchema.parse('0')).toThrow()
    expect(() => cuotasInputSchema.parse('85')).toThrow()
    expect(() => cuotasInputSchema.parse('abc')).toThrow()
  })
})

// ─── parseFormData ────────────────────────────────────────────────────────────
describe('parseFormData', () => {
  it('devuelve success true con datos parseados', () => {
    const result = parseFormData(z.string(), 'hello')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('hello')
  })

  it('devuelve success false con errores', () => {
    const result = parseFormData(z.number(), 'not-a-number')
    expect(result.success).toBe(false)
    if (!result.success) expect(result.errors.length).toBeGreaterThan(0)
  })
})

// ─── getValidationErrors ──────────────────────────────────────────────────────
describe('getValidationErrors', () => {
  it('devuelve mensajes legibles', () => {
    const result = z.object({ name: z.string().min(1) }).safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = getValidationErrors(result.error)
      expect(errors[0]).toContain('name')
    }
  })
})
