import { Check, X } from 'lucide-react'

type Props = {
  busy?: boolean
  onCancel: () => void
  onSave: () => void
  className?: string
}

/** Misma fila táctil que en edición de cuotas: Cancelar + Guardar. */
export default function FormEditGuardarCancelar({ busy = false, onCancel, onSave, className = '' }: Props) {
  return (
    <div className={`flex gap-3 pt-1 ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="flex-1 min-h-[48px] px-3 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-surface-container-low/70 text-red-400 text-sm font-semibold hover:bg-surface-container-high active:scale-[0.99] disabled:opacity-40 transition-colors"
      >
        <X size={22} strokeWidth={2.25} className="shrink-0" aria-hidden />
        Cancelar
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="flex-1 min-h-[48px] px-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-semibold ring-1 ring-emerald-500/35 hover:bg-emerald-500/30 active:scale-[0.99] disabled:opacity-40 transition-colors"
      >
        <Check size={22} strokeWidth={2.25} className="shrink-0" aria-hidden />
        Guardar
      </button>
    </div>
  )
}
