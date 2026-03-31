import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import EditableTransaccionListRow from '../components/EditableTransaccionListRow'
import MobileUserMenu from '../components/MobileUserMenu'
import { useTransacciones } from '../hooks/useTransacciones'
import { useTarjetaConfig } from '../hooks/useTarjetaConfig'
import { useSaldoAcumuladoHastaMes } from '../hooks/useSaldoAcumuladoHastaMes'
import { useTipoCambio } from '../hooks/useTipoCambio'
import {
  convertirARS,
  cuentaComoSalidaDeEfectivo,
  esIngresoReintegroTarjetaCredito,
  formatARS,
  formatUSD,
  grupoGastoPorMedio,
  transaccionEnMesVista,
  type GrupoGastoPorMedio,
} from '../lib/utils'
import type { Categoria, Transaccion } from '../lib/types'
import { ordenarCategoriasPorTema } from '../lib/categoriasOrden'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function parseTipo(raw: string | null): 'ingreso' | 'gasto' | 'suscripcion' | 'todos' {
  if (raw === 'ingreso' || raw === 'gasto' || raw === 'suscripcion' || raw === 'todos') return raw
  return 'todos'
}

const GASTOS_MEDIO_GRUPOS: {
  key: GrupoGastoPorMedio
  titulo: string
  subtitulo: string
}[] = [
  { key: 'transferencias', titulo: 'Transferencias', subtitulo: 'Pagos con transferencia' },
  { key: 'debito', titulo: 'Débito', subtitulo: 'Efectivo y compras con débito' },
  { key: 'credito', titulo: 'Crédito', subtitulo: 'Tarjeta de crédito' },
]

