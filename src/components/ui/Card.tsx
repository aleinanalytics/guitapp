/**
 * Componente Card reutilizable con estilos consistentes.
 * Implementa el diseño "glassmorphism" de la app con variants.
 */
import { type ReactNode, type ElementType, type ComponentPropsWithoutRef } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility para mergear clases de tailwind sin conflictos
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type CardVariant = 'default' | 'glass' | 'elevated' | 'outlined'

interface CardProps<T extends ElementType = 'div'> {
  children: ReactNode
  className?: string
  variant?: CardVariant
  as?: T
}

/**
 * Card component con estilos predefinidos para la app.
 *
 * @example
 * <Card variant="glass">
 *   <h2>Título</h2>
 *   <p>Contenido...</p>
 * </Card>
 */
export function Card<T extends ElementType = 'div'>({
  children,
  className,
  variant = 'default',
  as: Component = 'div' as T,
}: CardProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof CardProps<T>>) {
  const variants: Record<CardVariant, string> = {
    default: 'rounded-2xl border border-white/[0.08] bg-surface-container-low',
    glass: 'relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-[#16121c] to-[#0c0a0f]',
    elevated: 'rounded-2xl border border-white/[0.08] bg-surface-container shadow-lg',
    outlined: 'rounded-2xl border border-white/[0.06] bg-white/[0.02]',
  }

  const ComponentAs = Component as ElementType

  return (
    <ComponentAs className={cn(variants[variant], className)}>
      {children}
    </ComponentAs>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-5 pt-6 pb-4 sm:px-6', className)}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-xs font-bold uppercase tracking-[0.2em] text-gray-400', className)}>
      {children}
    </h3>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('px-5 pb-6 sm:px-6', className)}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('px-5 py-4 border-t border-white/[0.06] sm:px-6', className)}>
      {children}
    </div>
  )
}

// Exportar cn para uso en otros componentes
export { cn }
