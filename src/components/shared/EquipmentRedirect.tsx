// =============================================================
// EquipmentRedirect — point d'entrée public d'un QR Code équipement
//
// Les QR encodent l'URL `${origin}/equipement/:id`. Cette route n'est
// rattachée à aucun espace : on redirige donc vers le passeport selon
// le rôle de l'utilisateur connecté, ou vers la connexion (en conservant
// la destination) si la session n'est pas encore active.
// =============================================================
import { Navigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { LoadingScreen } from './LoadingScreen'

function passportPath(role: string | undefined, id: string): string {
  if (role === 'super_admin') return `/sudo/equipements/${id}`
  if (role === 'admin')       return `/admin/equipements/${id}`
  if (role === 'client')      return `/entreprise/parc/${id}`
  if (role === 'technicien')  return `/technicien/equipement/${id}`
  return '/connexion'
}

export function EquipmentRedirect() {
  const { id } = useParams<{ id: string }>()
  const { profile, isLoading } = useAuthStore()

  if (isLoading) return <LoadingScreen />
  if (!id) return <Navigate to="/connexion" replace />
  if (!profile) {
    // Pas connecté : on mémorise la destination pour y revenir après login.
    return <Navigate to="/connexion" state={{ next: `/equipement/${id}` }} replace />
  }
  return <Navigate to={passportPath(profile.role, id)} replace />
}
