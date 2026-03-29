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
  /** Saldo principal en home: montos grandes y centrados */
  variant?: 'default' | 'hero'
  /** Solo móvil: ARS más grande y centrado; USD y contenido debajo centrados (mismo tamaño entre USD y extra) */
  mobileStatLayout?: boolean
}

export default function KPICard({
  titulo,
  montoARS,
  montoUSD,
  variacion,
  descripcion,
  icon,
  glowClass,
  accentColor,
  children,
  delay = 0,
  to,
  variant = 'default',
  mobileStatLayout = false,
}: KPICardProps) {
  const isHero = variant === 'hero'
  const ms = mobileStatLayout && !isHero
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`glass h-full relative overflow-hidden group transition-all duration-300 ${glowClass ?? ''} ${
        isHero ? 'p-5 sm:p-7 lg:p-8 text-center' : 'p-4'
      } ${to ? 'cursor-pointer hover:border-white/[0.18] hover:bg-white/[0.02]' : 'hover:border-white/[0.12]'}`}
    >
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        />
      )}
      {isHero ? (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:mb-5">
          {icon && <span className="text-gray-500">{icon}</span>}
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400 sm:text-base">{titulo}</p>
        </div>
      ) : (
        <div
          className={`mb-2 flex items-center gap-2 ${ms ? 'justify-center lg:justify-between' : 'justify-between'}`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{titulo}</p>
          {icon && <div className="text-gray-500 shrink-0">{icon}</div>}
        </div>
      )}
      <p
        className={`font-bold text-gray-50 tracking-tight tabular-nums ${
          isHero
            ? 'text-3xl sm:text-4xl lg:text-5xl'
            : ms
              ? 'text-center text-2xl lg:text-left lg:text-xl'
              : 'text-xl'
        }`}
      >
        {formatARS(montoARS)}
      </p>
      {montoUSD !== undefined && (
        <p
          className={`mt-1 text-gray-500 ${
            isHero
              ? 'text-base sm:text-lg'
              : ms
                ? 'text-center text-xs lg:text-left lg:text-sm'
                : 'text-sm mt-0.5'
          }`}
        >
          {formatUSD(montoUSD)}
        </p>
      )}
      {variacion !== undefined && (
        <div
          className={`flex items-center gap-1 mt-2 px-2 py-0.5 rounded-lg text-xs font-semibold ${
            variacion >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          } ${ms ? 'mx-auto lg:mx-0 w-fit' : 'inline-flex'}`}
        >
          {variacion >= 0 ? '+' : ''}
          {variacion.toFixed(1)}%
        </div>
      )}
      {descripcion && (
        <p className={`text-xs text-gray-500 mt-2 truncate ${ms ? 'text-center lg:text-left' : ''}`}>
          {descripcion}
        </p>
      )}
      {ms && children ? (
        <div className="mt-1.5 flex flex-col items-center lg:items-stretch">{children}</div>
      ) : (
        children
      )}
    </motion.div>
  )

  if (to) {
    return (
      <Link
        to={to}
        className={`block h-full min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 ${
          isHero ? 'rounded-3xl' : 'rounded-2xl'
        }`}
        aria-label={`Ver listado: ${titulo}`}
      >
        {card}
      </Link>
    )
  }

  return card
}
