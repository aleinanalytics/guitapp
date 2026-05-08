import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { formatARS, montoDisplayClass } from '../lib/utils'

type KpiReserva = {
  tieneMeta: boolean
  actual: number
  falta: number | null
  meta: number | null
  pct: number | null
  metaAlcanzada: boolean
}

export default function DashboardFondoSection({
  saldoFondoEmergencia,
  kpiReserva,
}: {
  saldoFondoEmergencia: number
  kpiReserva: KpiReserva
}) {
  if (saldoFondoEmergencia <= 0) return null
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.22 }}>
      <Link
        to="/fondo-emergencia"
        className="block glass relative overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.07] to-transparent p-5 sm:p-6 lg:p-7 transition-all duration-300 hover:border-sky-400/35 hover:from-sky-500/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
      >
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] opacity-70"
          style={{ background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)' }}
        />
        <div className="relative flex flex-col items-center text-center gap-6">
          <div className="w-full max-w-xl mx-auto px-1">
            <div className="flex items-center justify-center gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                <Shield size={22} strokeWidth={2} />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">Fondo de reserva</p>
            </div>
            {kpiReserva.tieneMeta ? (
              kpiReserva.metaAlcanzada ? (
                <>
                  <p className={`mt-4 font-black tabular-nums tracking-tighter leading-[1.08] break-words ${montoDisplayClass(kpiReserva.actual, 'kpiStatProminent')} text-emerald-400`}>
                    {formatARS(kpiReserva.actual)}
                  </p>
                  <p className="mt-2 text-sm text-gray-400">Meta alcanzada · en tu fondo</p>
                  {kpiReserva.meta != null && kpiReserva.actual > kpiReserva.meta && (
                    <p className="mt-1 text-xs text-emerald-400/85">{formatARS(kpiReserva.actual - kpiReserva.meta)} por encima de la meta</p>
                  )}
                </>
              ) : (
                <>
                  <p className={`mt-4 font-black tabular-nums tracking-tighter leading-[1.08] break-words ${montoDisplayClass(kpiReserva.actual, 'kpiStatProminent')} text-sky-100`}>
                    {formatARS(kpiReserva.actual)}
                  </p>
                  <p className="mt-2 text-sm text-gray-400">En tu fondo ahora</p>
                  <p className="mt-3 text-sm text-sky-200/85 tabular-nums leading-snug">
                    Te falta <span className="font-semibold text-sky-100">{formatARS(kpiReserva.falta ?? 0)}</span> para la meta de <span className="font-semibold text-sky-100">{formatARS(kpiReserva.meta ?? 0)}</span>
                  </p>
                </>
              )
            ) : (
              <>
                <p className={`mt-4 font-black tabular-nums tracking-tighter leading-[1.08] break-words ${montoDisplayClass(kpiReserva.actual, 'kpiStatProminent')} text-gray-50`}>
                  {formatARS(kpiReserva.actual)}
                </p>
                <p className="mt-2 text-sm text-gray-400">Definí una meta en pesos en el detalle para ver cuánto te falta.</p>
              </>
            )}
          </div>
          {kpiReserva.tieneMeta && kpiReserva.pct != null && (
            <div className="w-full max-w-md mx-auto px-1">
              <div className="mb-1.5 flex items-center justify-center gap-3 text-[10px] uppercase tracking-wide text-gray-500">
                <span>Progreso</span>
                <span className="tabular-nums text-sky-300/90">
                  {kpiReserva.metaAlcanzada && kpiReserva.pct > 100 ? '100%+' : `${Math.round(kpiReserva.pct)}%`}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    kpiReserva.metaAlcanzada
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      : 'bg-gradient-to-r from-sky-600 to-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, kpiReserva.pct)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
