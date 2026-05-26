// =============================================================
// EntrepriseLayout — layout mobile-first pour les entreprises
// =============================================================
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Monitor, Wrench, MessageSquare, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { NotificationBell } from '@/components/shared/NotificationBell'

const NAV_ITEMS = [
  { to: '/entreprise/dashboard',     icon: LayoutDashboard, label: 'Accueil' },
  { to: '/entreprise/parc',          icon: Monitor,         label: 'Mon Parc' },
  { to: '/entreprise/interventions', icon: Wrench,          label: 'Pannes' },
  { to: '/entreprise/messagerie',    icon: MessageSquare,   label: 'Messages' },
  { to: '/entreprise/profil',        icon: User,            label: 'Profil' },
]

export function EntrepriseLayout() {
  const { profile } = useAuthStore()

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0 shadow-sm">
        <span className="text-sm font-bold text-foreground">IT-Access</span>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'E'}
          </div>
        </div>
      </header>

      {/* Contenu scrollable */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-1 z-50 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1.5 rounded-xl mx-0.5 transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[10px] font-medium truncate ${isActive ? 'font-semibold' : ''}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
