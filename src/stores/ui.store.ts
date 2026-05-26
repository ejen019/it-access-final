import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
type NetworkStatus = 'online' | 'offline';

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  networkStatus: NetworkStatus;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setNetworkStatus: (status: NetworkStatus) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: true,
      networkStatus: navigator.onLine ? 'online' : 'offline',

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(next);
      },

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setNetworkStatus: (status) => set({ networkStatus: status }),
    }),
    {
      name: 'it-access-ui',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);

export function initNetworkListeners() {
  const store = useUIStore.getState();
  window.addEventListener('online', () => store.setNetworkStatus('online'));
  window.addEventListener('offline', () => store.setNetworkStatus('offline'));
}
