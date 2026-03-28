import { motion } from 'framer-motion'
import { formatARS, formatUSD } from '../lib/utils'

interface KPICardProps {
  titulo: string
  montoARS: number
  montoUSD?: number
  variacion?: number
  descripcion?: string
  icon?: React.ReactNode
  glowClass?: string
  accentColor?: string
  children?: React.ReactNode
  delay?: number
}

export default function KPICard({
  titulo, montoARS, montoUSD, variacion, descripcion, icon, glowClass, accentColor, children, delay = 0,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`glass p-4 relative overflow-hidden group hover:border-white/[0.12] transition-all duration-300 ${glowClass ?? ''}`}
    >
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        />
      )}
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{titulo}</p>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
      <p className="text-xl font-bold text-gray-50 tracking-tight">{formatARS(montoARS)}</p>
      {montoUSD !== undefined && (
        <p className="text-sm text-gray-500 mt-0.5">{formatUSD(montoUSD)}</p>
      )}
      {variacion !== undefined && (
        <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-lg text-xs font-semibold ${
          variacion >= 0
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-red-500/10 text-red-400'
        }`}>
          {variacion >= 0 ? '+' : ''}{variacion.toFixed(1)}%
        </div>
      )}
      {descripcion && <p className="text-xs text-gray-500 mt-2 truncate">{descripcion}</p>}
      {children}
    </motion.div>
  )
}