export default function MovimientosMes() {
  const [searchParams] = useSearchParams()
  const tipo = parseTipo(searchParams.get('tipo'))
  const now = new Date()
  const mesRaw = Number(searchParams.get('mes'))
  const anioRaw = Number(searchParams.get('anio'))
  const mes = mesRaw >= 1 && mesRaw <= 12 ? mesRaw : now.getMonth() + 1
  const anio = Number.isFinite(anioRaw) && anioRaw >= 2000 && anioRaw <= 2100 ? anioRaw : now.getFullYear()
  const categoriaIdFiltro = searchParams.get('categoria_id')
  const sinTarjetaCredito = searchParams.get('sin_tc') === '1'

  const { transacciones, loading, error, refetch } = useTransacciones({ mes, anio })
  const { config: tcConfig } = useTarjetaConfig()
  const { tipoCambio } = useTipoCambio()
  const tc = tipoCambio?.usd_ars ?? 1000
  const { saldoAcumulado, loading: loadingSaldoAcum } = useSaldoAcumuladoHastaMes({ mes, anio, tc })
  const [categorias, setCategorias] = useState<Categoria[]>([])

  useEffect(() => {
    supabase.from('categorias').select('*').then(({ data }) => {
      if (data) setCategorias(data as Categoria[])
    })
  }, [])

  const diaCierreTc =
    tcConfig?.fecha_cierre != null
      ? new Date(tcConfig.fecha_cierre + 'T12:00:00').getDate()
      : null
  const transaccionesDelMes = useMemo(
    () => transacciones.filter((t) => transaccionEnMesVista(t, mes, anio, diaCierreTc)),
    [transacciones, mes, anio, diaCierreTc],
  )

  const filtradas = useMemo(() => {
    let list = tipo === 'todos' ? transaccionesDelMes : transaccionesDelMes.filter((t) => t.tipo === tipo)
    if (categoriaIdFiltro) {
      list = list.filter((t) => t.categoria_id === categoriaIdFiltro)
    }
    if (sinTarjetaCredito && tipo === 'gasto') {
      list = list.filter((t) => t.medio_pago !== 'tarjeta')
    }
    return [...list].sort((a, b) => {
      const fd = b.fecha.localeCompare(a.fecha)
      if (fd !== 0) return fd
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })
  }, [transaccionesDelMes, tipo, categoriaIdFiltro, sinTarjetaCredito])

  const gastosPorGrupoMedio = useMemo(() => {
    if (tipo !== 'gasto') return null
    const map: Record<GrupoGastoPorMedio, Transaccion[]> = {
      transferencias: [],
      debito: [],
      credito: [],
    }
    for (const t of filtradas) {
      const g = grupoGastoPorMedio(t)
      if (g) map[g].push(t)
    }
    return GASTOS_MEDIO_GRUPOS.map((def) => ({ ...def, items: map[def.key] })).filter((x) => x.items.length > 0)
  }, [filtradas, tipo])

  const resumen = useMemo(() => {
    const ing = transaccionesDelMes
      .filter((t) => t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t))
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const reintegrosTc = transaccionesDelMes
      .filter(esIngresoReintegroTarjetaCredito)
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const gas = transaccionesDelMes.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const sus = transaccionesDelMes.filter((t) => t.tipo === 'suscripcion').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const salidasEf = transaccionesDelMes
      .filter(cuentaComoSalidaDeEfectivo)
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    return { ingresos: ing, reintegrosTc, gastos: gas, suscripciones: sus, resultadoMes: ing - salidasEf }
  }, [transaccionesDelMes, tc])

  const nombreCategoriaFiltro = categoriaIdFiltro
    ? categorias.find((c) => c.id === categoriaIdFiltro)?.nombre
    : undefined

  const titulo =
    tipo === 'ingreso'
      ? 'Ingresos del mes'
      : tipo === 'gasto'
        ? nombreCategoriaFiltro
          ? sinTarjetaCredito
            ? `Gastos del mes — ${nombreCategoriaFiltro} (sin TC)`
            : `Gastos del mes — ${nombreCategoriaFiltro}`
          : sinTarjetaCredito
            ? 'Gastos del mes — sin tarjeta de crédito'
            : 'Gastos del mes'
        : tipo === 'suscripcion'
          ? 'Suscripciones del mes'
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

      {loading || (tipo === 'todos' && loadingSaldoAcum) ? (
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
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Ingresos (efectivo)</p>
                <p className="text-lg font-semibold text-emerald-400">{formatARS(resumen.ingresos)}</p>
                <p className="text-xs text-gray-500">{formatUSD(resumen.ingresos / tc)}</p>
                {resumen.reintegrosTc > 0 && (
                  <p className="text-[10px] text-rose-400/90 mt-1 leading-snug">
                    +{formatARS(resumen.reintegrosTc)} reintegro/promo TC (no suma acá; resta en resumen tarjeta)
                  </p>
                )}
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
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Resultado del mes</p>
                <p className={`text-lg font-semibold ${resumen.resultadoMes >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatARS(resumen.resultadoMes)}
                </p>
                <p className="text-xs text-gray-500">{formatUSD(resumen.resultadoMes / tc)}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Saldo acumulado hasta fin de {MESES[mes - 1]}
                </p>
                <p className={`text-xl font-bold tabular-nums ${saldoAcumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatARS(saldoAcumulado)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{formatUSD(saldoAcumulado / tc)}</p>
                <p className="text-[10px] text-gray-600 mt-2 leading-snug">
                  Suma de todo tu historial hasta el último día de este mes (sin consumos en tarjeta de crédito ni reintegros/promos TC). Si el mes anterior te sobró plata, acá sigue contando.
                </p>
              </div>
              <p className="col-span-2 text-[10px] text-gray-600 leading-snug -mt-1">
                Resultado del mes = ingresos del mes − gastos y suscripciones en efectivo, transferencia o débito (sin tarjeta de crédito).
              </p>
            </motion.div>
          )}

          {filtradas.length === 0 ? (
            <div className="glass p-8 text-center text-gray-500 text-sm">No hay movimientos en este período.</div>
          ) : tipo === 'gasto' && gastosPorGrupoMedio && gastosPorGrupoMedio.length > 0 ? (
            <div className="space-y-8">
              {gastosPorGrupoMedio.map((grupo) => (
                <div key={grupo.key}>
                  <div className="mb-2.5">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{grupo.titulo}</h2>
                    <p className="text-[11px] text-gray-600 mt-0.5">{grupo.subtitulo}</p>
                  </div>
                  <ul className="space-y-2">
                    {grupo.items.map((t, i) => (
                      <EditableTransaccionListRow
                        key={t.id}
                        t={t}
                        categorias={ordenarCategoriasPorTema(categorias.filter((c) => c.tipo === t.tipo))}
                        delay={i * 0.02}
                        mostrarTipo={false}
                        onMutated={() => refetch()}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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
