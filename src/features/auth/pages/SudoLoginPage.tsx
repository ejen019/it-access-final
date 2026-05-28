// =============================================================
// SudoLoginPage — Interface secrète d'accès Sudo
//
// URL : /sudo — non référencée dans l'application
// Connexion par email + mot de passe, comme les autres rôles.
// Si le compte n'est pas 'sudo', accès refusé avec message générique.
// =============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import type { UserProfile } from '@/types'

export function SudoLoginPage() {
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
      // Message générique pour ne pas révéler l'existence de l'interface
      setError('Accès refusé.')
      setIsLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    // Seul le rôle 'sudo' peut accéder à cette interface
    if (!profile || profile.role !== 'sudo') {
      await supabase.auth.signOut()
      setError('Accès refusé.')
      setIsLoading(false)
      return
    }

    setProfile(profile as UserProfile)
    navigate('/sudo/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={24} className="text-primary" />
          </div>
          {/* Pas de nom ni de branding visible ici intentionnellement */}
          <p className="text-sm text-muted-foreground">Accès restreint</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3 text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Identifiant"
              required
              autoComplete="off"
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="off"
              className="w-full px-3 py-2.5 pr-10 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Continuer
          </button>
        </form>
      </div>
    </div>
  )
}
