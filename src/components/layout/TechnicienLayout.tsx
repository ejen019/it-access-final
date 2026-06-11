import { Outlet, NavLink, Link } from 'react-router-dom'
import { LayoutDashboard, Wrench, QrCode, MessageSquare, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { NotificationBell } from '@/components/shared/NotificationBell'

const NAV_ITEMS = [
  { to: '/technicien/dashboard',     icon: LayoutDashboard, label: 'Accueil' },
  { to: '/technicien/interventions', icon: Wrench,          label: 'Missions' },
  { to: '/technicien/scanner',       icon: QrCode,          label: 'Scanner' },
  { to: '/technicien/messagerie',    icon: MessageSquare,   label: 'Messages' },
  { to: '/technicien/profil',        icon: User,            label: 'Profil' },
]

export function TechnicienLayout() {
  const { profile } = useAuthStore()
  const initial = (profile?.prenom?.[0] ?? profile?.nom?.[0] ?? 'T').toUpperCase()

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <Link to="/technicien/dashboard" className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-primary tracking-tight">IT-Access</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto">
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-50">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 min-w-0 flex-1 py-2 rounded-xl mx-0.5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                <span className={`text-[10px] truncate ${isActive ? 'font-semibold' : 'font-normal'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
