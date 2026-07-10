import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import type { UserProfile } from '@/types'

const ROLE_HOME: Record<string, string> = {
  super_admin: '/sudo/dashboard',
  admin:       '/admin/dashboard',
  technicien:  '/technicien/dashboard',
  client:      '/entreprise/dashboard',
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const nextPath = (location.state as { next?: string } | null)?.next
  const { setProfile } = useAuthStore()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPassword, setShow]   = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true); setError(null)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) {
      const msg = authError?.message ?? ''
      setError(
        msg.includes('Email not confirmed')       ? 'Email non confirmé. Contactez un administrateur.' :
        msg.includes('Invalid login credentials') ? 'Email ou mot de passe incorrect.' :
        msg || 'Email ou mot de passe incorrect.'
      )
      setIsLoading(false); return
    }
    const { data: profile } = await supabase.from('utilisateurs').select('*').eq('id', data.user.id).single()
    if (!profile) {
      setError('Profil introuvable. Contactez un administrateur.')
      await supabase.auth.signOut(); setIsLoading(false); return
    }
    if (!profile.est_actif) {
      await supabase.auth.signOut()
      setError('Votre compte a été désactivé. Contactez un administrateur.')
      setIsLoading(false); return
    }
    if (!profile.compte_valide && profile.role !== 'super_admin' && profile.role !== 'admin') {
      await supabase.auth.signOut()
      setError('Votre compte est en attente de validation par un administrateur.')
      setIsLoading(false); return
    }
    setProfile(profile as UserProfile)
    navigate(nextPath ?? ROLE_HOME[profile.role] ?? '/connexion', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Panneau gauche : branding ── */}
      <div className="hidden lg:flex flex-col flex-1 justify-between px-16 py-14">
        <Link to="/" className="text-base font-bold tracking-tight text-foreground">IT-Access</Link>

        <div className="space-y-8">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-muted-foreground/80 mb-5">
              Maintenance IT
            </p>
            <h2 className="text-[2.6rem] font-bold leading-[1.15] text-foreground">
              La maintenance,<br />sans friction.
            </h2>
            <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed max-w-[320px]">
              Chaque équipement a une histoire. IT-Access la trace — du signalement à la signature.
            </p>
          </div>

          <div className="space-y-3">
            {[
              ['QR Code',     'Accès instantané au passeport numérique'],
              ['Signature',   'Clôture d\'intervention électronique'],
              ['Historique',  'Traçabilité complète des actions'],
            ].map(([label, desc]) => (
              <div key={label} className="flex items-start gap-3.5">
                <span className="mt-1 w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-foreground/70">{label} — </span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/70">© {new Date().getFullYear()} IT-Access</p>
      </div>

      {/* ── Séparateur vertical ── */}
      <div className="hidden lg:block w-px self-stretch bg-primary/25 my-10" />

      {/* ── Formulaire ── */}
      <div className="flex-1 flex items-center justify-center px-6 sm:p-10 lg:px-16 py-14">
        <div className="w-full max-w-sm">

          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="text-2xl font-bold text-foreground">IT-Access</Link>
            <p className="mt-1 text-sm text-muted-foreground">Gestion de maintenance informatique</p>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bon retour !</h1>
          <p className="mt-1 text-sm text-muted-foreground mb-8">Connectez-vous à votre espace</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground/80">Adresse email</label>
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com" required autoComplete="email"
                className="w-full px-3 py-2.5 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground/80">Mot de passe</label>
                <Link to="/mot-de-passe-oublie" className="text-xs text-primary/80 hover:text-primary transition">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  required autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition"
                />
                <button type="button" onClick={() => setShow(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition shadow-sm">
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              Se connecter
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="text-primary/80 hover:text-primary transition font-medium">S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
