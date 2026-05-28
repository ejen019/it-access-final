// =============================================================
// Store d'authentification — Zustand
// Contient l'état global de session : qui est connecté, son rôle.
// Utilisé par le router pour les routes protégées.
// =============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '../types'

interface AuthState {
  profile: UserProfile | null
  isLoading: boolean

  // Actions
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void

  // Helpers de rôle (évite les vérifications répétitives partout)
  isSudo: () => boolean
  isAdmin: () => boolean
  isEntreprise: () => boolean
  isTechnicien: () => boolean
}

// Si un profil est déjà en cache localStorage, on démarre sans loading
// pour éviter le flash de LoadingScreen à chaque rafraîchissement de page.
const _hasCachedProfile = (() => {
  try {
    const s = localStorage.getItem('itaccess-auth')
    return !!(s && JSON.parse(s)?.state?.profile)
  } catch {
    return false
  }
})()

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: !_hasCachedProfile, // false si cache dispo, true sinon

      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ profile: null, isLoading: false }),

      isSudo: () => get().profile?.role === 'sudo',
      isAdmin: () => get().profile?.role === 'admin',
      isEntreprise: () => get().profile?.role === 'entreprise',
      isTechnicien: () => get().profile?.role === 'technicien',
    }),
    {
      name: 'itaccess-auth',
      // Ne persiste que le profil, pas isLoading
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)
