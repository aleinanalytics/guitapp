import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
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
  /** Si está definido, la tarjeta es clicable y navega a esta ruta */
  to?: string
}

export default function KPICard({
  titulo, montoARS, montoUSD, variacion, descripcion, icon, glowClass, accentColor, children, delay = 0, to,
}: KPICardProps) {
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`glass h-full p-4 relative overflow-hidden group transition-all duration-300 ${glowClass ?? ''} ${
        to ? 'cursor-pointer hover:border-white/[0.18] hover:bg-white/[0.02]' : 'hover:border-white/[0.12]'
      }`}
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

  if (to) {
    return (
      <Link
        to={to}
        className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
        aria-label={`Ver listado: ${titulo}`}
      >
        {card}
      </Link>
    )
  }

  return card
}
