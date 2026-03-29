import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatMontoFromNumber, montoFieldNextValue, parseMontoInput } from '../lib/utils'
import type { Categoria, CompraCuotas } from '../lib/types'

type Props = {
  compra: CompraCuotas
  cuotaNumero: number
  delay?: number
  gastoCategorias: Categoria[]
  onMutated: () => void
}

export default function EditableCuotaCompraRow({ compra, cuotaNumero, delay = 0, gastoCategorias, onMutated }: Props) {
  const [editing, setEditing] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editMontoTotal, setEditMontoTotal] = useState('')
  const [editCategoriaId, setEditCategoriaId] = useState('')
  const [busy, setBusy] = useState(false)

  const startEdit = () => {
    setEditDesc(compra.descripcion)
    setEditMontoTotal(formatMontoFromNumber(compra.monto_total))
    setEditCategoriaId(compra.categoria_id ?? '')
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const save = async () => {
    const total = parseMontoInput(editMontoTotal)
    if (!editDesc.trim() || !Number.isFinite(total) || total <= 0 || !editCategoriaId) return
    const monto_cuota = Math.round((total / compra.cuotas_total) * 100) / 100
    setBusy(true)
    const { error } = await supabase.from('compras_cuotas').update({
      descripcion: editDesc.trim(),
      monto_total: total,
      monto_cuota,
      categoria_id: editCategoriaId,
    }).eq('id', compra.id)
    setBusy(false)
    if (error) window.alert('Error: ' + error.message)
    else {
      setEditing(false)
      onMutated()
    }
  }

  const remove = async () => {
    if (!window.confirm('¿Eliminar toda la compra en cuotas? Se borran todas las cuotas pendientes.')) return
    setBusy(true)
    const { error } = await supabase.from('compras_cuotas').delete().eq('id', compra.id)
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
        className="glass-light p-3 flex flex-col gap-2"
      >
        <p className="text-[10px] text-gray-500">Cuota {cuotaNumero} de {compra.cuotas_total} · ajustás la compra completa</p>
        <input
          type="text"
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          className="input-dark !py-1.5 !text-sm w-full"
          maxLength={100}
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={editCategoriaId}
            onChange={(e) => setEditCategoriaId(e.target.value)}
            className="select-dark !py-1.5 !text-sm flex-1 min-w-[9rem]"
          >
            <option value="">Categoría…</option>
            {gastoCategorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={editMontoTotal}
            onChange={(e) => setEditMontoTotal(montoFieldNextValue(editMontoTotal, e.target.value))}
            placeholder="Monto total"
            className="input-dark !py-1.5 !text-sm min-w-[6.5rem] flex-1 max-w-[11rem]"
          />
        </div>
        <div className="flex gap-2">
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
      className="glass-light p-3 flex items-center justify-between gap-3 group"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-200 truncate">{compra.descripcion}</p>
        <p className="text-xs text-gray-500">
          Cuota {cuotaNumero} de {compra.cuotas_total}
          {compra.categoria?.nombre && ` · ${compra.categoria.nombre}`}
        </p>
      </div>
      <div className="text-right shrink-0 flex items-center gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-100">
            {compra.moneda === 'ARS' ? '$' : 'USD'} {compra.monto_cuota.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-500">{compra.moneda}</p>
        </div>
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={startEdit} className="text-gray-500 hover:text-accent-blue p-1" aria-label="Editar compra">
            <Pencil size={15} />
          </button>
          <button type="button" onClick={remove} disabled={busy} className="text-gray-500 hover:text-red-400 p-1 disabled:opacity-40" aria-label="Eliminar compra">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </motion.li>
  )
}
