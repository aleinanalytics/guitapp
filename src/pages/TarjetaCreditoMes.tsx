import { useEffect, useMemo, useState } from 'react'
import { format, startOfDay } from 'date-fns'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CreditCard, Calendar, Pencil, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import EditableTransaccionListRow from '../components/EditableTransaccionListRow'
import EditableCuotaCompraRow from '../components/EditableCuotaCompraRow'
import MobileUserMenu from '../components/MobileUserMenu'
import { useTransacciones } from '../hooks/useTransacciones'
import { useCuotas, getCuotaForMonth } from '../hooks/useCuotas'
import { useTarjetaConfig, diasHastaFecha, formatFechaTarjeta, rangoPickerTarjeta } from '../hooks/useTarjetaConfig'
import { formatARS, formatUSD, montoDisplayClass, sumarPorMoneda } from '../lib/utils'
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

  const refreshAll = () => {
    void refetchTx()
    void refetchCuotas()
  }
  const { config: tcConfig, upsert: upsertConfig } = useTarjetaConfig()

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
      transacciones.filter(
        (t) => (t.tipo === 'gasto' || t.tipo === 'suscripcion') && t.medio_pago === 'tarjeta',
      ),
    [transacciones],
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

  const singlesPorMoneda = useMemo(
    () => sumarPorMoneda(tarjetaPagosUnicos.map((t) => ({ monto: t.monto, moneda: t.moneda }))),
    [tarjetaPagosUnicos],
  )
  const cuotasPorMoneda = useMemo(
    () => sumarPorMoneda(cuotaLines.map((l) => ({ monto: l.monto, moneda: l.moneda }))),
    [cuotaLines],
  )
  const totalArs = singlesPorMoneda.ars + cuotasPorMoneda.ars
  const totalUsd = singlesPorMoneda.usd + cuotasPorMoneda.usd

  const nextPorMoneda = useMemo(
    () => sumarPorMoneda(nextCuotaLines.map((l) => ({ monto: l.monto, moneda: l.moneda }))),
    [nextCuotaLines],
  )

  const fmtCuotaMonto = (monto: number, moneda: Moneda) =>
    moneda === 'USD' ? formatUSD(monto) : formatARS(monto)

  const dashLink = `/?mes=${mes}&anio=${anio}`
  const loadingAny = loading || loadingCuotas

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <Link
        to={dashLink}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Volver al dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CreditCard size={28} className="shrink-0 text-rose-400/90" />
            <h1 className="text-2xl font-bold text-gray-50 lg:text-3xl">Tarjeta de crédito</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">{MESES[mes - 1]} {anio}</p>
        </div>
        <div className="shrink-0 lg:hidden">
          <MobileUserMenu />
        </div>
      </motion.div>

      {/* Fechas de cierre y vencimiento */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass p-4 mb-6"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} /> Fechas de la tarjeta
          </h2>
          {!editingConfig && (
            <button onClick={startEditConfig} className="text-gray-600 hover:text-gray-400 transition-colors">
              <Pencil size={14} />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {editingConfig ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="text-xs text-gray-500 leading-relaxed">
                Podés usar <strong className="text-gray-400">fechas pasadas</strong> si arrancás la app tarde, y un vencimiento
                <strong className="text-gray-400"> varios meses después del cierre</strong>. Rango aproximado: 15 años atrás — 5 años adelante.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] text-gray-500 mb-1">Fecha de cierre</label>
                  <input
                    type="date"
                    min={pickerBounds.min}
                    max={pickerBounds.max}
                    value={inputCierre}
                    onChange={(e) => setInputCierre(e.target.value)}
                    className="input-dark !py-1.5 !text-sm w-full min-w-0"
                    autoFocus
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] text-gray-500 mb-1">Fecha de vencimiento</label>
                  <input
                    type="date"
                    min={pickerBounds.min}
                    max={pickerBounds.max}
                    value={inputVto}
                    onChange={(e) => setInputVto(e.target.value)}
                    className="input-dark !py-1.5 !text-sm w-full min-w-0"
                  />
                </div>
                <div className="flex gap-1.5 pb-0.5 shrink-0">
                  <button type="button" onClick={saveConfig} className="text-emerald-400 hover:text-emerald-300 transition-colors"><Check size={18} /></button>
                  <button type="button" onClick={() => setEditingConfig(false)} className="text-red-400 hover:text-red-300 transition-colors"><X size={18} /></button>
                </div>
              </div>
            </motion.div>
          ) : tcConfig ? (
            <motion.div key="display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-4">
              <div className="flex-1 bg-rose-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-rose-400/70 uppercase tracking-wider font-medium">Cierre</p>
                <p className="text-lg font-bold text-rose-400 mt-0.5">{formatFechaTarjeta(tcConfig.fecha_cierre)}</p>
                <p className="text-xs text-rose-300/60 mt-0.5">
                  {diasHastaFecha(tcConfig.fecha_cierre) === 1 ? 'Mañana' : `Faltan ${diasHastaFecha(tcConfig.fecha_cierre)} días`}
                </p>
              </div>
              <div className="flex-1 bg-amber-500/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-amber-400/70 uppercase tracking-wider font-medium">Vencimiento</p>
                <p className="text-lg font-bold text-amber-400 mt-0.5">{formatFechaTarjeta(tcConfig.fecha_vencimiento)}</p>
                <p className="text-xs text-amber-300/60 mt-0.5">
                  {diasHastaFecha(tcConfig.fecha_vencimiento) === 1 ? 'Mañana' : `Faltan ${diasHastaFecha(tcConfig.fecha_vencimiento)} días`}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-sm text-gray-500">
              No configuraste las fechas de tu tarjeta.{' '}
              <button onClick={startEditConfig} className="text-accent-blue hover:underline">Configurar</button>
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {loadingAny ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-4 mb-6 relative overflow-hidden"
            style={{ boxShadow: '0 0 20px rgba(244, 63, 94, 0.1)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Total del mes (por moneda)</p>
            <p className="text-[11px] text-gray-600 mt-1 mb-3">Sin convertir: lo cargado en pesos y lo cargado en dólares por separado.</p>
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total ARS</p>
                <p
                  className={`font-bold text-gray-50 tabular-nums mt-0.5 leading-tight break-words ${montoDisplayClass(totalArs, 'pairArs')}`}
                >
                  {formatARS(totalArs)}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total USD</p>
                <p
                  className={`font-bold text-gray-50 tabular-nums mt-0.5 leading-tight break-words ${montoDisplayClass(totalUsd, 'pairUsd')}`}
                >
                  {formatUSD(totalUsd)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block mb-1">Pagos únicos</span>
                <p className="text-gray-200 font-medium">{formatARS(singlesPorMoneda.ars)}</p>
                <p className="text-gray-200 font-medium">{formatUSD(singlesPorMoneda.usd)}</p>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Cuotas del mes</span>
                <p className="text-gray-200 font-medium">{formatARS(cuotasPorMoneda.ars)}</p>
                <p className="text-gray-200 font-medium">{formatUSD(cuotasPorMoneda.usd)}</p>
              </div>
            </div>
          </motion.div>

          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              Pagos únicos con tarjeta
            </h2>
            <p className="text-[11px] text-gray-500 mb-3">Incluye gastos y suscripciones cargadas con crédito.</p>
            {tarjetaPagosUnicos.length === 0 ? (
              <p className="text-gray-500 text-sm glass-light p-4 rounded-xl">
                No registraste movimientos con tarjeta de crédito este mes.
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

          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">Cuotas que vencen este mes</h2>
            <p className="text-[11px] text-gray-500 mb-3">
              Para corregir el mes de inicio de un plan viejo, editá la compra y cambiá &quot;Primera cuota&quot;.
            </p>
            {cuotaLines.length === 0 ? (
              <p className="text-gray-500 text-sm glass-light p-4 rounded-xl">Sin cuotas activas en este mes.</p>
            ) : (
              <ul className="space-y-2">
                {cuotaLines.map((l, i) => {
                  const compra = cuotas.find((c) => c.id === l.compraId)
                  if (!compra) return null
                  return (
                    <EditableCuotaCompraRow
                      key={`${l.compraId}-${l.numero}`}
                      compra={compra}
                      cuotaNumero={l.numero}
                      delay={i * 0.02}
                      gastoCategorias={gastoCategorias}
                      onMutated={refreshAll}
                    />
                  )
                })}
              </ul>
            )}
          </section>

          {(nextPorMoneda.ars > 0 || nextPorMoneda.usd > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass border-amber-500/15 bg-amber-500/[0.04] p-4 rounded-xl"
            >
              <p className="text-xs text-amber-400/90 font-medium mb-2">
                Próximo mes ({MESES[nextMes - 1]} {nextAnio}): cuotas estimadas{' '}
                {nextPorMoneda.ars > 0 && <span>{formatARS(nextPorMoneda.ars)}</span>}
                {nextPorMoneda.ars > 0 && nextPorMoneda.usd > 0 && <span className="text-gray-500"> · </span>}
                {nextPorMoneda.usd > 0 && <span>{formatUSD(nextPorMoneda.usd)}</span>}
              </p>
              <ul className="space-y-1">
                {nextCuotaLines.map((d, i) => (
                  <li key={i} className="text-[11px] text-gray-500">
                    {d.desc} — cuota {d.numero}/{d.total} · {fmtCuotaMonto(d.monto, d.moneda)}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
