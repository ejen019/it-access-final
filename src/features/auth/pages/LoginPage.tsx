// =============================================================
// LoginPage — Page de connexion commune à tous les rôles
// Redirige vers l'espace approprié après connexion selon le rôle.
// =============================================================
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import type { UserProfile } from '@/types'

const ROLE_HOME: Record<string, string> = {
  super_admin: '/sudo/dashboard',
  admin: '/admin/dashboard',
  technicien: '/technicien/dashboard',
  client: '/entreprise/dashboard',
}

export function LoginPage() {
  const navigate = useNavigate()
  const { setProfile } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      const msg = authError?.message ?? ''
      if (msg.includes('Email not confirmed')) {
        setError('Email non confirmé. Contactez un administrateur.')
      } else if (msg.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect.')
      } else {
        setError(msg || 'Email ou mot de passe incorrect.')
      }
      setIsLoading(false)
      return
    }

    // Récupère le profil pour connaître le rôle
    const { data: profile } = await supabase
      .from('utilisateurs')
      .select('*')
      .eq('id', data.user.id)
      .single()

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">IT-Access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestion de maintenance informatique
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 pr-10 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to="/mot-de-passe-oublie"
              className="text-xs text-primary hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Se connecter
          </button>
        </form>

        {/* Inscription */}
        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="text-primary hover:underline font-medium">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  )
}
