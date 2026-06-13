import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, QrCode, Wrench, FileText } from 'lucide-react'
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
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShow]     = useState(false)
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) {
      const msg = authError?.message ?? ''
      setError(
        msg.includes('Email not confirmed')    ? 'Email non confirmé. Contactez un administrateur.' :
        msg.includes('Invalid login credentials') ? 'Email ou mot de passe incorrect.' :
        msg || 'Email ou mot de passe incorrect.'
      )
      setIsLoading(false)
      return
    }

    const { data: profile } = await supabase.from('utilisateurs').select('*').eq('id', data.user.id).single()
    if (!profile) {
      setError('Profil introuvable. Contactez un administrateur.')
      await supabase.auth.signOut()
      setIsLoading(false)
      return
    }
    if (!profile.est_actif) {
      await supabase.auth.signOut()
      setError('Votre compte a été désactivé. Contactez un administrateur.')
      setIsLoading(false)
      return
    }
    if (!profile.compte_valide && profile.role !== 'super_admin' && profile.role !== 'admin') {
      await supabase.auth.signOut()
      setError('Votre compte est en attente de validation par un administrateur.')
      setIsLoading(false)
      return
    }

    setProfile(profile as UserProfile)
    navigate(ROLE_HOME[profile.role] ?? '/connexion', { replace: true })
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">

      {/* ── Panneau gauche (desktop) ── */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <div className="relative z-10">
          <Link to="/" className="text-xl font-bold tracking-tight">IT-Access</Link>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-3xl font-semibold leading-snug">
              La maintenance IT,<br />sans paperasse.
            </p>
            <p className="mt-3 text-primary-foreground/75 text-sm max-w-xs">
              Scannez, documentez, signez. Tout l'historique de vos équipements à portée de QR Code.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: QrCode,   text: 'Passeport QR pour chaque équipement' },
              { icon: Wrench,   text: 'Interventions signées électroniquement' },
              { icon: FileText, text: 'Rapports PDF horodatés' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-primary-foreground/80">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panneau droit : formulaire ── */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-sm space-y-8">

          {/* Logo mobile uniquement */}
          <div className="lg:hidden text-center">
            <Link to="/" className="text-2xl font-bold text-primary">IT-Access</Link>
            <p className="mt-1 text-sm text-muted-foreground">Gestion de maintenance informatique</p>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bon retour !</h1>
            <p className="mt-1 text-sm text-muted-foreground">Connectez-vous à votre espace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Adresse email</label>
              <input
                id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com" required autoComplete="email"
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Mot de passe</label>
                <Link to="/mot-de-passe-oublie" className="text-xs text-primary hover:underline">Mot de passe oublié ?</Link>
              </div>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  required autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
                <button type="button" onClick={() => setShow(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition h-11">
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              Se connecter
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="text-primary hover:underline font-medium">S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
