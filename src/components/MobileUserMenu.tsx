import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

/** Avatar superior (móvil): abre menú con correo y cerrar sesión */
export default function MobileUserMenu() {
  const { signOut, user } = useAuth()
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? ''
  const displayName = firstName || user?.email?.split('@')[0] || 'Usuario'
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="relative">
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-[60] mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/[0.08] bg-dark-900/95 py-2 shadow-2xl backdrop-blur-xl"
            role="menu"
          >
            <p
              className="truncate border-b border-white/[0.06] px-4 py-2 text-xs text-gray-500"
              title={user?.email}
            >
              {user?.email}
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue to-accent-purple text-sm font-bold text-white ring-1 ring-white/10 transition-opacity hover:opacity-90"
      >
        {displayName[0]?.toUpperCase() ?? 'U'}
      </button>
    </div>
  )
}
