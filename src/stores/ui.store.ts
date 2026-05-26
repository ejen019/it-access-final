// =============================================================
// Store UI global — thème, sidebar, network status
// =============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NetworkStatus } from '../types'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  theme: Theme
  sidebarOpen: boolean
  networkStatus: NetworkStatus

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setNetworkStatus: (status: NetworkStatus) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: true,
      networkStatus: 'online',

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setNetworkStatus: (networkStatus) => set({ networkStatus }),
    }),
    {
      name: 'itaccess-ui',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)
