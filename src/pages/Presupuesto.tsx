import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import MobileUserMenu from '../components/MobileUserMenu'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { convertirARS, formatARS } from '../lib/utils'
import type { Categoria, Transaccion } from '../lib/types'
import { getUltimoIpcReferencia } from '../lib/ipcArgentinaMensual'
import { esGastoOtrosExcluidoDePresupuesto, principalDeCategoria } from '../lib/categoriasJerarquia'

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
      const catTx = t.categoria ?? categorias.find((c) => c.id === t.categoria_id)
      if (esGastoOtrosExcluidoDePresupuesto(catTx, categorias)) continue
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
    <div className="px-4 pt-4 pb-28 lg:px-8 lg:pt-8 lg:pb-12 max-w-3xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <p className="text-primary text-xs font-bold tracking-[0.25em] uppercase mb-1">Finanzas Personales</p>
          <h1 className="text-2xl font-extrabold text-slate-50 tracking-tight lg:text-3xl">Presupuesto</h1>
        </div>
        <div className="lg:hidden">
          <MobileUserMenu />
        </div>
      </motion.div>

      {/* ── Selectores ──────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="select-dark flex-1">
          {MESES_FULL.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="select-dark w-28">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ── Info IPC ────────────────────────────────────────────────────── */}
      <div className="flex gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-xs text-sky-200/90">
        <span className="material-symbols-outlined text-sky-400 flex-shrink-0" style={{ fontSize: 16, marginTop: 1 }}>info</span>
        <p className="leading-relaxed">
          Base: <span className="font-medium text-slate-200">{mesBaseLabel}</span>. Parte <strong>variable</strong>{' '}
          ajustada con IPC <span className="font-semibold text-sky-300">{ipcPct.toFixed(1)}%</span> ({MESES_FULL[mes - 1]} {anio}).{' '}
          <strong>Gastos fijos</strong> se repiten sin IPC.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : totalPresupuesto <= 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-slate-500 text-sm">
          No hay gastos en {mesBaseLabel} para armar el presupuesto de {MESES_FULL[mes - 1]}.
        </div>
      ) : (
        <>
          {/* ── Hero: Total ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-xl p-7 text-center relative overflow-hidden"
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(195,192,255,0.12) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(76,215,246,0.08) 0%, transparent 70%)' }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-3 relative z-10">
              Presupuesto total estimado
            </p>
            <p className="text-4xl font-extrabold tracking-tighter text-slate-50 tabular-nums relative z-10 sm:text-5xl">
              {formatARS(totalPresupuesto)}
            </p>
            <p className="mt-2 text-xs text-slate-500 relative z-10">
              {MESES_FULL[mes - 1]} {anio} · fijo + variable × {factorVariable.toFixed(3)}
            </p>
          </motion.div>

          {/* ── Categorías ──────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Por categoría principal</h2>
            <div className="space-y-3">
              {porPrincipal.map((p, i) => {
                const pct = totalPresupuesto > 0 ? (p.presupuesto / totalPresupuesto) * 100 : 0
                return (
                  <motion.div
                    key={p.nombre + i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-panel rounded-xl p-5"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-semibold text-slate-100 truncate">{p.nombre}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-50 tabular-nums">{formatARS(p.presupuesto)}</p>
                        <p className="text-[10px] text-slate-500">{pct.toFixed(1)}% del total</p>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-lowest">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: p.color, opacity: 0.85 }}
                      />
                    </div>
                    {p.lineas.length > 1 && (
                      <ul className="mt-3 space-y-1.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {p.lineas.map((L) => (
                          <li key={L.categoriaId} className="flex justify-between gap-2 text-xs text-slate-500">
                            <span className="truncate text-slate-400">{L.nombre}</span>
                            <span className="shrink-0 text-slate-300 tabular-nums">{formatARS(L.presupuesto)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* ── Detalle por subcategoría ────────────────────────────────── */}
          {lineas.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Detalle por subcategoría</h2>
              <div className="glass-card rounded-xl overflow-hidden">
                {lineas.map((L) => (
                  <div key={L.categoriaId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: L.color }} />
                      <span className="text-slate-300 truncate">{L.nombre}</span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-semibold text-slate-100 tabular-nums">{formatARS(L.presupuesto)}</span>
                      {totalPresupuesto > 0 && (
                        <span className="ml-2 text-slate-500">
                          {((L.presupuesto / totalPresupuesto) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
