import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import type { Moneda } from '../lib/types'
import { formatARS, formatUSD, montoDisplayClass } from '../lib/utils'
import { countdownTarjeta, fechaProximaCiclo } from '../hooks/useTarjetaConfig'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TarjetaConfig } from '../lib/types'

function tcFechaCortaHome(iso: string) {
  return format(fechaProximaCiclo(iso), 'd MMM', { locale: es }).replace(/\./g, '').toUpperCase()
}

type CuotaDetail = {
  desc: string
  numero: number
  total: number
  monto: number
  moneda: Moneda
}

type TarjetaData = {
  totalArs: number
  totalUsd: number
  reintegroArs: number
  reintegroUsd: number
  cuotaDetails: CuotaDetail[]
  nextMonthArs: number
  nextMonthUsd: number
  nextDetails: CuotaDetail[]
}

export default function DashboardTarjetaSection({
  tcConfig,
  toggleModoCredito,
  tarjetaData,
  toTarjetaCredito,
}: {
  tcConfig: TarjetaConfig | null
  toggleModoCredito: () => Promise<unknown>
  tarjetaData: TarjetaData
  toTarjetaCredito: string
}) {
  const kpiTarjetaCashbackPrincipal =
    tarjetaData.reintegroArs > 0
      ? formatARS(tarjetaData.reintegroArs)
      : tarjetaData.reintegroUsd > 0
        ? formatUSD(tarjetaData.reintegroUsd)
        : formatARS(0)
  const kpiTarjetaCashbackSecundario =
    tarjetaData.reintegroArs > 0 && tarjetaData.reintegroUsd > 0 ? formatUSD(tarjetaData.reintegroUsd) : null

  return (
    <Link
      to={toTarjetaCredito}
      className="block h-full w-full min-w-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
      aria-label="Ver detalle de tarjeta de crédito"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative h-full cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] p-4 text-center transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.02] sm:p-5"
        style={{
          background:
            'linear-gradient(165deg, rgba(72, 62, 95, 0.35) 0%, rgba(24, 22, 32, 0.92) 42%, rgba(10, 9, 14, 0.98) 100%)',
        }}
      >
        <div className="mb-3 flex items-center justify-center gap-2.5">
          <CreditCard size={22} className="shrink-0 text-rose-400" strokeWidth={2} />
          <span className="text-base font-bold tracking-tight text-white">Tarjeta de Crédito</span>
        </div>

        {tcConfig && (
          <div className="mb-3 flex items-center justify-center">
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                await toggleModoCredito()
              }}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                tcConfig.modo_credito
                  ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
                  : 'bg-white/[0.04] text-gray-500 hover:text-gray-300 ring-1 ring-white/[0.08]'
              }`}
            >
              <span
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  tcConfig.modo_credito ? 'bg-rose-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                    tcConfig.modo_credito ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              {tcConfig.modo_credito ? 'TC resta del disponible' : 'TC no afecta disponible'}
            </button>
          </div>
        )}

        {tcConfig ? (
          <div className="mb-4 flex flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] sm:gap-x-3">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" aria-hidden />
              <span className="font-bold uppercase tracking-[0.15em] text-gray-500">Cierre</span>
              <span className="font-semibold text-gray-100">{tcFechaCortaHome(tcConfig.fecha_cierre)}</span>
              <span className="text-sky-400/90">· {countdownTarjeta(tcConfig.fecha_cierre)}</span>
            </div>
            <span className="shrink-0 px-0.5 text-gray-600 sm:px-1" aria-hidden>·</span>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span className="h-2 w-2 shrink-0 rounded-full bg-rose-400" aria-hidden />
              <span className="font-bold uppercase tracking-[0.15em] text-gray-500">Vence</span>
              <span className="font-semibold text-gray-100">{tcFechaCortaHome(tcConfig.fecha_vencimiento)}</span>
              <span className="text-rose-400/90">· {countdownTarjeta(tcConfig.fecha_vencimiento)}</span>
            </div>
          </div>
        ) : (
          <p className="mb-4 text-[11px] text-gray-500">Configurá cierre y vencimiento en el detalle de tarjeta.</p>
        )}

        <div className="mb-4 rounded-2xl border border-rose-500/35 bg-black/25 px-3 py-3.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-400">Cashback acumulado</p>
          <p className="mt-2 font-black tabular-nums tracking-tighter text-white text-[clamp(1.1rem,4vw,1.45rem)] leading-none">
            {kpiTarjetaCashbackPrincipal}
          </p>
          {kpiTarjetaCashbackSecundario && (
            <p className="mt-1.5 text-xs font-semibold tabular-nums tracking-tight text-gray-400">
              {kpiTarjetaCashbackSecundario}
            </p>
          )}
        </div>

        <div className="space-y-4 border-t border-white/[0.06] pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Total a pagar (ARS)</p>
            <p className={`mt-1 break-words font-black tabular-nums tracking-tighter text-white leading-none ${montoDisplayClass(tarjetaData.totalArs, 'pairArsTarjeta')}`}>
              {formatARS(tarjetaData.totalArs)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Total a pagar (USD)</p>
            <p className={`mt-1 break-words font-black tabular-nums tracking-tighter text-white leading-none ${montoDisplayClass(tarjetaData.totalUsd, 'pairUsdTarjeta')}`}>
              {formatUSD(tarjetaData.totalUsd)}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Cuotas del mes</p>
          {tarjetaData.cuotaDetails.length === 0 ? (
            <p className="mt-3 text-center text-xs text-gray-500">Sin cuotas en este mes.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {tarjetaData.cuotaDetails.slice(0, 5).map((d, i) => {
                const cuotasRest = d.total - d.numero
                const montoRestante = cuotasRest > 0 ? cuotasRest * d.monto : 0
                return (
                  <li key={i} className="rounded-2xl border border-white/[0.08] bg-[#1a1822] px-4 py-3 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-white">{d.desc}</p>
                        <p className="mt-1 text-[11px] leading-snug text-gray-500">
                          <span>Cuota {d.numero}/{d.total}</span>
                          {cuotasRest > 0 && (
                            <> <span aria-hidden>-</span> <span className="font-semibold tabular-nums text-gray-400">{d.moneda === 'USD' ? formatUSD(montoRestante) : formatARS(montoRestante)}</span></>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 self-start text-right">
                        <p className="text-sm font-black tabular-nums tracking-tighter text-white">{d.moneda === 'USD' ? formatUSD(d.monto) : formatARS(d.monto)}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {tarjetaData.cuotaDetails.length > 5 && (
            <p className="mt-2 text-center text-[10px] text-gray-500">+{tarjetaData.cuotaDetails.length - 5} en detalle →</p>
          )}
        </div>

        {(tarjetaData.nextMonthArs > 0 || tarjetaData.nextMonthUsd > 0) && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <ul className="mx-auto w-full max-w-md space-y-2 text-left">
              {tarjetaData.nextDetails.slice(0, 4).map((d, i) => {
                const cuotasRest = d.total - d.numero
                const montoRestante = cuotasRest > 0 ? cuotasRest * d.monto : 0
                return (
                  <li key={i} className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-950/40 via-amber-950/15 to-transparent p-4 sm:p-[1.125rem] shadow-[inset_0_1px_0_0_rgba(251,191,36,0.06)]">
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-[9px] font-bold uppercase leading-none tracking-[0.18em] text-amber-400/85">Próximo ciclo</p>
                        <p className="text-sm font-medium leading-snug text-amber-50/95">{d.desc}</p>
                        <p className="text-[11px] leading-snug text-amber-200/50">
                          <span>Cuota {d.numero}/{d.total}</span>
                          {cuotasRest > 0 && (
                            <> <span aria-hidden>-</span> <span className="font-semibold tabular-nums text-amber-100/90">{d.moneda === 'USD' ? formatUSD(montoRestante) : formatARS(montoRestante)}</span></>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center self-stretch text-right">
                        <p className="text-sm font-black tabular-nums tracking-tighter text-amber-100">{d.moneda === 'USD' ? formatUSD(d.monto) : formatARS(d.monto)}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            {tarjetaData.nextDetails.length > 4 && (
              <p className="mx-auto mt-2 max-w-md text-center text-[10px] text-gray-600">+{tarjetaData.nextDetails.length - 4} más en detalle de tarjeta →</p>
            )}
          </div>
        )}
      </motion.div>
    </Link>
  )
}
