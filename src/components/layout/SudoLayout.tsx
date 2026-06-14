import { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Monitor, Wrench, LogOut, History, Menu, X, Settings, QrCode } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/shared/NotificationBell'

const NAV_ITEMS = [
  { to: '/sudo/dashboard',     icon: LayoutDashboard, label: 'Vue globale' },
  { to: '/sudo/utilisateurs',  icon: Users,           label: 'Utilisateurs' },
  { to: '/sudo/interventions', icon: Wrench,          label: 'Interventions' },
  { to: '/sudo/equipements',   icon: Monitor,         label: 'Équipements' },
  { to: '/sudo/historique',    icon: History,         label: 'Historique' },
  { to: '/sudo/parametres',    icon: Settings,        label: 'Paramètres' },
  { to: '/sudo/scanner',       icon: QrCode,          label: 'Scanner QR' },
]

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ').filter(Boolean)
  const init = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
  return (
    <div className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[11px] font-semibold flex-shrink-0 border border-violet-500/20">
      {init || 'S'}
    </div>
  )
}

export function SudoLayout() {
  const { profile, reset } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const displayName = `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim() || 'Super Admin'

  async function handleLogout() {
    await supabase.auth.signOut()
    reset()
    navigate('/sudo')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`fixed md:static z-40 inset-y-0 left-0 w-60 md:w-56 flex-shrink-0 bg-card border-r border-border flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-14 flex items-center px-4 border-b border-border gap-2.5">
          <Link to="/sudo/dashboard" onClick={() => setOpen(false)} className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-primary leading-none tracking-tight">IT-Access</p>
            <p className="text-[10px] text-violet-500 mt-0.5 font-medium">Super Admin</p>
          </Link>
          <button onClick={() => setOpen(false)} className="md:hidden p-1 text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                  isActive
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} className="flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-violet-500/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-2 space-y-0.5">
          <NavLink to="/sudo/profil" onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                isActive ? 'bg-violet-500/10 text-violet-600 font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <Initials name={displayName} />
            <span className="truncate flex-1">{displayName}</span>
          </NavLink>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors">
            <LogOut size={15} strokeWidth={1.8} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setOpen(true)} className="md:hidden p-1 text-muted-foreground">
              <Menu size={20} />
            </button>
            <p className="text-[13px] text-muted-foreground truncate">
              Mode <span className="text-violet-600 dark:text-violet-400 font-medium">Super Admin</span>
            </p>
          </div>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
