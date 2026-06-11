import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Monitor, Wrench, LogOut, History } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/shared/NotificationBell'

const NAV_ITEMS = [
  { to: '/sudo/dashboard',     icon: LayoutDashboard, label: 'Vue globale' },
  { to: '/sudo/utilisateurs',  icon: Users,           label: 'Utilisateurs' },
  { to: '/sudo/interventions', icon: Wrench,          label: 'Interventions' },
  { to: '/sudo/equipements',   icon: Monitor,         label: 'Équipements' },
  { to: '/sudo/historique',    icon: History,         label: 'Historique' },
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
  const displayName = `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim() || 'Super Admin'

  async function handleLogout() {
    await supabase.auth.signOut()
    reset()
    navigate('/sudo')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-56 flex-shrink-0 bg-card border-r border-border flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border gap-2.5">
          <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white leading-none">S</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-none">IT-Access</p>
            <p className="text-[10px] text-violet-500 mt-0.5 font-medium">Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
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
          <NavLink to="/sudo/profil"
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
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <p className="text-[13px] text-muted-foreground">
            Mode <span className="text-violet-600 dark:text-violet-400 font-medium">Super Admin</span>
          </p>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
