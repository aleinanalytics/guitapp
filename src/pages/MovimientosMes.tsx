import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { useTransacciones } from '../hooks/useTransacciones'
import { useTipoCambio } from '../hooks/useTipoCambio'
import { convertirARS, formatARS, formatUSD } from '../lib/utils'
import type { TipoTransaccion, Transaccion } from '../lib/types'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TIPO_STYLE: Record<TipoTransaccion, { label: string; color: string; bg: string }> = {
  ingreso: { label: 'Ingreso', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  gasto: { label: 'Gasto', color: 'text-red-400', bg: 'bg-red-500/10' },
  suscripcion: { label: 'Suscripción', color: 'text-purple-400', bg: 'bg-purple-500/10' },
}

function parseTipo(raw: string | null): 'ingreso' | 'gasto' | 'suscripcion' | 'todos' {
  if (raw === 'ingreso' || raw === 'gasto' || raw === 'suscripcion' || raw === 'todos') return raw
  return 'todos'
}

export default function MovimientosMes() {
  const [searchParams] = useSearchParams()
  const tipo = parseTipo(searchParams.get('tipo'))
  const now = new Date()
  const mesRaw = Number(searchParams.get('mes'))
  const anioRaw = Number(searchParams.get('anio'))
  const mes = mesRaw >= 1 && mesRaw <= 12 ? mesRaw : now.getMonth() + 1
  const anio = Number.isFinite(anioRaw) && anioRaw >= 2000 && anioRaw <= 2100 ? anioRaw : now.getFullYear()

  const { transacciones, loading, error } = useTransacciones({ mes, anio })
  const { tipoCambio } = useTipoCambio()
  const tc = tipoCambio?.usd_ars ?? 1000

  const filtradas = useMemo(() => {
    const list = tipo === 'todos' ? transacciones : transacciones.filter((t) => t.tipo === tipo)
    return [...list].sort((a, b) => {
      const fd = b.fecha.localeCompare(a.fecha)
      if (fd !== 0) return fd
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })
  }, [transacciones, tipo])

  const resumen = useMemo(() => {
    const ing = transacciones.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const gas = transacciones.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const sus = transacciones.filter((t) => t.tipo === 'suscripcion').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    return { ingresos: ing, gastos: gas, suscripciones: sus, balance: ing - gas - sus }
  }, [transacciones, tc])

  const titulo =
    tipo === 'ingreso' ? 'Ingresos del mes'
      : tipo === 'gasto' ? 'Gastos del mes'
        : tipo === 'suscripcion' ? 'Suscripciones del mes'
          : 'Todas las operaciones'

  const sub = `${MESES[mes - 1]} ${anio}`

  const dashLink = `/?mes=${mes}&anio=${anio}`

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
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-50">{titulo}</h1>
        <p className="text-gray-500 text-sm mt-1">{sub}</p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <>
          {tipo === 'todos' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-4 grid grid-cols-2 gap-3 mb-6"
            >
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Ingresos</p>
                <p className="text-lg font-semibold text-emerald-400">{formatARS(resumen.ingresos)}</p>
                <p className="text-xs text-gray-500">{formatUSD(resumen.ingresos / tc)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Gastos</p>
                <p className="text-lg font-semibold text-red-400">{formatARS(resumen.gastos)}</p>
                <p className="text-xs text-gray-500">{formatUSD(resumen.gastos / tc)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Suscripciones</p>
                <p className="text-lg font-semibold text-purple-400">{formatARS(resumen.suscripciones)}</p>
                <p className="text-xs text-gray-500">{formatUSD(resumen.suscripciones / tc)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Balance</p>
                <p className={`text-lg font-semibold ${resumen.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatARS(resumen.balance)}
                </p>
                <p className="text-xs text-gray-500">{formatUSD(resumen.balance / tc)}</p>
              </div>
            </motion.div>
          )}

          {filtradas.length === 0 ? (
            <div className="glass p-8 text-center text-gray-500 text-sm">No hay movimientos en este período.</div>
          ) : (
            <ul className="space-y-2">
              {filtradas.map((t, i) => (
                <MovimientoRow key={t.id} t={t} delay={i * 0.02} mostrarTipo={tipo === 'todos'} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function MovimientoRow({ t, delay, mostrarTipo }: { t: Transaccion; delay: number; mostrarTipo: boolean }) {
  const cfg = TIPO_STYLE[t.tipo]
  const sign = t.tipo === 'ingreso' ? '+' : '-'
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
        <p className="text-sm font-medium text-gray-200 truncate">
          {t.descripcion}
          {t.tipo === 'gasto' && t.medio_pago === 'tarjeta' && (
            <CreditCard size={12} className="inline ml-1.5 text-rose-400/60" />
          )}
        </p>
        <p className="text-xs text-gray-500">
          {t.categoria?.nombre ?? '—'} · {t.fecha}
          {mostrarTipo && (
            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-gray-200'}`}>
          {sign}{t.moneda === 'ARS' ? '$' : 'USD'} {t.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] text-gray-500">{t.moneda}</p>
      </div>
    </motion.li>
  )
}
