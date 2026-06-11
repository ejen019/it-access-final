// =============================================================
// ProtectedRoute — garde les routes selon le rôle
//
// Si l'utilisateur n'est pas connecté → /connexion
// Si son rôle n'est pas autorisé → page 403
// Si le compte n'est pas encore validé → page d'attente
// =============================================================
import { Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types'
import { LoadingScreen } from './LoadingScreen'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

const ROLE_HOME: Record<string, string> = {
  super_admin: '/sudo/dashboard',
  admin: '/admin/dashboard',
  technicien: '/technicien/dashboard',
  client: '/entreprise/dashboard',
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { profile, isLoading } = useAuthStore()
  const [justValidated, setJustValidated] = useState(false)

  // Détecte quand un compte passe de non-validé à validé (via Realtime)
  // et affiche un écran de transition avant la redirection
  useEffect(() => {
    if (profile?.compte_valide) setJustValidated(true)
  }, [profile?.compte_valide])

  // Attente du chargement initial de la session
  if (isLoading) return <LoadingScreen />

  // Pas connecté
  if (!profile) return <Navigate to="/connexion" replace />

  // Compte en attente de validation Admin
  if (!profile.compte_valide && profile.role !== 'super_admin' && profile.role !== 'admin') {
    return <PendingValidationScreen />
  }

  // Redirection automatique après validation (si l'utilisateur était sur PendingValidationScreen)
  if (justValidated && !allowedRoles.includes(profile.role)) {
    return <Navigate to={ROLE_HOME[profile.role] ?? '/connexion'} replace />
  }

  // Rôle non autorisé pour cette route
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/connexion" replace />
  }

  return <>{children}</>
}

// ----- Écrans internes -----

function LoadingScreenFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Chargement…</p>
      </div>
    </div>
  )
}

function PendingValidationScreen() {
  const { profile, reset } = useAuthStore()
  const [validated, setValidated] = useState(false)

  // Quand le profil est mis à jour via Realtime et que is_validated devient true
  useEffect(() => {
    if (profile?.compte_valide) {
      setValidated(true)
      // Redirection automatique après 2s pour laisser le temps de lire le message
      setTimeout(() => {
        window.location.href = ROLE_HOME[profile.role] ?? '/connexion'
      }, 2000)
    }
  }, [profile?.compte_valide])

  async function handleLogout() {
    const { supabase } = await import('@/lib/supabase/client')
    await supabase.auth.signOut()
    reset()
  }

  if (validated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground text-green-700 dark:text-green-400">
            Compte validé !
          </h1>
          <p className="text-muted-foreground text-sm">
            Votre compte a été approuvé. Redirection en cours…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Compte en attente</h1>
        <p className="text-muted-foreground text-sm">
          Votre compte a bien été créé. Un administrateur doit valider votre inscription avant que vous puissiez accéder à l'application.
        </p>
        <button
          onClick={handleLogout}
          className="text-sm text-primary hover:underline"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

// Export du composant de chargement pour réutilisation
export { LoadingScreenFallback as LoadingScreen }
