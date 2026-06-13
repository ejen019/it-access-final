import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { LoadingScreen } from './LoadingScreen'
import { PublicLandingPage } from '@/features/public/pages/PublicLandingPage'

const ROLE_HOME: Record<string, string> = {
  super_admin: '/sudo/dashboard',
  admin:       '/admin/dashboard',
  technicien:  '/technicien/dashboard',
  client:      '/entreprise/dashboard',
}

export function RootRedirect() {
  const { profile, isLoading } = useAuthStore()

  if (isLoading) return <LoadingScreen />
  if (!profile) return <PublicLandingPage />

  const home = ROLE_HOME[profile.role] ?? '/connexion'
  return <Navigate to={home} replace />
}
