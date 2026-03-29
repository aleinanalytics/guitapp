import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { useTransacciones } from '../hooks/useTransacciones'
import { useCuotas, getCuotaForMonth } from '../hooks/useCuotas'
import { useTipoCambio } from '../hooks/useTipoCambio'
import { convertirARS, formatARS, formatUSD } from '../lib/utils'
import type { Moneda, Transaccion } from '../lib/types'

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

  const { transacciones, loading, error } = useTransacciones({ mes, anio })
  const { cuotas, loading: loadingCuotas } = useCuotas()
  const { tipoCambio } = useTipoCambio()
  const tc = tipoCambio?.usd_ars ?? 1000

  const tarjetaGastos = useMemo(
    () => transacciones.filter((t) => t.tipo === 'gasto' && t.medio_pago === 'tarjeta'),
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

  const totalSingles = useMemo(
    () => tarjetaGastos.reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0),
    [tarjetaGastos, tc],
  )
  const totalCuotasMes = useMemo(
    () => cuotaLines.reduce((s, l) => s + convertirARS(l.monto, l.moneda, tc), 0),
    [cuotaLines, tc],
  )
  const totalMes = totalSingles + totalCuotasMes
  const nextMonthTotal = useMemo(
    () => nextCuotaLines.reduce((s, l) => s + convertirARS(l.monto, l.moneda, tc), 0),
    [nextCuotaLines, tc],
  )

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

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-2">
          <CreditCard size={28} className="text-rose-400/90" />
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-50">Tarjeta de crédito</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1">{MESES[mes - 1]} {anio}</p>
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
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Total del mes</p>
            <p className="text-2xl font-bold text-gray-50 mt-1">{formatARS(totalMes)}</p>
            <p className="text-sm text-gray-500">{formatUSD(totalMes / tc)}</p>
            <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Pagos únicos</span>
                <p className="text-gray-200 font-medium">{formatARS(totalSingles)}</p>
              </div>
              <div>
                <span className="text-gray-500">Cuotas del mes</span>
                <p className="text-gray-200 font-medium">{formatARS(totalCuotasMes)}</p>
              </div>
            </div>
          </motion.div>

          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Pagos únicos con tarjeta</h2>
            {tarjetaGastos.length === 0 ? (
              <p className="text-gray-500 text-sm glass-light p-4 rounded-xl">No registraste gastos con tarjeta de crédito este mes.</p>
            ) : (
              <ul className="space-y-2">
                {tarjetaGastos.map((t, i) => (
                  <TarjetaTxRow key={t.id} t={t} delay={i * 0.02} />
                ))}
              </ul>
            )}
          </section>

          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Cuotas que vencen este mes</h2>
            {cuotaLines.length === 0 ? (
              <p className="text-gray-500 text-sm glass-light p-4 rounded-xl">Sin cuotas activas en este mes.</p>
            ) : (
              <ul className="space-y-2">
                {cuotaLines.map((l, i) => (
                  <motion.li
                    key={`${l.compraId}-${l.numero}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="glass-light p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{l.desc}</p>
                      <p className="text-xs text-gray-500">Cuota {l.numero} de {l.total}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-100">
                        {l.moneda === 'ARS' ? '$' : 'USD'} {l.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-gray-500">{l.moneda}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </section>

          {nextMonthTotal > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass border-amber-500/15 bg-amber-500/[0.04] p-4 rounded-xl"
            >
              <p className="text-xs text-amber-400/90 font-medium mb-2">
                Próximo mes ({MESES[nextMes - 1]} {nextAnio}): estimado en cuotas {formatARS(nextMonthTotal)}
              </p>
              <ul className="space-y-1">
                {nextCuotaLines.map((d, i) => (
                  <li key={i} className="text-[11px] text-gray-500">
                    {d.desc} — cuota {d.numero}/{d.total} · {formatARS(convertirARS(d.monto, d.moneda, tc))}
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

function TarjetaTxRow({ t, delay }: { t: Transaccion; delay: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="glass-light p-3 flex items-center gap-3"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-semibold shrink-0"
        style={{ backgroundColor: (t.categoria?.color ?? '#6366f1') + '15', color: t.categoria?.color ?? '#6366f1' }}
      >
        {t.categoria?.nombre?.[0] ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate">{t.descripcion}</p>
        <p className="text-xs text-gray-500">{t.categoria?.nombre ?? '—'} · {t.fecha}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-200">
          -{t.moneda === 'ARS' ? '$' : 'USD'} {t.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] text-gray-500">{t.moneda}</p>
      </div>
    </motion.li>
  )
}
