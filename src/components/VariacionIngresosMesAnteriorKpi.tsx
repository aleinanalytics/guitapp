import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

type Props = {
  ingresosActual: number
  ingresosAnterior: number
  /** Nombre del mes calendario anterior (p. ej. "Marzo"). */
  nombreMesAnterior: string
}

/**
 * Variación % de ingresos del mes seleccionado respecto al mes calendario anterior completo.
 */
export default function VariacionIngresosMesAnteriorKpi({
  ingresosActual,
  ingresosAnterior,
  nombreMesAnterior,
}: Props) {
  if (ingresosActual === 0 && ingresosAnterior === 0) return null

  if (ingresosAnterior === 0 && ingresosActual > 0) {
    return (
      <p className="mt-0.5 text-center text-[11px] leading-snug text-gray-500 lg:text-left">
        Sin ingresos en {nombreMesAnterior} para comparar
      </p>
    )
  }

  if (ingresosAnterior > 0) {
    const pct = ((ingresosActual - ingresosAnterior) / ingresosAnterior) * 100
    const sube = pct > 0.05
    const baja = pct < -0.05
    const color = sube ? 'text-emerald-400' : baja ? 'text-rose-400' : 'text-gray-400'
    const Icon = sube ? TrendingUp : baja ? TrendingDown : Minus
    return (
      <div className="mt-0.5 flex flex-col items-center gap-0.5 lg:items-stretch">
        <div className={`flex items-center justify-center gap-1 lg:justify-start ${color}`}>
          <Icon size={12} className="shrink-0 opacity-90" aria-hidden />
          <p className="text-center text-xs font-medium leading-snug lg:text-left">
            {pct >= 0 ? '+' : ''}
            {pct.toFixed(1)}% vs {nombreMesAnterior}
          </p>
        </div>
      </div>
    )
  }

  return null
}
