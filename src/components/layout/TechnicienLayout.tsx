import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Wrench, QrCode, MessageSquare, User, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/shared/NotificationBell'

const NAV_ITEMS = [
  { to: '/technicien/dashboard',     icon: LayoutDashboard, label: 'Accueil' },
  { to: '/technicien/interventions', icon: Wrench,          label: 'Missions' },
  { to: '/technicien/scanner',       icon: QrCode,          label: 'Scanner' },
  { to: '/technicien/messagerie',    icon: MessageSquare,   label: 'Messages' },
  { to: '/technicien/profil',        icon: User,            label: 'Profil' },
]

export function TechnicienLayout() {
  const { profile, reset } = useAuthStore()
  const navigate = useNavigate()
  const initial = (profile?.prenom?.[0] ?? profile?.nom?.[0] ?? 'T').toUpperCase()
  const displayName = `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim() || 'Technicien'

  async function handleLogout() {
    await supabase.auth.signOut()
    reset()
    navigate('/connexion')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-card border-r border-border flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border">
          <Link to="/technicien/dashboard" className="min-w-0">
            <p className="text-[15px] font-bold text-primary leading-none tracking-tight">IT-Access</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Espace technicien</p>
          </Link>
        </div>

        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} className="flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-primary/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-2 space-y-0.5">
          <NavLink to="/technicien/profil"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
              {initial}
            </div>
            <span className="truncate flex-1">{displayName}</span>
          </NavLink>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors">
            <LogOut size={15} strokeWidth={1.8} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ===== Colonne principale ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          {/* Mobile : marque ; Desktop : salutation */}
          <Link to="/technicien/dashboard" className="md:hidden flex items-center gap-2">
            <span className="text-[15px] font-bold text-primary tracking-tight">IT-Access</span>
          </Link>
          <p className="hidden md:block text-[13px] text-muted-foreground truncate">
            Bonjour, <span className="text-foreground font-medium">{profile?.prenom ?? displayName}</span>
          </p>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-sm font-semibold md:hidden">
              {initial}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <div className="max-w-2xl lg:max-w-4xl mx-auto md:px-2">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ===== Bottom nav (mobile uniquement) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-40">
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
