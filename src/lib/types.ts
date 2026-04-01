export type Moneda = 'ARS' | 'USD'
export type TipoTransaccion = 'ingreso' | 'gasto' | 'suscripcion'
export type MedioPago = 'efectivo' | 'tarjeta' | 'transferencia'

export interface Categoria {
  id: string
  nombre: string
  tipo: TipoTransaccion
  color: string
  /** Si existe, esta categoría es subcategoría de otra (solo gasto). */
  parent_id?: string | null
}

export interface Transaccion {
  id: string
  fecha: string
  descripcion: string
  monto: number
  moneda: Moneda
  tipo: TipoTransaccion
  medio_pago: MedioPago
  categoria_id: string | null
  /** Solo tipo gasto: si es true, cuenta en el promedio de gastos fijos (fondo de emergencia). */
  es_gasto_fijo?: boolean
  /**
   * Gasto/suscripción con salida efectivo o transferencia que no debe restar de tu saldo/disponible
   * (ej. lo pagó otra persona); sigue contando en totales y categorías para seguimiento.
   */
  excluye_saldo?: boolean
  categoria?: Categoria
  created_at: string
}

export interface TipoCambio {
  id: string
  fecha: string
  usd_ars: number
}

export interface TarjetaConfig {
  id: string
  user_id: string
  fecha_cierre: string
  fecha_vencimiento: string
}

export interface CompraCuotas {
  id: string
  user_id: string
  descripcion: string
  monto_total: number
  cuotas_total: number
  monto_cuota: number
  fecha_primera_cuota: string
  moneda: Moneda
  categoria_id: string | null
  categoria?: Categoria
  created_at: string
}

export type BolsilloTipo = 'ahorro' | 'emergencia'

export interface BolsilloConfig {
  user_id: string
  tipo: BolsilloTipo
  objetivo_monto: number | null
  meses_sugerencia: number
  updated_at: string
}

export interface BolsilloMovimiento {
  id: string
  user_id: string
  tipo: BolsilloTipo
  monto: number
  created_at: string
}
