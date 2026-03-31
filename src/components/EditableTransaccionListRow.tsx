import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Pencil, Trash2, Check, X, ArrowLeftRight, CircleDollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatMontoFromNumber, montoFieldNextValue, parseMontoInput } from '../lib/utils'
import type { Categoria, TipoTransaccion, Transaccion } from '../lib/types'
import { principalesGastoOrdenadas, subcategoriasDe } from '../lib/categoriasJerarquia'

const TIPO_STYLE: Record<TipoTransaccion, { label: string; color: string; bg: string }> = {
  ingreso: { label: 'Ingreso', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  gasto: { label: 'Gasto', color: 'text-red-400', bg: 'bg-red-500/10' },
  suscripcion: { label: 'Suscripción', color: 'text-purple-400', bg: 'bg-purple-500/10' },
}

type Props = {
  t: Transaccion
  categorias: Categoria[]
  delay?: number
  mostrarTipo?: boolean
  onMutated: () => void
}

export default function EditableTransaccionListRow({ t, categorias, delay = 0, mostrarTipo, onMutated }: Props) {
  const [editing, setEditing] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editMonto, setEditMonto] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [editCategoriaId, setEditCategoriaId] = useState('')
  const [editEsGastoFijo, setEditEsGastoFijo] = useState(false)
  const [busy, setBusy] = useState(false)

  const cfg = TIPO_STYLE[t.tipo]
  const sign = t.tipo === 'ingreso' ? '+' : '-'

  const startEdit = () => {
    setEditDesc(t.descripcion)
    setEditMonto(formatMontoFromNumber(t.monto))
    setEditFecha(t.fecha)
    setEditCategoriaId(t.categoria_id ?? '')
    setEditEsGastoFijo(t.tipo === 'gasto' && !!t.es_gasto_fijo)
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const save = async () => {
    const m = parseMontoInput(editMonto)
    if (!editDesc.trim() || !Number.isFinite(m) || m <= 0 || !editFecha || !editCategoriaId) return
    setBusy(true)
    const { error } = await supabase.from('transacciones').update({
      descripcion: editDesc.trim(),
      monto: m,
      fecha: editFecha,
      categoria_id: editCategoriaId,
      es_gasto_fijo: t.tipo === 'gasto' ? editEsGastoFijo : false,
    }).eq('id', t.id)
    setBusy(false)
    if (error) window.alert('Error: ' + error.message)
    else {
      setEditing(false)
      onMutated()
    }
  }

  const remove = async () => {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    setBusy(true)
    const { error } = await supabase.from('transacciones').delete().eq('id', t.id)
    setBusy(false)
    if (error) window.alert('Error: ' + error.message)
    else {
      setEditing(false)
      onMutated()
    }
  }

  if (editing) {
    return (
      <motion.li
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        className="glass-light p-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 w-full">
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="input-dark !py-1.5 !text-sm flex-1 min-w-[min(100%,10rem)]"
            maxLength={100}
          />
          <select
            value={editCategoriaId}
            onChange={(e) => setEditCategoriaId(e.target.value)}
            className="select-dark !py-1.5 !pl-2.5 !pr-8 !text-sm min-w-[9rem] flex-1 max-w-[13rem]"
          >
            <option value="">Categoría…</option>
            {t.tipo === 'gasto' && categorias.some((c) => c.tipo === 'gasto' && !!c.parent_id) ? (
              <>
                {principalesGastoOrdenadas(categorias).map((p) => (
                  <optgroup key={p.id} label={p.nombre}>
                    {subcategoriasDe(p.id, categorias).map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </optgroup>
                ))}
                {categorias
                  .filter(
                    (c) =>
                      c.tipo === 'gasto' &&
                      !c.parent_id &&
                      !categorias.some((s) => s.parent_id === c.id),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
              </>
            ) : (
              categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))
            )}
          </select>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={editMonto}
            onChange={(e) => setEditMonto(montoFieldNextValue(editMonto, e.target.value))}
            className="input-dark !py-1.5 !text-sm min-w-[6.5rem] w-28"
          />
          <input
            type="date"
            value={editFecha}
            onChange={(e) => setEditFecha(e.target.value)}
            className="input-dark !py-1.5 !text-sm min-w-0 w-[9.5rem] sm:w-36 max-w-full"
          />
          {t.tipo === 'gasto' && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 w-full sm:w-auto shrink-0">
              <input
                type="checkbox"
                checked={editEsGastoFijo}
                onChange={(e) => setEditEsGastoFijo(e.target.checked)}
                className="accent-rose-500 w-3.5 h-3.5"
              />
              Fijo
            </label>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" disabled={busy} onClick={save} className="text-emerald-400 hover:text-emerald-300 disabled:opacity-40">
            <Check size={18} />
          </button>
          <button type="button" disabled={busy} onClick={cancelEdit} className="text-red-400 hover:text-red-300 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>
      </motion.li>
    )
  }

  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="glass-light p-3 flex items-center gap-3 group"
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
          {(t.tipo === 'gasto' || t.tipo === 'suscripcion') && t.medio_pago === 'efectivo' && (
            <CircleDollarSign size={12} className="inline ml-1.5 text-emerald-400/75" aria-hidden />
          )}
          {(t.tipo === 'gasto' || t.tipo === 'suscripcion') && t.medio_pago === 'tarjeta' && (
            <CreditCard size={12} className="inline ml-1.5 text-rose-400/60" />
          )}
          {(t.tipo === 'gasto' || t.tipo === 'suscripcion') && t.medio_pago === 'transferencia' && (
            <ArrowLeftRight size={12} className="inline ml-1.5 text-sky-400/70" />
          )}
        </p>
        <p className="text-xs text-gray-500">
          {t.categoria?.nombre ?? '—'} · {t.fecha}
          {t.tipo === 'gasto' && t.es_gasto_fijo && (
            <span className="ml-1 text-[10px] font-medium text-sky-400/90">· Fijo</span>
          )}
          {mostrarTipo && (
            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0 flex items-center gap-2">
        <div>
          <p className={`text-sm font-semibold ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-gray-200'}`}>
            {sign}{t.moneda === 'ARS' ? '$' : 'USD'} {t.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-500">{t.moneda}</p>
        </div>
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={startEdit} className="text-gray-500 hover:text-accent-blue p-1" aria-label="Editar">
            <Pencil size={15} />
          </button>
          <button type="button" onClick={remove} disabled={busy} className="text-gray-500 hover:text-red-400 p-1 disabled:opacity-40" aria-label="Eliminar">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </motion.li>
  )
}
