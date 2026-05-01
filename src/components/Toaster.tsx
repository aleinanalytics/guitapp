import { Toaster as Sonner, toast } from 'sonner'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

/**
 * Toaster component usando Sonner para notificaciones toast.
 * Configurado con el tema oscuro de la app.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      expand={false}
      duration={4000}
      gap={8}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast: 'group !rounded-2xl !border !bg-surface-container-low !text-on-surface !shadow-lg !border-white/[0.08]',
          title: '!text-sm !font-medium !text-on-surface',
          description: '!text-xs !text-on-surface-variant',
          actionButton: '!bg-primary !text-on-primary !rounded-lg',
          cancelButton: '!bg-surface-container !text-on-surface !rounded-lg',
          closeButton: '!text-on-surface-variant hover:!text-on-surface',
          error: '!border-error/30 !bg-error/10',
          success: '!border-emerald-500/30 !bg-emerald-500/10',
          warning: '!border-amber-500/30 !bg-amber-500/10',
          info: '!border-primary/30 !bg-primary/10',
        },
      }}
      icons={{
        success: <CheckCircle className="h-5 w-5 text-emerald-400" />,
        error: <AlertCircle className="h-5 w-5 text-error" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
        info: <Info className="h-5 w-5 text-primary" />,
        close: <X className="h-4 w-4" />,
      }}
    />
  )
}

/**
 * API de toast tipada y consistente para toda la app.
 * Reemplaza window.alert con notificaciones no-intrusivas.
 */
export const notify = {
  /**
   * Toast de éxito
   */
  success: (message: string, description?: string) => {
    toast.success(message, { description })
  },

  /**
   * Toast de error
   */
  error: (message: string, description?: string) => {
    toast.error(message, { description })
  },

  /**
   * Toast de advertencia
   */
  warning: (message: string, description?: string) => {
    toast.warning(message, { description })
  },

  /**
   * Toast informativo
   */
  info: (message: string, description?: string) => {
    toast.info(message, { description })
  },

  /**
   * Toast de promesa - muestra loading, success o error automáticamente
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    })
  },

  /**
   * Dismiss all toasts
   */
  dismiss: () => {
    toast.dismiss()
  },
}

export { toast }
