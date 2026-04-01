import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { formatARS, formatUSD, montoDisplayClass } from '../lib/utils'

interface KPICardProps {
  titulo: string
  montoARS: number
  montoUSD?: number
  variacion?: number
  descripcion?: string
  icon?: React.ReactNode
  accentColor?: string
  children?: React.ReactNode
  delay?: number
  /** Si está definido, la tarjeta es clicable y navega a esta ruta */
  to?: string
  /** Saldo principal en home: montos grandes y centrados */
  variant?: 'default' | 'hero'
  /** Solo móvil: ARS más grande y centrado; USD y contenido debajo centrados (mismo tamaño entre USD y extra) */
  mobileStatLayout?: boolean
  /** ARS (y USD en layout stat) más grande para dar protagonismo al monto */
  montoProtagonista?: boolean
  /** Controles interactivos dentro del vidrio pero fuera del Link (p. ej. lápiz / select) */
  topAccessory?: React.ReactNode
}

export default function KPICard({
  titulo,
  montoARS,
  montoUSD,
  variacion,
  descripcion,
  icon,
  accentColor,
  children,
  delay = 0,
  to,
  variant = 'default',
  mobileStatLayout = false,
  montoProtagonista = false,
  topAccessory,
}: KPICardProps) {
  const isHero = variant === 'hero'
  const ms = mobileStatLayout && !isHero
  const arsStr = formatARS(montoARS)
  const usdStr = montoUSD !== undefined ? formatUSD(montoUSD) : ''
  /** Tipografía fluida en móvil para KPIs en grilla; Gastos sin TC (protagonista) solo si el texto es largo. */
  const arsFluidMobile =
    ms && (!montoProtagonista || arsStr.length >= 11)
  const usdFluidMobile = ms && !montoProtagonista
  const montoArsKind =
    montoProtagonista && ms
      ? 'kpiStatProminentResponsive'
      : isHero
        ? 'kpiHero'
        : ms
          ? 'kpiStat'
          : 'kpiInline'
  const montoUsdKind =
    montoProtagonista && ms
      ? 'pairUsdProminentResponsive'
      : isHero
        ? 'heroUsd'
        : ms
          ? 'pairUsd'
          : 'pairUsd'

  const accentBar =
    accentColor != null ? (
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
    ) : null

  const innerBody = (
    <>
      {isHero ? (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:mb-5">
          {icon && <span className="text-gray-500">{icon}</span>}
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400 sm:text-base">{titulo}</p>
        </div>
      ) : (
        <div
          className={`${ms && montoProtagonista ? 'mb-1' : 'mb-2'} flex min-w-0 items-center gap-2 ${ms ? 'justify-center' : 'justify-between'} ${
            topAccessory ? 'pr-8 sm:pr-9' : ''
          }`}
        >
          <p
            className={`min-w-0 font-medium uppercase tracking-wider text-gray-400 ${
              ms && montoProtagonista
                ? 'text-[10px] text-center lg:text-xs line-clamp-2 break-words leading-tight'
                : ms
                  ? 'text-xs text-center line-clamp-2 break-words leading-tight'
                  : 'text-xs truncate'
            }`}
          >
            {titulo}
          </p>
          {icon && (
            <div className={`text-gray-500 shrink-0 ${ms && montoProtagonista ? 'scale-90' : ''}`}>{icon}</div>
          )}
        </div>
      )}
      {ms ? (
        <div className="flex w-full max-w-full min-w-0 justify-center overflow-x-auto [scrollbar-width:thin]">
          <p
            className={`font-black text-gray-50 tracking-tighter tabular-nums whitespace-nowrap text-center ${
              montoProtagonista ? 'leading-none lg:leading-tight' : 'leading-tight'
            } ${montoDisplayClass(montoARS, montoArsKind)} ${
              arsFluidMobile
                ? 'max-lg:!text-[length:clamp(0.8125rem,2.85vw+0.45rem,1.4rem)] max-lg:!leading-tight'
                : ''
            }`}
          >
            {arsStr}
          </p>
        </div>
      ) : (
        <p
          className={`font-black text-gray-50 tracking-tighter tabular-nums break-words lg:break-normal ${
            montoProtagonista ? 'leading-none lg:leading-tight' : 'leading-tight'
          } ${
            isHero
              ? montoDisplayClass(montoARS, 'kpiHero')
              : montoDisplayClass(montoARS, montoArsKind)
          }`}
        >
          {formatARS(montoARS)}
        </p>
      )}
      {montoUSD !== undefined &&
        (ms ? (
          <div className="mt-1 flex w-full max-w-full min-w-0 justify-center overflow-x-auto [scrollbar-width:thin]">
            <p
              className={`font-semibold tabular-nums tracking-tight text-gray-500 whitespace-nowrap text-center ${montoDisplayClass(montoUSD, montoUsdKind)} ${
                usdFluidMobile
                  ? 'max-lg:!text-[length:clamp(0.6875rem,2.1vw+0.4rem,0.9375rem)] max-lg:!leading-snug'
                  : ''
              }`}
            >
              {usdStr}
            </p>
          </div>
        ) : (
          <p
            className={`mt-1 font-semibold tabular-nums tracking-tight text-gray-500 break-words lg:break-normal ${
              isHero
                ? montoDisplayClass(montoUSD, 'heroUsd')
                : 'text-sm mt-0.5'
            }`}
          >
            {formatUSD(montoUSD)}
          </p>
        ))}
      {variacion !== undefined && (
        <div
          className={`flex items-center gap-1 mt-2 px-2 py-0.5 rounded-lg text-xs font-semibold tabular-nums tracking-tight ${
            variacion >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          } ${ms ? 'mx-auto w-fit' : 'inline-flex'}`}
        >
          {variacion >= 0 ? '+' : ''}
          {variacion.toFixed(1)}%
        </div>
      )}
      {descripcion && (
        <p
          className={`text-xs text-gray-500 mt-2 ${isHero ? 'max-w-lg mx-auto leading-snug px-1' : 'truncate'} ${
            ms ? 'text-center' : ''
          }`}
        >
          {descripcion}
        </p>
      )}
      {ms && children ? (
        <div className="mt-1.5 flex flex-col items-center">{children}</div>
      ) : (
        children
      )}
    </>
  )

  const motionPad = isHero ? 'p-5 sm:p-7 lg:p-8 text-center' : 'p-4'
  const roundedClass = isHero ? 'rounded-3xl' : 'rounded-2xl'
  /** `overflow-x-auto` en layout stat: permite ver montos largos; el vidrio ya redondea con el borde. */
  const cardOverflow = isHero ? 'overflow-hidden' : ms ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden'
  const motionBase = `glass h-full w-full min-w-0 relative ${cardOverflow} group transition-all duration-300 ${motionPad} ${
    to && !topAccessory ? 'cursor-pointer hover:border-white/[0.18] hover:bg-white/[0.02]' : 'hover:border-white/[0.12]'
  }`

  const linkFocusClass =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

  /** Accesorio flotante: no ocupa fila en el flujo, título y montos alinean como el resto de KPIs */
  if (topAccessory) {
    const shellOverflow = ms ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden'
    const shellClass = `glass h-full w-full min-w-0 relative ${shellOverflow} group transition-all duration-300 ${motionPad} ${roundedClass} ${
      to ? 'cursor-pointer hover:border-white/[0.18] hover:bg-white/[0.02]' : 'hover:border-white/[0.12]'
    }`

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={shellClass}
      >
        {accentBar}
        <div className="pointer-events-auto absolute left-2 right-2 top-2 z-20">{topAccessory}</div>
        {to ? (
          <Link
            to={to}
            className={`block min-h-0 w-full rounded-xl hover:bg-white/[0.02] ${linkFocusClass}`}
            aria-label={`Ver listado: ${titulo}`}
          >
            {innerBody}
          </Link>
        ) : (
          innerBody
        )}
      </motion.div>
    )
  }

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`${motionBase} ${roundedClass}`}
    >
      {accentBar}
      {innerBody}
    </motion.div>
  )

  if (to) {
    return (
      <Link
        to={to}
        className={`block h-full min-h-0 min-w-0 w-full ${linkFocusClass} ${isHero ? 'rounded-3xl' : 'rounded-2xl'}`}
        aria-label={`Ver listado: ${titulo}`}
      >
        {card}
      </Link>
    )
  }

  return card
}
