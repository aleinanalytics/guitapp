import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Info } from 'lucide-react'
import MobileUserMenu from '../components/MobileUserMenu'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { convertirARS, formatARS } from '../lib/utils'
import type { Categoria, Transaccion } from '../lib/types'
import { getUltimoIpcReferencia } from '../lib/ipcArgentinaMensual'
import { principalDeCategoria } from '../lib/categoriasJerarquia'

const MESES_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const now = new Date()
const currentYear = now.getFullYear()

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function prevMes(mes: number, anio: number) {
  if (mes === 1) return { mes: 12, anio: anio - 1 }
  return { mes: mes - 1, anio }
}

function firstDayOfMonth(mes: number, anio: number) {
  return `${anio}-${pad2(mes)}-01`
}

export default function Presupuesto() {
  const { user } = useAuth()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(currentYear)
  const [tc, setTc] = useState(1000)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [transaccionesBase, setTransaccionesBase] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('tipo_cambio')
      .select('usd_ars')
      .order('fecha', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setTc((data as { usd_ars: number }).usd_ars)
      })
  }, [])

  useEffect(() => {
    supabase.from('categorias').select('*').then(({ data }) => {
      if (data) setCategorias(data as Categoria[])
    })
  }, [])

  const fetchBase = useCallback(async () => {
    if (!user) return
    const { mes: mb, anio: yb } = prevMes(mes, anio)
    const desde = firstDayOfMonth(mb, yb)
    const hastaExcl = firstDayOfMonth(mes, anio)
    setLoading(true)
    const { data, error } = await supabase
      .from('transacciones')
      .select('*, categoria:categorias(*)')
      .eq('user_id', user.id)
      .eq('tipo', 'gasto')
      .gte('fecha', desde)
      .lt('fecha', hastaExcl)
    setLoading(false)
    if (error) {
      console.error(error)
      setTransaccionesBase([])
      return
    }
    setTransaccionesBase((data as Transaccion[]) ?? [])
  }, [user, mes, anio])

  useEffect(() => {
    void fetchBase()
  }, [fetchBase])

  const ipcPct = useMemo(() => getUltimoIpcReferencia(anio, mes), [anio, mes])
  const factorVariable = 1 + ipcPct / 100

  const { lineas, porPrincipal, totalPresupuesto, mesBaseLabel } = useMemo(() => {
    const { mes: mb, anio: yb } = prevMes(mes, anio)
    const mesBaseLabel = `${MESES_FULL[mb - 1]} ${yb}`

    const porCat = new Map<string, { var: number; fijo: number }>()
    for (const t of transaccionesBase) {
      const id = t.categoria_id ?? '__sin__'
      const ars = convertirARS(t.monto, t.moneda, tc)
      const cur = porCat.get(id) ?? { var: 0, fijo: 0 }
      if (t.es_gasto_fijo) cur.fijo += ars
      else cur.var += ars
      porCat.set(id, cur)
    }

    type Linea = {
      categoriaId: string
      nombre: string
      color: string
      baseVar: number
      baseFijo: number
      presupuesto: number
      principalId: string
      principalNombre: string
      principalColor: string
    }

    const lineas: Linea[] = []
    for (const [catId, { var: v, fijo: f }] of porCat) {
      const cat = catId === '__sin__' ? undefined : categorias.find((c) => c.id === catId)
      const nombre = cat?.nombre ?? 'Sin categoría'
      const color = cat?.color ?? '#64748b'
      const principal = principalDeCategoria(cat, categorias)
      const principalNombre = principal?.nombre ?? nombre
      const principalColor = principal?.color ?? color
      const principalId = principal?.id ?? catId
      const presupuesto = f + v * factorVariable
      if (presupuesto <= 0 && v <= 0 && f <= 0) continue
      lineas.push({
        categoriaId: catId,
        nombre,
        color,
        baseVar: v,
        baseFijo: f,
        presupuesto,
        principalId,
        principalNombre,
        principalColor,
      })
    }

    lineas.sort((a, b) => b.presupuesto - a.presupuesto)

    const rollup = new Map<
      string,
      { nombre: string; color: string; presupuesto: number; lineas: Linea[] }
    >()
    for (const L of lineas) {
      const r = rollup.get(L.principalId) ?? {
        nombre: L.principalNombre,
        color: L.principalColor,
        presupuesto: 0,
        lineas: [],
      }
      r.presupuesto += L.presupuesto
      r.lineas.push(L)
      rollup.set(L.principalId, r)
    }

    const porPrincipal = [...rollup.values()].sort((a, b) => b.presupuesto - a.presupuesto)
    const totalPresupuesto = porPrincipal.reduce((s, p) => s + p.presupuesto, 0)

    return { lineas, porPrincipal, totalPresupuesto, mesBaseLabel }
  }, [transaccionesBase, categorias, tc, factorVariable])

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="p-4 pb-8 lg:p-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-50 lg:text-3xl">Presupuesto</h1>
            <p className="text-sm text-gray-500">Proyección sobre tu gasto del mes anterior</p>
          </div>
        </div>
        <div className="lg:hidden">
          <MobileUserMenu />
        </div>
      </motion.div>

      <div className="mb-6 flex gap-2">
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="select-dark flex-1">
          {MESES_FULL.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="select-dark w-28">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2.5 text-xs text-sky-200/90">
        <Info size={16} className="shrink-0 mt-0.5 text-sky-400" />
        <p className="leading-relaxed">
          Base: <span className="font-medium text-gray-200">{mesBaseLabel}</span>. La parte <strong>variable</strong>{' '}
          se ajusta con IPC <span className="font-semibold text-sky-300">{ipcPct.toFixed(1)}%</span> (referencia{' '}
          {MESES_FULL[mes - 1]} {anio}). Los movimientos marcados como <strong>gasto fijo</strong> repiten el mismo
          monto (sin IPC), pensando en contratos o gastos difíciles de proyectar.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-accent-blue/30 border-t-accent-blue" />
        </div>
      ) : totalPresupuesto <= 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-gray-500 text-sm">
          No hay gastos en {mesBaseLabel} para armar el presupuesto de {MESES_FULL[mes - 1]}.
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass mb-8 rounded-2xl border border-white/[0.08] p-6 text-center"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-2">
              Presupuesto total estimado
            </p>
            <p className="text-4xl font-bold tracking-tight text-gray-50 sm:text-5xl">{formatARS(totalPresupuesto)}</p>
            <p className="mt-2 text-xs text-gray-500">
              {MESES_FULL[mes - 1]} {anio} · suma de categorías (fijo + variable × {factorVariable.toFixed(3)})
            </p>
          </motion.div>

          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Por categoría principal</h2>
          <div className="space-y-4 mb-10">
            {porPrincipal.map((p, i) => {
              const pct = totalPresupuesto > 0 ? (p.presupuesto / totalPresupuesto) * 100 : 0
              return (
                <motion.div
                  key={p.nombre + i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass rounded-xl border border-white/[0.06] p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-medium text-gray-200 truncate">{p.nombre}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-100">{formatARS(p.presupuesto)}</p>
                      <p className="text-[11px] text-gray-500">{pct.toFixed(1)}% del total</p>
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-dark-800/80">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: p.color,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                  {p.lineas.length > 1 && (
                    <ul className="mt-3 space-y-1.5 border-t border-white/[0.05] pt-3">
                      {p.lineas.map((L) => (
                        <li key={L.categoriaId} className="flex justify-between gap-2 text-[11px] text-gray-500">
                          <span className="truncate text-gray-400">{L.nombre}</span>
                          <span className="shrink-0 text-gray-300">{formatARS(L.presupuesto)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )
            })}
          </div>

          {lineas.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Detalle por subcategoría</h2>
              <div className="glass rounded-xl border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
                {lineas.map((L) => (
                  <div key={L.categoriaId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: L.color }} />
                      <span className="text-gray-300 truncate">{L.nombre}</span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-medium text-gray-100">{formatARS(L.presupuesto)}</span>
                      {totalPresupuesto > 0 && (
                        <span className="ml-2 text-gray-500">
                          {((L.presupuesto / totalPresupuesto) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
