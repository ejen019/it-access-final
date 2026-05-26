// Redirige depuis / vers le bon espace selon le rôle connecté
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { LoadingScreen } from './LoadingScreen'

const ROLE_HOME: Record<string, string> = {
  sudo: '/sudo/dashboard',
  admin: '/admin/dashboard',
  technicien: '/technicien/dashboard',
  entreprise: '/entreprise/dashboard',
}

export function RootRedirect() {
  const { profile, isLoading } = useAuthStore()

  if (isLoading) return <LoadingScreen />

  if (!profile) return <Navigate to="/accueil" replace />

  const home = ROLE_HOME[profile.role] ?? '/connexion'
  return <Navigate to={home} replace />
}
