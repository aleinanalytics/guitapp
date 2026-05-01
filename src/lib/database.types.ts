/**
 * Tipos auto-generados de Supabase Database
 * Basado en el schema actual de la app
 *
 * En producción, generar con:
 * npx supabase gen types typescript --project-id <project-id> > src/lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: {
          id: string
          nombre: string
          tipo: 'ingreso' | 'gasto' | 'suscripcion'
          color: string
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          tipo: 'ingreso' | 'gasto' | 'suscripcion'
          color: string
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          tipo?: 'ingreso' | 'gasto' | 'suscripcion'
          color?: string
          parent_id?: string | null
          created_at?: string
        }
      }
      transacciones: {
        Row: {
          id: string
          user_id: string
          fecha: string
          descripcion: string
          monto: number
          moneda: 'ARS' | 'USD'
          tipo: 'ingreso' | 'gasto' | 'suscripcion'
          medio_pago: 'efectivo' | 'tarjeta' | 'transferencia'
          categoria_id: string | null
          es_gasto_fijo: boolean | null
          excluye_saldo: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fecha: string
          descripcion: string
          monto: number
          moneda: 'ARS' | 'USD'
          tipo: 'ingreso' | 'gasto' | 'suscripcion'
          medio_pago: 'efectivo' | 'tarjeta' | 'transferencia'
          categoria_id?: string | null
          es_gasto_fijo?: boolean | null
          excluye_saldo?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fecha?: string
          descripcion?: string
          monto?: number
          moneda?: 'ARS' | 'USD'
          tipo?: 'ingreso' | 'gasto' | 'suscripcion'
          medio_pago?: 'efectivo' | 'tarjeta' | 'transferencia'
          categoria_id?: string | null
          es_gasto_fijo?: boolean | null
          excluye_saldo?: boolean | null
          created_at?: string
        }
      }
      compras_cuotas: {
        Row: {
          id: string
          user_id: string
          descripcion: string
          monto_total: number
          cuotas_total: number
          monto_cuota: number
          fecha_primera_cuota: string
          moneda: 'ARS' | 'USD'
          categoria_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          descripcion: string
          monto_total: number
          cuotas_total: number
          monto_cuota: number
          fecha_primera_cuota: string
          moneda: 'ARS' | 'USD'
          categoria_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          descripcion?: string
          monto_total?: number
          cuotas_total?: number
          monto_cuota?: number
          fecha_primera_cuota?: string
          moneda?: 'ARS' | 'USD'
          categoria_id?: string | null
          created_at?: string
        }
      }
      deudas: {
        Row: {
          id: string
          user_id: string
          descripcion: string
          tipo_deuda: 'prestamo_personal' | 'prestamo_prendario' | 'refinanciacion_bancaria' | 'arreglo_estudio' | 'otro'
          monto_total: number
          cuotas_total: number
          monto_cuota: number
          fecha_primera_cuota: string
          moneda: 'ARS' | 'USD'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          descripcion: string
          tipo_deuda: 'prestamo_personal' | 'prestamo_prendario' | 'refinanciacion_bancaria' | 'arreglo_estudio' | 'otro'
          monto_total: number
          cuotas_total: number
          monto_cuota: number
          fecha_primera_cuota: string
          moneda: 'ARS' | 'USD'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          descripcion?: string
          tipo_deuda?: 'prestamo_personal' | 'prestamo_prendario' | 'refinanciacion_bancaria' | 'arreglo_estudio' | 'otro'
          monto_total?: number
          cuotas_total?: number
          monto_cuota?: number
          fecha_primera_cuota?: string
          moneda?: 'ARS' | 'USD'
          created_at?: string
          updated_at?: string
        }
      }
      tarjeta_config: {
        Row: {
          id: string
          user_id: string
          fecha_cierre: string
          fecha_vencimiento: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fecha_cierre: string
          fecha_vencimiento: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fecha_cierre?: string
          fecha_vencimiento?: string
          created_at?: string
        }
      }
      tipo_cambio: {
        Row: {
          id: string
          fecha: string
          usd_ars: number
          created_at: string
        }
        Insert: {
          id?: string
          fecha: string
          usd_ars: number
          created_at?: string
        }
        Update: {
          id?: string
          fecha?: string
          usd_ars?: number
          created_at?: string
        }
      }
      bolsillo_config: {
        Row: {
          user_id: string
          tipo: 'ahorro' | 'emergencia'
          objetivo_monto: number | null
          meses_sugerencia: number
          updated_at: string
        }
        Insert: {
          user_id: string
          tipo: 'ahorro' | 'emergencia'
          objetivo_monto?: number | null
          meses_sugerencia?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          tipo?: 'ahorro' | 'emergencia'
          objetivo_monto?: number | null
          meses_sugerencia?: number
          updated_at?: string
        }
      }
      bolsillo_movimientos: {
        Row: {
          id: string
          user_id: string
          tipo: 'ahorro' | 'emergencia'
          monto: number
          moneda: 'ARS' | 'USD'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tipo: 'ahorro' | 'emergencia'
          monto: number
          moneda: 'ARS' | 'USD'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tipo?: 'ahorro' | 'emergencia'
          monto?: number
          moneda?: 'ARS' | 'USD'
          created_at?: string
        }
      }
      feedback: {
        Row: {
          id: string
          user_id: string
          tipo: 'bug' | 'feature' | 'mejora' | 'otro'
          mensaje: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tipo: 'bug' | 'feature' | 'mejora' | 'otro'
          mensaje: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tipo?: 'bug' | 'feature' | 'mejora' | 'otro'
          mensaje?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types para uso en hooks
type Tables = Database['public']['Tables']

export type TablesRow<T extends keyof Tables> = Tables[T]['Row']
export type TablesInsert<T extends keyof Tables> = Tables[T]['Insert']
export type TablesUpdate<T extends keyof Tables> = Tables[T]['Update']
