/**
 * Schemas Zod para validación de forms
 * Centraliza toda la validación de la app con tipado seguro
 */
import { z } from 'zod'

// ─── Tipos de moneda ─────────────────────────────────────────────────────────
export const monedaSchema = z.enum(['ARS', 'USD'])
export type Moneda = z.infer<typeof monedaSchema>

// ─── Tipos de transacción ────────────────────────────────────────────────────
export const tipoTransaccionSchema = z.enum(['ingreso', 'gasto', 'suscripcion'])
export type TipoTransaccion = z.infer<typeof tipoTransaccionSchema>

// ─── Medios de pago ──────────────────────────────────────────────────────────
export const medioPagoSchema = z.enum(['efectivo', 'tarjeta', 'transferencia'])
export type MedioPago = z.infer<typeof medioPagoSchema>

// ─── Tipos de deuda ──────────────────────────────────────────────────────────
export const tipoDeudaSchema = z.enum([
  'prestamo_personal',
  'prestamo_prendario',
  'refinanciacion_bancaria',
  'arreglo_estudio',
  'otro'
])
export type TipoDeuda = z.infer<typeof tipoDeudaSchema>

// ─── Helpers ───────────────────────────────────────────────────────────────────
const montoPositivo = z.number().positive('El monto debe ser mayor a 0')
const stringNoVacio = z.string().min(1, 'Este campo es requerido').trim()
const fechaValida = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')

// ─── Schema: Transacción ───────────────────────────────────────────────────────
export const transaccionSchema = z.object({
  descripcion: stringNoVacio.max(100, 'Máximo 100 caracteres'),
  monto: montoPositivo,
  moneda: monedaSchema,
  tipo: tipoTransaccionSchema,
  medio_pago: medioPagoSchema,
  fecha: fechaValida,
  categoria_id: z.string().uuid(),
  es_gasto_fijo: z.boolean().optional(),
  excluye_saldo: z.boolean().optional(),
})

export type TransaccionFormData = z.infer<typeof transaccionSchema>

// ─── Schema: Compra en Cuotas ────────────────────────────────────────────────
export const compraCuotasSchema = z.object({
  descripcion: stringNoVacio.max(100, 'Máximo 100 caracteres'),
  monto_total: montoPositivo,
  cuotas_total: z.number().int().min(2, 'Mínimo 2 cuotas').max(48, 'Máximo 48 cuotas'),
  fecha_primera_cuota: fechaValida,
  moneda: monedaSchema,
  categoria_id: z.string().uuid(),
})

export type CompraCuotasFormData = z.infer<typeof compraCuotasSchema>

// ─── Schema: Deuda ─────────────────────────────────────────────────────────────
export const deudaSchema = z.object({
  descripcion: stringNoVacio.max(100, 'Máximo 100 caracteres'),
  tipo_deuda: tipoDeudaSchema,
  monto_total: montoPositivo,
  cuotas_total: z.number().int().min(1, 'Mínimo 1 cuota').max(84, 'Máximo 84 cuotas'),
  fecha_primera_cuota: fechaValida,
  moneda: monedaSchema,
})

export type DeudaFormData = z.infer<typeof deudaSchema>

// ─── Schema: Config Tarjeta ────────────────────────────────────────────────────
export const tarjetaConfigSchema = z.object({
  fecha_cierre: fechaValida,
  fecha_vencimiento: fechaValida,
})

export type TarjetaConfigFormData = z.infer<typeof tarjetaConfigSchema>

// ─── Schema: Feedback ──────────────────────────────────────────────────────────
export const feedbackSchema = z.object({
  tipo: z.enum(['fallo', 'funcion', 'categoria', 'otro']),
  mensaje: stringNoVacio.min(10, 'Mínimo 10 caracteres').max(1000, 'Máximo 1000 caracteres'),
  email: z.string().email('Email inválido').optional().nullable(),
})

export type FeedbackFormData = z.infer<typeof feedbackSchema>

// ─── Schema: Bolsillo Movimiento ───────────────────────────────────────────────
export const bolsilloMovimientoSchema = z.object({
  tipo: z.enum(['ahorro', 'emergencia']),
  monto: montoPositivo,
  moneda: monedaSchema,
})

export type BolsilloMovimientoFormData = z.infer<typeof bolsilloMovimientoSchema>

// ─── Schema: Tipo de Cambio ────────────────────────────────────────────────────
export const tipoCambioSchema = z.object({
  fecha: fechaValida,
  usd_ars: z.number().positive().min(1).max(10000),
})

export type TipoCambioFormData = z.infer<typeof tipoCambioSchema>

// ─── Validación de inputs de monto (strings) ───────────────────────────────────
export const montoInputSchema = z.string().transform((val, ctx) => {
  // Acepta formatos: "1.234,56", "1234,56", "1234.56"
  const normalized = val
    .replace(/\./g, '') // Quitar puntos de miles
    .replace(',', '.')  // Convertir coma decimal a punto

  const parsed = parseFloat(normalized)

  if (isNaN(parsed) || parsed <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Monto inválido',
    })
    return z.NEVER
  }

  return parsed
})

// ─── Validación de número de cuotas (strings) ──────────────────────────────────
export const cuotasInputSchema = z.string().transform((val, ctx) => {
  const parsed = parseInt(val, 10)

  if (isNaN(parsed) || parsed < 1 || parsed > 84) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Número de cuotas inválido (1-84)',
    })
    return z.NEVER
  }

  return parsed
})

// ─── Helper: Parsear form con Zod ──────────────────────────────────────────────
export function parseFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.issues.map((issue) => issue.message)
  return { success: false, errors }
}

// ─── Helper: Obtener mensaje de error legible ──────────────────────────────────
export function getValidationErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'valor'
    return `${path}: ${issue.message}`
  })
}
