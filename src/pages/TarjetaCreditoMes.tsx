import { useEffect, useMemo, useState } from 'react'
import { format, startOfDay } from 'date-fns'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CreditCard, Pencil, Check, X, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import EditableTransaccionListRow from '../components/EditableTransaccionListRow'
import EditableCuotaCompraRow from '../components/EditableCuotaCompraRow'
import MobileUserMenu from '../components/MobileUserMenu'
import { useTransacciones } from '../hooks/useTransacciones'
import { useCuotas, getCuotaForMonth } from '../hooks/useCuotas'
import {
  useTarjetaConfig,
  rangoPickerTarjeta,
  formatFechaTarjeta,
  countdownTarjeta,
} from '../hooks/useTarjetaConfig'
import {
  esIngresoReintegroTarjetaCredito,
  formatARS,
  formatUSD,
  montoDisplayClass,
  sumarPorMoneda,
  transaccionEnMesVista,
} from '../lib/utils'
import type { Categoria, Moneda } from '../lib/types'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function TarjetaCreditoMes() {
  const [searchParams] = useSearchParams()
  const now = new Date()
  const mesRaw = Number(searchParams.get('mes'))
  const anioRaw = Number(searchParams.get('anio'))
  const mes = mesRaw >= 1 && mesRaw <= 12 ? mesRaw : now.getMonth() + 1
  const anio = Number.isFinite(anioRaw) && anioRaw >= 2000 && anioRaw <= 2100 ? anioRaw : now.getFullYear()

  const { transacciones, loading, error, refetch: refetchTx } = useTransacciones({ mes, anio })
  const { cuotas, loading: loadingCuotas, refetch: refetchCuotas } = useCuotas()
  const [categorias, setCategorias] = useState<Categoria[]>([])

  useEffect(() => {
    supabase.from('categorias').select('*').then(({ data }) => {
      if (data) setCategorias(data as Categoria[])
    })
  }, [])

  const gastoCategorias = useMemo(() => categorias.filter((c) => c.tipo === 'gasto'), [categorias])
  const suscripcionCategorias = useMemo(() => categorias.filter((c) => c.tipo === 'suscripcion'), [categorias])
  const ingresoCategorias = useMemo(() => categorias.filter((c) => c.tipo === 'ingreso'), [categorias])

  const refreshAll = () => {
    void refetchTx()
    void refetchCuotas()
  }
  const { config: tcConfig, upsert: upsertConfig } = useTarjetaConfig()

  const diaCierreTc =
    tcConfig?.fecha_cierre != null
      ? new Date(tcConfig.fecha_cierre + 'T12:00:00').getDate()
      : null
  const transaccionesDelMes = useMemo(
    () => transacciones.filter((t) => transaccionEnMesVista(t, mes, anio, diaCierreTc)),
    [transacciones, mes, anio, diaCierreTc],
  )

  // Config editor state
  const [editingConfig, setEditingConfig] = useState(false)
  const [inputCierre, setInputCierre] = useState('')
  const [inputVto, setInputVto] = useState('')

  const pickerBounds = rangoPickerTarjeta()

  const startEditConfig = () => {
    if (tcConfig) {
      setInputCierre(tcConfig.fecha_cierre)
      setInputVto(tcConfig.fecha_vencimiento)
    } else {
      const hoy = format(startOfDay(new Date()), 'yyyy-MM-dd')
      setInputCierre(hoy)
      setInputVto(hoy)
    }
    setEditingConfig(true)
  }
  const saveConfig = async () => {
    if (!inputCierre || !inputVto) return
    const ok = await upsertConfig(inputCierre, inputVto)
    if (ok) setEditingConfig(false)
  }

  /** Pagos únicos al cierre: gastos y suscripciones con tarjeta de crédito. */
  const tarjetaPagosUnicos = useMemo(
    () =>
      transaccionesDelMes.filter(
        (t) => (t.tipo === 'gasto' || t.tipo === 'suscripcion') && t.medio_pago === 'tarjeta',
      ),
    [transaccionesDelMes],
  )

  const cuotaLines = useMemo(() => {
    const out: { compraId: string; desc: string; numero: number; total: number; monto: number; moneda: Moneda }[] = []
    for (const c of cuotas) {
      const info = getCuotaForMonth(c, mes, anio)
      if (info) {
        out.push({
          compraId: c.id,
          desc: c.descripcion,
          numero: info.numero,
          total: info.total,
          monto: info.monto,
          moneda: c.moneda,
        })
      }
    }
    return out
  }, [cuotas, mes, anio])

  const nextMes = mes === 12 ? 1 : mes + 1
  const nextAnio = mes === 12 ? anio + 1 : anio
  const nextCuotaLines = useMemo(() => {
    const out: { desc: string; numero: number; total: number; monto: number; moneda: Moneda }[] = []
    for (const c of cuotas) {
      const info = getCuotaForMonth(c, nextMes, nextAnio)
      if (info) {
        out.push({ desc: c.descripcion, numero: info.numero, total: info.total, monto: info.monto, moneda: c.moneda })
      }
    }
    return out
  }, [cuotas, nextMes, nextAnio])

  const reintegrosMes = useMemo(
    () => transaccionesDelMes.filter(esIngresoReintegroTarjetaCredito),
    [transaccionesDelMes],
  )
  const reintegrosPorMoneda = useMemo(
    () => sumarPorMoneda(reintegrosMes.map((t) => ({ monto: t.monto, moneda: t.moneda }))),
    [reintegrosMes],
  )
  const singlesPorMoneda = useMemo(
    () => sumarPorMoneda(tarjetaPagosUnicos.map((t) => ({ monto: t.monto, moneda: t.moneda }))),
    [tarjetaPagosUnicos],
  )
  const cuotasPorMoneda = useMemo(
    () => sumarPorMoneda(cuotaLines.map((l) => ({ monto: l.monto, moneda: l.moneda }))),
    [cuotaLines],
  )
  const totalArs = singlesPorMoneda.ars + cuotasPorMoneda.ars - reintegrosPorMoneda.ars
  const totalUsd = singlesPorMoneda.usd + cuotasPorMoneda.usd - reintegrosPorMoneda.usd

  const nextPorMoneda = useMemo(
    () => sumarPorMoneda(nextCuotaLines.map((l) => ({ monto: l.monto, moneda: l.moneda }))),
    [nextCuotaLines],
  )

  const fmtCuotaMonto = (monto: number, moneda: Moneda) =>
    moneda === 'USD' ? formatUSD(monto) : formatARS(monto)

  const dashLink = `/?mes=${mes}&anio=${anio}`
  const loadingAny = loading || loadingCuotas

  const cashbackPrincipal =
    reintegrosPorMoneda.ars > 0
      ? formatARS(reintegrosPorMoneda.ars)
      : reintegrosPorMoneda.usd > 0
        ? formatUSD(reintegrosPorMoneda.usd)
        : formatARS(0)

  const cashbackSecundario =
    reintegrosPorMoneda.ars > 0 && reintegrosPorMoneda.usd > 0 ? formatUSD(reintegrosPorMoneda.usd) : null

  const nextPreviewMonto = [
    nextPorMoneda.ars > 0 ? formatARS(nextPorMoneda.ars) : null,
    nextPorMoneda.usd > 0 ? formatUSD(nextPorMoneda.usd) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4 lg:px-8 lg:pb-12 lg:pt-8">
      <div className="mb-5 flex items-start justify-between gap-3">
        <Link
          to={dashLink}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al dashboard
        </Link>
        <div className="shrink-0 lg:hidden">
          <MobileUserMenu />
        </div>
      </div>

      {loadingAny ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <>
          <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-[#16121c] to-[#0c0a0f] px-5 pb-7 pt-6 sm:px-6"
          >
            {!editingConfig && (
              <button
                type="button"
                onClick={startEditConfig}
                className="absolute right-3 top-3 rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-rose-300"
                aria-label="Editar fechas de cierre y vencimiento"
              >
                <Pencil size={16} />
              </button>
            )}

            <div className="flex items-center justify-center gap-2 pr-8">
              <CreditCard size={22} className="shrink-0 text-rose-400" strokeWidth={2} />
              <h1 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                Tarjeta de Crédito
              </h1>
            </div>
            <p className="mt-2 text-center text-[11px] font-medium text-gray-600">
              {MESES[mes - 1]} {anio}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="min-w-0 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">ARS</p>
                <p
                  className={`mt-1 break-words font-black tabular-nums tracking-tighter text-white ${montoDisplayClass(totalArs, 'pairArsTarjeta')}`}
                >
                  {formatARS(totalArs)}
                </p>
              </div>
              <div className="min-w-0 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">USD</p>
                <p
                  className={`mt-1 break-words font-black tabular-nums tracking-tighter text-white ${montoDisplayClass(totalUsd, 'pairUsdTarjeta')}`}
                >
                  {formatUSD(totalUsd)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-[10px] leading-relaxed text-gray-600">
              Neto del mes por moneda (consumo − reintegros/promos TC), sin convertir.
            </p>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                {editingConfig ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3 rounded-2xl border border-white/[0.08] bg-black/30 p-4"
                  >
                    <p className="text-[11px] leading-relaxed text-gray-500">
                      Próximas fechas de facturación. Rango: 15 años atrás — 5 adelante.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          Fecha de cierre
                        </label>
                        <input
                          type="date"
                          min={pickerBounds.min}
                          max={pickerBounds.max}
                          value={inputCierre}
                          onChange={(e) => setInputCierre(e.target.value)}
                          className="input-dark min-w-0 w-full !py-2 !text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          Vencimiento
                        </label>
                        <input
                          type="date"
                          min={pickerBounds.min}
                          max={pickerBounds.max}
                          value={inputVto}
                          onChange={(e) => setInputVto(e.target.value)}
                          className="input-dark min-w-0 w-full !py-2 !text-sm"
                        />
                      </div>
                      <div className="flex gap-1.5 sm:pb-1">
                        <button
                          type="button"
                          onClick={saveConfig}
                          className="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-white/[0.06]"
                          aria-label="Guardar fechas"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingConfig(false)}
                          className="rounded-lg p-2 text-red-400 transition-colors hover:bg-white/[0.06]"
                          aria-label="Cancelar"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : tcConfig ? (
                  <motion.div
                    key="fechas"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 gap-5 border-b border-white/[0.07] pb-5 sm:grid-cols-2 sm:gap-6"
                  >
                    <div className="min-w-0 text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Fecha de cierre</p>
                      <p className="mt-1.5 text-sm font-medium leading-snug text-white">
                        {formatFechaTarjeta(tcConfig.fecha_cierre)}
                        <span className="text-rose-400/90"> · {countdownTarjeta(tcConfig.fecha_cierre)}</span>
                      </p>
                    </div>
                    <div className="min-w-0 text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Vencimiento</p>
                      <p className="mt-1.5 text-sm font-medium leading-snug text-white">
                        {formatFechaTarjeta(tcConfig.fecha_vencimiento)}
                        <span className="text-amber-400/90"> · {countdownTarjeta(tcConfig.fecha_vencimiento)}</span>
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.p
                    key="sin-config"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/[0.07] pb-5 text-center text-sm text-gray-500"
                  >
                    No configuraste cierre ni vencimiento.{' '}
                    <button type="button" onClick={startEditConfig} className="font-semibold text-rose-400 hover:underline">
                      Configurar
                    </button>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-6 rounded-2xl border border-rose-500/35 bg-black/25 px-4 py-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-rose-400">Cashback acumulado</p>
              <p className="mt-1 text-[10px] text-gray-600">Reintegros y promos del mes</p>
              <p className="mt-4 font-black tabular-nums tracking-tighter text-white text-[clamp(1.4rem,5.5vw,1.9rem)] leading-none">
                {cashbackPrincipal}
              </p>
              {cashbackSecundario && (
                <p className="mt-2 text-sm font-semibold tabular-nums tracking-tight text-gray-400">{cashbackSecundario}</p>
              )}
            </div>

            <div className="mt-8 border-t border-white/[0.07] pt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Cuotas del mes</p>
              {cuotaLines.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-white/[0.08] bg-[#14121a] px-4 py-6 text-center text-sm text-gray-500">
                  Sin cuotas en este mes.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {cuotaLines.map((l, i) => {
                    const compra = cuotas.find((c) => c.id === l.compraId)
                    if (!compra) return null
                    return (
                      <EditableCuotaCompraRow
                        key={`${l.compraId}-${l.numero}`}
                        compra={compra}
                        cuotaNumero={l.numero}
                        delay={i * 0.03}
                        gastoCategorias={gastoCategorias}
                        onMutated={refreshAll}
                        listVariant="tcPremium"
                      />
                    )
                  })}
                </ul>
              )}
            </div>

            {(nextPorMoneda.ars > 0 || nextPorMoneda.usd > 0) && (
              <div className="mt-6 border-t border-white/[0.07] pt-5">
                <div className="flex items-start gap-2.5">
                  <Eye size={17} className="mt-0.5 shrink-0 text-gray-500" strokeWidth={2} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-500">Previsualización próximo mes:</p>
                    <p className="mt-2 text-xs font-medium leading-snug text-amber-400/90">
                      El próximo resumen ({MESES[nextMes - 1]} {nextAnio}): cuotas {nextPreviewMonto}
                    </p>
                    {nextCuotaLines.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {nextCuotaLines.map((d, i) => (
                          <li key={i} className="text-[11px] text-gray-500">
                            {d.desc} — cuota {d.numero}/{d.total} · {fmtCuotaMonto(d.monto, d.moneda)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {diaCierreTc != null && (
              <p className="mt-6 text-center text-[10px] leading-relaxed text-gray-600">
                Consumos con tarjeta agrupados por cierre: día {diaCierreTc} (lo posterior va al mes siguiente).
              </p>
            )}
          </motion.article>

          <section className="mt-10 mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Desglose del mes</h2>
            <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Pagos únicos</span>
                  <p className="mt-1 font-semibold tabular-nums text-gray-200">{formatARS(singlesPorMoneda.ars)}</p>
                  <p className="font-semibold tabular-nums text-gray-200">{formatUSD(singlesPorMoneda.usd)}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Cuotas</span>
                  <p className="mt-1 font-semibold tabular-nums text-gray-200">{formatARS(cuotasPorMoneda.ars)}</p>
                  <p className="font-semibold tabular-nums text-gray-200">{formatUSD(cuotasPorMoneda.usd)}</p>
                </div>
                {(reintegrosPorMoneda.ars > 0 || reintegrosPorMoneda.usd > 0) && (
                  <div className="col-span-2 border-t border-white/[0.06] pt-3">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Reintegros / promos
                    </span>
                    <p className="mt-1 font-semibold tabular-nums text-emerald-400/90">−{formatARS(reintegrosPorMoneda.ars)}</p>
                    <p className="font-semibold tabular-nums text-emerald-400/90">−{formatUSD(reintegrosPorMoneda.usd)}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Reintegros y promos
            </h2>
            <p className="mb-3 text-[11px] text-gray-500">
              En <span className="text-gray-400">Carga</span>, ingreso con &quot;Reintegro o promo en tarjeta&quot;. Mes calendario de esta vista.
            </p>
            {reintegrosMes.length === 0 ? (
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-gray-500">
                No registraste reintegros ni promos este mes.
              </p>
            ) : (
              <ul className="space-y-2">
                {reintegrosMes.map((t, i) => (
                  <EditableTransaccionListRow
                    key={t.id}
                    t={t}
                    categorias={ingresoCategorias}
                    delay={i * 0.02}
                    onMutated={refreshAll}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Pagos únicos con tarjeta</h2>
            <p className="mb-3 text-[11px] text-gray-500">Gastos y suscripciones en un pago.</p>
            {tarjetaPagosUnicos.length === 0 ? (
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-gray-500">
                No registraste movimientos con tarjeta este mes.
              </p>
            ) : (
              <ul className="space-y-2">
                {tarjetaPagosUnicos.map((t, i) => (
                  <EditableTransaccionListRow
                    key={t.id}
                    t={t}
                    categorias={t.tipo === 'gasto' ? gastoCategorias : suscripcionCategorias}
                    delay={i * 0.02}
                    onMutated={refreshAll}
                  />
                ))}
              </ul>
            )}
          </section>

        </>
      )}
    </div>
  )
}
