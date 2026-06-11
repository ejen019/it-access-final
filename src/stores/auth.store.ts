// =============================================================
// Store d'authentification — Zustand
// =============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '../types'

interface AuthState {
  profile: UserProfile | null
  isLoading: boolean

  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void

  isSuperAdmin: () => boolean
  isAdmin: () => boolean
  isClient: () => boolean
  isTechnicien: () => boolean
}

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
      isLoading: !_hasCachedProfile,

      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ profile: null, isLoading: false }),

      isSuperAdmin: () => get().profile?.role === 'super_admin',
      isAdmin: () => get().profile?.role === 'admin',
      isClient: () => get().profile?.role === 'client',
      isTechnicien: () => get().profile?.role === 'technicien',
    }),
    {
      name: 'itaccess-auth',
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)
