// =============================================================
// NetworkBanner — affiché en haut de l'écran quand offline
// Disparaît automatiquement au retour de la connexion.
// =============================================================
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/ui.store'

export function NetworkBanner() {
  const { networkStatus } = useUIStore()
  const [showOnline, setShowOnline] = useState(false)

  // Quand on revient online, affiche brièvement "Reconnecté" avant de masquer
  useEffect(() => {
    if (networkStatus === 'online') {
      setShowOnline(true)
      const timer = setTimeout(() => setShowOnline(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [networkStatus])

  const isOffline = networkStatus === 'offline'
  const show = isOffline || showOnline

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-sm font-medium ${
            isOffline
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white'
          }`}
        >
          {isOffline ? (
            <>
              <WifiOff size={14} />
              Hors ligne — données en cache, modifications suspendues
            </>
          ) : (
            <>
              <Wifi size={14} />
              Connexion rétablie
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
