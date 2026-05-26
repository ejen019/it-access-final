// =============================================================
// AdminLayout — layout web de l'espace Administrateur
// Sidebar fixe + zone de contenu principale
// =============================================================
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Monitor, Wrench,
  FileText, MessageSquare, Settings, LogOut, ChevronRight, History
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/shared/NotificationBell'

const NAV_ITEMS = [
  { to: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/utilisateurs',  icon: Users,           label: 'Utilisateurs' },
  { to: '/admin/equipements',   icon: Monitor,         label: 'Équipements' },
  { to: '/admin/interventions', icon: Wrench,          label: 'Interventions' },
  { to: '/admin/contrats',      icon: FileText,        label: 'Contrats' },
  { to: '/admin/messagerie',    icon: MessageSquare,   label: 'Messagerie' },
  { to: '/admin/historique',    icon: History,         label: 'Historique' },
]

export function AdminLayout() {
  const { profile, reset } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    reset()
    navigate('/connexion')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-card border-r border-border flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-border">
          <div>
            <p className="text-sm font-bold text-foreground leading-none">IT-Access</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">Admin</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 mt-1">Navigation</p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={14} className="opacity-60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profil */}
        <div className="border-t border-border p-2 space-y-0.5">
          <NavLink
            to="/admin/profil"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <Settings size={17} />
            Paramètres
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut size={17} />
            Se déconnecter
          </button>
          {/* Mini profil */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1 bg-muted/50 rounded-lg">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-muted-foreground">Administrateur</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="h-8 w-px bg-border" />
            <NavLink to="/admin/profil" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
                {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <span className="text-sm font-medium text-foreground hidden md:block">
                {profile?.full_name}
              </span>
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
