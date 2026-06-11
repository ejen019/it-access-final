//Providers globaux qui permettent de wrapper toute l'application 

// =============================================================
// Providers globaux — wrappent toute l'application
// Ordre : QueryClient → AuthProvider → ThemeProvider → Router
// =============================================================
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { router } from './router'
import { supabase } from '../lib/supabase/client'
import { useAuthStore } from '../stores/auth.store'
import { useUIStore } from '../stores/ui.store'
import type { UserProfile } from '../types'
import { NetworkBanner } from '../components/shared/NetworkBanner'

// Instance QueryClient partagée dans toute l'app
// staleTime : 5 min — évite les refetch inutiles sur navigation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// ----- Auth Provider -----
// Écoute les changements de session Supabase et met à jour le store.
// On utilise uniquement onAuthStateChange (INITIAL_SESSION + SIGNED_IN + SIGNED_OUT)
// pour éviter les doubles appels entre getSession() et SIGNED_IN.
function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, setLoading, reset } = useAuthStore()
  // Référence vers le canal Realtime du profil courant (ex: validation par admin)
  const profileChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            await loadProfile(session.user.id)
          } else {
            setLoading(false)
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Ignorer si LoginPage a déjà chargé ce profil
          if (useAuthStore.getState().profile?.id === session.user.id) {
            setLoading(false)
            return
          }
          await loadProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          // Nettoyer le canal Realtime du profil
          if (profileChannelRef.current) {
            supabase.removeChannel(profileChannelRef.current)
            profileChannelRef.current = null
          }
          reset()
          queryClient.clear()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      if (profileChannelRef.current) {
        supabase.removeChannel(profileChannelRef.current)
      }
    }
  }, [])

  async function loadProfile(userId: string) {
    const alreadyLoaded = useAuthStore.getState().profile?.id === userId
    if (!alreadyLoaded) setLoading(true)

    const { data } = await supabase
      .from('utilisateurs')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile((data as UserProfile) ?? null)
    setLoading(false)

    // Abonnement Realtime sur le profil de l'utilisateur connecté.
    // Permet de détecter immédiatement quand un admin valide le compte
    // (is_validated passe à true → ProtectedRoute arrête d'afficher PendingValidationScreen).
    if (profileChannelRef.current) {
      supabase.removeChannel(profileChannelRef.current)
    }
    profileChannelRef.current = supabase
      .channel(`profile-updates:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'utilisateurs',
        filter: `id=eq.${userId}`,
      }, async () => {
        // Rechargement silencieux (pas de spinner)
        const { data: updated } = await supabase
          .from('utilisateurs')
          .select('*')
          .eq('id', userId)
          .single()
        if (updated) setProfile(updated as UserProfile)
      })
      .subscribe()
  }

  return <>{children}</>
}

// ----- Theme Provider -----
// Applique la classe dark/light sur <html> selon le store
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore()

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark)

    root.classList.toggle('dark', isDark)
  }, [theme])

  return <>{children}</>
}

// ----- Network Provider -----
// Écoute online/offline et met à jour le store + affiche le banner
function NetworkProvider({ children }: { children: React.ReactNode }) {
  const { setNetworkStatus } = useUIStore()

  useEffect(() => {
    const onOnline = () => setNetworkStatus('online')
    const onOffline = () => setNetworkStatus('offline')

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return <>{children}</>
}

// ----- Root Providers -----
export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <NetworkProvider>
            <NetworkBanner />
            <RouterProvider router={router} />
          </NetworkProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export { queryClient }
