import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  isOnline: boolean;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setIsOnline: (online: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: true,
      isOnline: navigator.onLine,

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

      setIsOnline: (online) => set({ isOnline: online }),
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

// Synchro événements réseau (appelé une fois dans providers.tsx)
export function initNetworkListeners() {
  const store = useUIStore.getState();
  window.addEventListener('online', () => store.setIsOnline(true));
  window.addEventListener('offline', () => store.setIsOnline(false));
}
