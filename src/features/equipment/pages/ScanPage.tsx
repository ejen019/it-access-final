// =============================================================
// ScanPage — Scanner QR Code équipement
// Stratégie : BarcodeDetector si disponible, sinon jsQR sur canvas
// Fonctionne sur Chrome, Firefox, Safari, Edge, iOS, Android
// =============================================================
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrCode, AlertCircle, CheckCircle2, Loader2, Camera } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import jsQR from 'jsqr'

function passportPath(role: string | undefined, equipmentId: string): string {
  if (role === 'super_admin') return `/sudo/equipements/${equipmentId}`
  if (role === 'admin')       return `/admin/equipements/${equipmentId}`
  if (role === 'client')      return `/entreprise/parc/${equipmentId}`
  return `/technicien/equipement/${equipmentId}`
}

function extractEquipmentId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\/equipement\/([^/]+)/)
    if (match) return match[1]
    // fallback: last path segment if looks like a UUID
    const parts = parsed.pathname.split('/').filter(Boolean)
    const last = parts[parts.length - 1]
    if (last && /^[0-9a-f-]{36}$/i.test(last)) return last
    return null
  } catch {
    // plain UUID passed directly
    if (/^[0-9a-f-]{36}$/i.test(url)) return url
    return null
  }
}

export function ScanPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const [status, setStatus] = useState<'idle' | 'requesting' | 'scanning' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualId, setManualId] = useState('')

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  async function startScanning() {
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('scanning')

      const hasBarcodeDetector = typeof (window as any).BarcodeDetector !== 'undefined'

      if (hasBarcodeDetector) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        function scanNative() {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(scanNative)
            return
          }
          detector.detect(videoRef.current).then((codes: any[]) => {
            if (codes.length > 0) {
              handleDetected(codes[0].rawValue, stream)
            } else {
              animFrameRef.current = requestAnimationFrame(scanNative)
            }
          }).catch(() => {
            animFrameRef.current = requestAnimationFrame(scanNative)
          })
        }
        scanNative()
      } else {
        // jsQR fallback: capture frames via canvas
        function scanJsQR() {
          const video = videoRef.current
          const canvas = canvasRef.current
          if (!video || !canvas || video.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(scanJsQR)
            return
          }
          canvas.width  = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) { animFrameRef.current = requestAnimationFrame(scanJsQR); return }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
          if (code?.data) {
            handleDetected(code.data, stream)
          } else {
            animFrameRef.current = requestAnimationFrame(scanJsQR)
          }
        }
        scanJsQR()
      }
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? "Accès à la caméra refusé. Autorisez-la dans les paramètres du navigateur."
          : "Impossible d'accéder à la caméra."
      )
      setStatus('error')
    }
  }

  function handleDetected(rawValue: string, stream: MediaStream) {
    const equipmentId = extractEquipmentId(rawValue)
    if (equipmentId) {
      setStatus('success')
      stream.getTracks().forEach((t) => t.stop())
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setTimeout(() => navigate(passportPath(profile?.role, equipmentId)), 600)
    } else {
      if (animFrameRef.current) animFrameRef.current = requestAnimationFrame(() => {})
    }
  }

  function stopScanning() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setStatus('idle')
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = manualId.trim()
    if (!trimmed) return
    navigate(passportPath(profile?.role, trimmed))
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
        <canvas ref={canvasRef} className="hidden" />

        {(status === 'scanning' || status === 'success') ? (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
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
                <p className="text-sm text-muted-foreground text-center">Prêt à scanner</p>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle size={32} className="text-destructive" />
                <p className="text-sm text-destructive text-center">{errorMsg}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Boutons caméra */}
      <div className="flex gap-3 max-w-sm mx-auto">
        {status === 'scanning' ? (
          <button onClick={stopScanning}
            className="flex-1 px-4 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Arrêter
          </button>
        ) : status !== 'requesting' && status !== 'success' ? (
          <button onClick={startScanning}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
            <Camera size={18} />
            Démarrer le scanner
          </button>
        ) : null}
      </div>

      {/* Saisie manuelle */}
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
          <button type="submit" disabled={!manualId.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60">
            Aller
          </button>
        </form>
      </div>

      <div className="max-w-sm mx-auto rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Identification des équipements</p>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <QrCode size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-foreground">QR Code</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">Principal</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Compatible tous navigateurs. Chaque équipement génère son QR unique depuis son passeport.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
