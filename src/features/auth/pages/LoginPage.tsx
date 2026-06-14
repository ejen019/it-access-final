import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
    navigate(ROLE_HOME[profile.role] ?? '/connexion', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[hsl(240_21%_5%)] flex">

      {/* ── Panneau gauche : branding ── */}
      <div className="hidden lg:flex flex-col flex-1 justify-between px-16 py-14">
        <Link to="/" className="text-base font-bold tracking-tight text-white/90">IT-Access</Link>

        <div className="space-y-8">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/25 mb-5">
              Maintenance IT
            </p>
            <h2 className="text-[2.6rem] font-bold leading-[1.15] text-white/90">
              La maintenance,<br />sans friction.
            </h2>
            <p className="mt-5 text-[15px] text-white/35 leading-relaxed max-w-[320px]">
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
                  <span className="text-xs font-semibold text-white/50">{label} — </span>
                  <span className="text-xs text-white/25">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-white/15">© {new Date().getFullYear()} IT-Access</p>
      </div>

      {/* ── Séparateur vertical ── */}
      <div className="hidden lg:block w-px self-stretch bg-primary/25 my-10" />

      {/* ── Formulaire ── */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-14">
        <div className="w-full max-w-sm">

          <div className="lg:hidden mb-10">
            <Link to="/" className="text-lg font-bold text-white/90">IT-Access</Link>
          </div>

          <div className="mb-9">
            <h1 className="text-2xl font-semibold tracking-tight text-white/90">Connexion</h1>
            <p className="mt-1.5 text-[13px] text-white/30">Accédez à votre espace de travail</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-[13px] font-medium text-white/50">Adresse email</label>
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com" required autoComplete="email"
                className="w-full px-3.5 py-3 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/50 transition"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[13px] font-medium text-white/50">Mot de passe</label>
                <Link to="/mot-de-passe-oublie" className="text-[12px] text-primary/70 hover:text-primary transition">
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  required autoComplete="current-password"
                  className="w-full px-3.5 py-3 pr-10 bg-white/5 border border-white/10 rounded-lg text-[13px] text-white/85 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/50 transition"
                />
                <button type="button" onClick={() => setShow(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition"
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 bg-primary text-white rounded-lg text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-50 transition">
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              Se connecter
            </button>
          </form>

          <p className="mt-7 text-center text-[13px] text-white/25">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="text-primary/70 hover:text-primary transition font-medium">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
