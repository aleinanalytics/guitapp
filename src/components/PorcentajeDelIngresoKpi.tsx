import { AlertTriangle, OctagonAlert } from 'lucide-react'

/** % del ingreso desde el cual se muestra advertencia (amarillo). */
export const UMBRAL_PCT_CONSUMO_ALERTA = 35
/** % del ingreso desde el cual se muestra alerta grave (rojo). */
export const UMBRAL_PCT_CONSUMO_CRITICO = 50

type Props = {
  pct: number | null
  /** Si no hay % (sin ingresos) pero hubo gasto/suscripción en el mes */
  hayMontoSinIngreso: boolean
  /** Si viene definido, las leyendas usan “en [categoría]”. */
  nombreCategoria?: string
}

/**
 * Bloque “X% del ingreso” para KPIs (Gastos, Suscripciones, categoría, etc.):
 * verde por defecto; ≥35% amarillo + aviso; ≥50% rojo + alerta fuerte.
 */
export default function PorcentajeDelIngresoKpi({ pct, hayMontoSinIngreso, nombreCategoria }: Props) {
  if (pct === null) {
    if (hayMontoSinIngreso) {
      return (
        <p className="text-center text-xs text-gray-500 lg:text-left lg:text-[11px]">Sin ingresos en el mes</p>
      )
    }
    return null
  }

  const critico = pct >= UMBRAL_PCT_CONSUMO_CRITICO
  const alerta = !critico && pct >= UMBRAL_PCT_CONSUMO_ALERTA

  const colorLinea = critico
    ? 'text-rose-400'
    : alerta
      ? 'text-amber-300'
      : 'text-emerald-400'

  const leyendaAlerta = nombreCategoria
    ? `Consumo elevado en ${nombreCategoria}`
    : 'Consumo elevado'

  const leyendaCritico = nombreCategoria
    ? `Consumo muy elevado en ${nombreCategoria}, precaución.`
    : 'Consumo muy elevado, precaución.'

  return (
    <div className="mt-0.5 flex w-full flex-col gap-1.5 items-center lg:items-stretch">
      <div
        className={`flex items-center justify-center gap-1.5 lg:justify-start ${colorLinea}`}
      >
        {alerta && <AlertTriangle className="shrink-0 text-amber-400" size={14} strokeWidth={2.25} aria-hidden />}
        {critico && (
          <OctagonAlert className="shrink-0 text-rose-400" size={14} strokeWidth={2.25} aria-hidden />
        )}
        <p className="text-center text-xs font-medium leading-snug lg:text-left lg:text-[11px]">
          {pct.toFixed(1)}% del ingreso
        </p>
      </div>
      {alerta && (
        <p
          role="status"
          className="text-center text-[10px] font-medium leading-snug text-amber-200/85 lg:text-left"
        >
          {leyendaAlerta}
        </p>
      )}
      {critico && (
        <p
          role="alert"
          className="text-center text-[10px] font-semibold leading-snug text-rose-200/90 lg:text-left"
        >
          {leyendaCritico}
        </p>
      )}
    </div>
  )
}
