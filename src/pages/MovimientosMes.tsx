import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import EditableTransaccionListRow from '../components/EditableTransaccionListRow'
import MobileUserMenu from '../components/MobileUserMenu'
import { useTransacciones } from '../hooks/useTransacciones'
import { useTipoCambio } from '../hooks/useTipoCambio'
import { convertirARS, cuentaComoSalidaDeEfectivo, formatARS, formatUSD } from '../lib/utils'
import type { Categoria } from '../lib/types'
import { ordenarCategoriasPorTema } from '../lib/categoriasOrden'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

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
  const categoriaIdFiltro = searchParams.get('categoria_id')

  const { transacciones, loading, error, refetch } = useTransacciones({ mes, anio })
  const { tipoCambio } = useTipoCambio()
  const tc = tipoCambio?.usd_ars ?? 1000
  const [categorias, setCategorias] = useState<Categoria[]>([])

  useEffect(() => {
    supabase.from('categorias').select('*').then(({ data }) => {
      if (data) setCategorias(data as Categoria[])
    })
  }, [])

  const filtradas = useMemo(() => {
    let list = tipo === 'todos' ? transacciones : transacciones.filter((t) => t.tipo === tipo)
    if (categoriaIdFiltro) {
      list = list.filter((t) => t.categoria_id === categoriaIdFiltro)
    }
    return [...list].sort((a, b) => {
      const fd = b.fecha.localeCompare(a.fecha)
      if (fd !== 0) return fd
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })
  }, [transacciones, tipo, categoriaIdFiltro])

  const resumen = useMemo(() => {
    const ing = transacciones.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const gas = transacciones.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const sus = transacciones.filter((t) => t.tipo === 'suscripcion').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const salidasEf = transacciones
      .filter(cuentaComoSalidaDeEfectivo)
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    return { ingresos: ing, gastos: gas, suscripciones: sus, balance: ing - salidasEf }
  }, [transacciones, tc])

  const nombreCategoriaFiltro = categoriaIdFiltro
    ? categorias.find((c) => c.id === categoriaIdFiltro)?.nombre
    : undefined

  const titulo =
    tipo === 'ingreso' ? 'Ingresos del mes'
      : tipo === 'gasto'
        ? nombreCategoriaFiltro
          ? `Gastos del mes — ${nombreCategoriaFiltro}`
          : 'Gastos del mes'
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

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-50 lg:text-3xl">{titulo}</h1>
          <p className="mt-1 text-sm text-gray-500">{sub}</p>
        </div>
        <div className="shrink-0 lg:hidden">
          <MobileUserMenu />
        </div>
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
                <EditableTransaccionListRow
                  key={t.id}
                  t={t}
                  categorias={ordenarCategoriasPorTema(categorias.filter((c) => c.tipo === t.tipo))}
                  delay={i * 0.02}
                  mostrarTipo={tipo === 'todos'}
                  onMutated={() => refetch()}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
