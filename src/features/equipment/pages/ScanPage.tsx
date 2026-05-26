// =============================================================
// ScanPage — Scanner QR Code équipement (Technicien)
// Utilise l'API BarcodeDetector si disponible, sinon guide manuel
// =============================================================
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrCode, AlertCircle, CheckCircle2, Loader2, Camera } from 'lucide-react'

// URL du passeport : ${origin}/equipement/:id
function extractEquipmentId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\/equipement\/([^/]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export function ScanPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'idle' | 'requesting' | 'scanning' | 'success' | 'error' | 'unsupported'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualId, setManualId] = useState('')
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const isSupported = typeof (window as any).BarcodeDetector !== 'undefined'

  useEffect(() => {
    return () => {
      // Nettoyer le stream caméra à l'unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  async function startScanning() {
    if (!isSupported) {
      setStatus('unsupported')
      return
    }

    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setStatus('scanning')

      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })

      function scan() {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(scan)
          return
        }

        detector.detect(videoRef.current).then((codes: any[]) => {
          if (codes.length > 0) {
            const rawValue: string = codes[0].rawValue
            const equipmentId = extractEquipmentId(rawValue)

            if (equipmentId) {
              setStatus('success')
              stream.getTracks().forEach((t) => t.stop())
              if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
              setTimeout(() => navigate(`/technicien/equipement/${equipmentId}`), 600)
            } else {
              animFrameRef.current = requestAnimationFrame(scan)
            }
          } else {
            animFrameRef.current = requestAnimationFrame(scan)
          }
        }).catch(() => {
          animFrameRef.current = requestAnimationFrame(scan)
        })
      }

      scan()
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? "Accès à la caméra refusé. Autorisez la caméra dans les paramètres du navigateur."
          : "Impossible d'accéder à la caméra."
      )
      setStatus('error')
    }
  }

  function stopScanning() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setStatus('idle')
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = manualId.trim()
    if (!trimmed) return
    navigate(`/technicien/equipement/${trimmed}`)
  }

  return (
    <div className="p-4 space-y-5 page-transition">
      <div>
        <h1 className="text-xl font-bold text-foreground">Scanner</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {"Scannez le QR Code d'un équipement pour accéder à son passeport"}
        </p>
      </div>

      {/* Zone caméra */}
      <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-muted border border-border">
        {(status === 'scanning' || status === 'success') ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Overlay guidage */}
            {status === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                </div>
              </div>
            )}
            {status === 'success' && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <div className="bg-white/90 rounded-full p-3">
                  <CheckCircle2 size={40} className="text-green-600" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6">
            {status === 'requesting' && (
              <Loader2 size={32} className="animate-spin text-muted-foreground" />
            )}
            {status === 'idle' && (
              <>
                <QrCode size={48} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground text-center">
                  {isSupported ? 'Prêt à scanner' : 'Scanner non disponible sur ce navigateur'}
                </p>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle size={32} className="text-destructive" />
                <p className="text-sm text-destructive text-center">{errorMsg}</p>
              </>
            )}
            {status === 'unsupported' && (
              <>
                <Camera size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  BarcodeDetector non disponible. Utilisez Chrome 83+ ou Android.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Boutons caméra */}
      <div className="flex gap-3 max-w-sm mx-auto">
        {status === 'scanning' ? (
          <button
            onClick={stopScanning}
            className="flex-1 px-4 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Arrêter
          </button>
        ) : status !== 'requesting' && status !== 'success' ? (
          <button
            onClick={startScanning}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
          >
            <Camera size={18} />
            {isSupported ? 'Démarrer le scanner' : 'Tester quand même'}
          </button>
        ) : null}
      </div>

      {/* Saisie manuelle de l'ID */}
      <div className="max-w-sm mx-auto space-y-2">
        <p className="text-xs text-muted-foreground text-center">— ou saisir l'ID manuellement —</p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="ID de l'équipement…"
            className="flex-1 px-3 py-2.5 bg-background border border-input rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!manualId.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60"
          >
            Aller
          </button>
        </form>
      </div>
    </div>
  )
}
