// =============================================================
// InterventionDetailPage — Détail complet d'une intervention
//
// Rôles :
//   Admin      → vue lecture + annulation
//   Technicien → démarrer / rédiger rapport / clôturer
//   Entreprise → code validation + signature → PDF
// =============================================================
import { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, AlertTriangle, Play, PenLine, CheckCircle2,
  Camera, Loader2, Download, Ban, Wrench, Monitor
} from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import jsPDF from 'jspdf'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import {
  useInterventionDetail,
  useUpdateInterventionStatus,
  useSignIntervention,
  uploadInterventionPhoto,
  uploadAndSavePdf,
} from '../hooks/useInterventions'

// Compat interop: selon le build, react-signature-canvas peut être exposé sur .default
const SignatureCanvasComponent = (SignatureCanvas as any)?.default ?? SignatureCanvas

// ----- Helpers visuels -----

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  en_cours: 'En cours',
  en_attente_validation: 'En attente de validation',
  cloturee: 'Clôturée',
  annulee: 'Annulée',
}

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  en_cours: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  en_attente_validation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  cloturee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  annulee: 'bg-muted text-muted-foreground',
}

const URGENCY_LABEL: Record<string, string> = {
  faible: 'Faible', moyenne: 'Moyenne', critique: 'Critique',
}

const URGENCY_CLASS: Record<string, string> = {
  faible: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  moyenne: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  critique: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ----- Génération du PDF -----

function generateInterventionPdf(
  intervention: any,
  signatureDataUrl: string,
  equipmentNames: string[],
  companyName: string,
): Blob {
  const doc = new jsPDF()
  const M = 20
  let y = M

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text("Compte Rendu d'Intervention", 105, y, { align: 'center' })
  y += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text('IT-Access — SKYRAN GROUP BÉNIN', 105, y, { align: 'center' })
  y += 8
  doc.setTextColor(0)

  doc.setDrawColor(200)
  doc.line(M, y, 190, y)
  y += 8

  // Bloc d'information
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Informations générales', M, y)
  y += 7

  const rows: [string, string][] = [
    ['Entreprise :', companyName],
    ['Titre :', intervention.title],
    ['Urgence :', URGENCY_LABEL[intervention.urgency] ?? intervention.urgency],
    ['Créée le :', formatDate(intervention.created_at)],
    ...(intervention.started_at ? [['Démarrée le :', formatDate(intervention.started_at)] as [string, string]] : []),
    ['Signée le :', formatDate(intervention.signed_at ?? new Date().toISOString())],
  ]

  doc.setFontSize(9)
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold')
    doc.text(label, M, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, M + 38, y)
    y += 6
  }
  y += 3

  // Équipements
  if (equipmentNames.length) {
    doc.setDrawColor(200)
    doc.line(M, y, 190, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Équipements concernés', M, y)
    y += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    for (const name of equipmentNames) {
      doc.text(`• ${name}`, M + 3, y)
      y += 5
    }
    y += 3
  }

  // Description
  doc.setDrawColor(200)
  doc.line(M, y, 190, y)
  y += 7
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', M, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const descLines = doc.splitTextToSize(intervention.description, 165)
  doc.text(descLines, M, y)
  y += descLines.length * 5 + 3

  // Rapport
  if (intervention.work_report) {
    doc.line(M, y, 190, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text("Rapport d'intervention", M, y)
    y += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const reportLines = doc.splitTextToSize(intervention.work_report, 165)
    doc.text(reportLines, M, y)
    y += reportLines.length * 5 + 3
  }

  // Pièces
  if (intervention.parts_replaced) {
    doc.line(M, y, 190, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Pièces remplacées', M, y)
    y += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const partsLines = doc.splitTextToSize(intervention.parts_replaced, 165)
    doc.text(partsLines, M, y)
    y += partsLines.length * 5 + 3
  }

  // Signature — nouvelle page si besoin
  if (y > 220) { doc.addPage(); y = M }
  doc.line(M, y, 190, y)
  y += 7
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Signature du client', M, y)
  y += 6

  try {
    doc.addImage(signatureDataUrl, 'PNG', M, y, 80, 36)
  } catch {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('[Signature électronique apposée]', M, y + 15)
  }

  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text('Document généré par IT-Access — SKYRAN GROUP BÉNIN', 105, 287, { align: 'center' })

  return doc.output('blob')
}

// ----- Page principale -----

export function InterventionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const role = profile?.role

  const { data: intervention, isLoading } = useInterventionDetail(id)
  const updateStatus = useUpdateInterventionStatus()
  const signMutation = useSignIntervention()

  // Technicien : état du rapport
  const [workReport, setWorkReport] = useState('')
  const [partsReplaced, setPartsReplaced] = useState('')
  const [techPhotos, setTechPhotos] = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)

  // Entreprise : état signature
  const [validationCode, setValidationCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [sigError, setSigError] = useState(false)
  const [signing, setSigning] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const sigCanvasRef = useRef<any>(null)

  // Admin : état annulation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Noms des équipements
  const { data: equipmentList = [] } = useQuery({
    queryKey: ['equipment-names', intervention?.equipment_ids],
    queryFn: async () => {
      if (!intervention?.equipment_ids?.length) return []
      const { data } = await supabase
        .from('equipment')
        .select('id, name')
        .in('id', intervention.equipment_ids)
      return (data ?? []) as { id: string; name: string }[]
    },
    enabled: !!(intervention?.equipment_ids?.length),
  })

  // Pré-remplir le rapport quand les données arrivent
  useEffect(() => {
    if (intervention) {
      setWorkReport(intervention.work_report ?? '')
      setPartsReplaced(intervention.parts_replaced ?? '')
      setTechPhotos(intervention.photos ?? [])
    }
  }, [intervention?.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-48 p-8">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!intervention) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Intervention introuvable.
      </div>
    )
  }

  const status = intervention.status
  const companyName = (intervention as any).companies?.company_name ?? '—'
  const validationCodeStored = (intervention as any).companies?.validation_code ?? ''
  const equipmentNames = equipmentList.map((e) => e.name)

  // ----- Actions Technicien -----

  async function handleStart() {
    await updateStatus.mutateAsync({
      id: id!,
      status: 'en_cours',
      extra: { started_at: new Date().toISOString() },
    })
  }

  async function handleSaveReport() {
    setSaving(true)
    await supabase
      .from('interventions')
      .update({ work_report: workReport, parts_replaced: partsReplaced, photos: techPhotos })
      .eq('id', id!)
    setSaving(false)
  }

  async function handleClose() {
    if (!workReport.trim()) return
    setClosing(true)
    try {
      // Passer rapport + photos dans le même update que le status
      // → 1 seule requête + déclenche la notification entreprise
      await updateStatus.mutateAsync({
        id: id!,
        status: 'en_attente_validation',
        extra: {
          work_report: workReport,
          parts_replaced: partsReplaced,
          photos: techPhotos,
          closed_at: new Date().toISOString(),
        },
      })
    } finally {
      setClosing(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (techPhotos.length + files.length > 3) return
    setPhotoUploading(true)
    try {
      const urls = await Promise.all(
        files.map((f) => uploadInterventionPhoto(f, id!))
      )
      setTechPhotos((prev) => [...prev, ...urls])
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  // ----- Action Entreprise : signer -----

  async function handleSign() {
    setCodeError(false)
    setSigError(false)

    if (validationCode !== validationCodeStored) {
      setCodeError(true)
      return
    }

    const sig = sigCanvasRef.current
    if (!sig || sig.isEmpty()) {
      setSigError(true)
      return
    }

    setSigning(true)
    try {
      const dataUrl = sig.toDataURL('image/png')
      await signMutation.mutateAsync({
        id: id!,
        signatureDataUrl: dataUrl,
        equipmentIds: intervention?.equipment_ids ?? [],
      })

      // Génération et upload du PDF
      setPdfGenerating(true)
      try {
        const pdfBlob = generateInterventionPdf(
          { ...intervention!, signed_at: new Date().toISOString() },
          dataUrl,
          equipmentNames,
          companyName,
        )
        await uploadAndSavePdf(id!, pdfBlob)

        // Téléchargement immédiat
        const link = document.createElement('a')
        link.href = URL.createObjectURL(pdfBlob)
        link.download = `CR-Intervention-${id!.slice(0, 8)}.pdf`
        link.click()
      } finally {
        setPdfGenerating(false)
      }
    } finally {
      setSigning(false)
    }
  }

  // ----- Action Admin : annuler -----

  async function handleCancel() {
    await updateStatus.mutateAsync({ id: id!, status: 'annulee' })
    setShowCancelConfirm(false)
  }

  // ----- Télécharger PDF existant -----

  function handleDownloadPdf() {
    if (!intervention?.pdf_url) return
    const link = document.createElement('a')
    link.href = intervention.pdf_url
    link.target = '_blank'
    link.download = `CR-Intervention-${id!.slice(0, 8)}.pdf`
    link.click()
  }

  // ----- Back URL selon rôle -----
  const backUrl =
    role === 'admin' ? '/admin/interventions' :
    role === 'technicien' ? '/technicien/interventions' :
    '/entreprise/interventions'

  return (
    <div className="max-w-2xl mx-auto space-y-5 p-4 md:p-6 page-transition">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(backUrl)}
          className="p-2 rounded-lg hover:bg-accent transition-colors flex-shrink-0 mt-0.5"
        >
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground leading-tight">{intervention.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{companyName}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_CLASS[intervention.urgency]}`}>
              {URGENCY_LABEL[intervention.urgency]}
            </span>
            {intervention.urgency === 'critique' && (
              <AlertTriangle size={14} className="text-red-500" />
            )}
          </div>
        </div>
      </div>

      {/* Équipements concernés */}
      {equipmentList.length > 0 && (
        <section className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Équipements concernés</h2>
          <div className="space-y-1.5">
            {equipmentList.map((eq) => (
              <div key={eq.id} className="flex items-center gap-2 text-sm text-foreground">
                <Monitor size={14} className="text-muted-foreground flex-shrink-0" />
                <span>{eq.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      <section className="bg-card border border-border rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Description</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{intervention.description}</p>
        <div className="pt-1 grid grid-cols-2 gap-x-4 gap-y-1">
          <InfoRow label="Créée"    value={formatDate(intervention.created_at)} />
          {intervention.started_at && <InfoRow label="Démarrée" value={formatDate(intervention.started_at)} />}
          {intervention.closed_at  && <InfoRow label="Clôturée" value={formatDate(intervention.closed_at)} />}
          {intervention.signed_at  && <InfoRow label="Signée"   value={formatDate(intervention.signed_at)} />}
        </div>
      </section>

      {/* ——— Section Technicien ——— */}
      {role === 'technicien' && (
        <>
          {/* Démarrer */}
          {status === 'active' && (
            <section className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{"Démarrer l'intervention"}</h2>
              <p className="text-sm text-muted-foreground">
                {"Cliquez sur Démarrer pour indiquer que vous êtes en cours d'intervention."}
              </p>
              <button
                onClick={handleStart}
                disabled={updateStatus.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {updateStatus.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {"Démarrer l'intervention"}
              </button>
            </section>
          )}

          {/* Rapport de travail */}
          {(status === 'en_cours' || status === 'en_attente_validation' || status === 'cloturee') && (
            <section className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Wrench size={15} />
                {"Rapport d'intervention"}
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase">Travaux effectués</label>
                <textarea
                  value={workReport}
                  onChange={(e) => setWorkReport(e.target.value)}
                  rows={4}
                  disabled={status !== 'en_cours'}
                  placeholder="Décrivez les travaux effectués…"
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase">Pièces remplacées</label>
                <textarea
                  value={partsReplaced}
                  onChange={(e) => setPartsReplaced(e.target.value)}
                  rows={2}
                  disabled={status !== 'en_cours'}
                  placeholder="Lister les pièces remplacées (optionnel)…"
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
                />
              </div>

              {/* Photos */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase">Photos ({techPhotos.length}/3)</label>
                <div className="flex gap-2 flex-wrap">
                  {techPhotos.map((url, i) => (
                    <div key={i} className="relative w-20 h-20">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-border" />
                      {status === 'en_cours' && (
                        <button
                          type="button"
                          onClick={() => setTechPhotos((p) => p.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {status === 'en_cours' && techPhotos.length < 3 && (
                    <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      {photoUploading
                        ? <Loader2 size={16} className="animate-spin text-muted-foreground" />
                        : <Camera size={16} className="text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground mt-1">Photo</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
                    </label>
                  )}
                </div>
              </div>

              {/* Boutons actions (seulement si en_cours) */}
              {status === 'en_cours' && (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleSaveReport}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={closing || !workReport.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    {closing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Clôturer
                  </button>
                </div>
              )}

              {status === 'en_attente_validation' && (
                <p className="text-xs text-purple-600 dark:text-purple-400 text-center pt-1">
                  Intervention transmise — en attente de signature client
                </p>
              )}
            </section>
          )}
        </>
      )}

      {/* ——— Section Entreprise : Signature ——— */}
      {role === 'entreprise' && status === 'en_attente_validation' && (
        <section className="bg-card border border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <PenLine size={15} className="text-purple-500" />
            {"Valider et signer l'intervention"}
          </h2>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-xs text-purple-700 dark:text-purple-300">
            Votre code de validation se trouve dans votre espace Profil. Saisissez-le et apposez votre signature pour clôturer.
          </div>

          {/* Code de validation */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Code de validation</label>
            <input
              type="text"
              value={validationCode}
              onChange={(e) => { setValidationCode(e.target.value); setCodeError(false) }}
              placeholder="Votre code unique…"
              className={`w-full px-3 py-2.5 bg-background border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring ${
                codeError ? 'border-destructive focus:ring-destructive' : 'border-input'
              }`}
            />
            {codeError && (
              <p className="text-xs text-destructive">Code incorrect. Vérifiez dans votre profil.</p>
            )}
          </div>

          {/* Canvas de signature */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Signature</label>
              <button
                type="button"
                onClick={() => sigCanvasRef.current?.clear()}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Effacer
              </button>
            </div>
            <div className={`border-2 rounded-lg overflow-hidden ${sigError ? 'border-destructive' : 'border-input'}`}>
              <SignatureCanvasComponent
                ref={sigCanvasRef}
                penColor="#1d1d1f"
                canvasProps={{
                  className: 'w-full',
                  style: { height: 140, background: '#f8f8f8' },
                }}
              />
            </div>
            {sigError && (
              <p className="text-xs text-destructive">Veuillez apposer votre signature.</p>
            )}
          </div>

          <button
            onClick={handleSign}
            disabled={signing || signMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {signing
              ? <><Loader2 size={16} className="animate-spin" /> {pdfGenerating ? 'Génération PDF…' : 'Signature en cours…'}</>
              : <><CheckCircle2 size={16} /> {"Signer et clôturer l'intervention"}</>}
          </button>
        </section>
      )}

      {/* Rapport en lecture seule (pour entreprise) */}
      {role === 'entreprise' && (status === 'cloturee' || status === 'en_attente_validation') && intervention.work_report && (
        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Rapport du technicien</h2>
          <p className="text-sm text-foreground leading-relaxed">{intervention.work_report}</p>
          {intervention.parts_replaced && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Pièces remplacées</p>
              <p className="text-sm text-foreground">{intervention.parts_replaced}</p>
            </div>
          )}
        </section>
      )}

      {/* PDF disponible après clôture */}
      {status === 'cloturee' && (
        <section className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" />
            <h2 className="text-sm font-semibold text-green-700 dark:text-green-400">Intervention clôturée</h2>
          </div>
          {intervention.signature_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Signature client</p>
              <img
                src={intervention.signature_url}
                alt="Signature"
                className="h-16 border border-border rounded-lg bg-white p-1"
              />
            </div>
          )}
          {intervention.pdf_url && (
            <button
              onClick={handleDownloadPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
            >
              <Download size={15} />
              Télécharger le compte rendu PDF
            </button>
          )}
        </section>
      )}

      {/* ——— Actions Admin ——— */}
      {role === 'admin' && (
        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Actions admin</h2>

          {/* Rapport (lecture seule) */}
          {intervention.work_report && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Rapport technicien</p>
              <p className="text-sm text-foreground">{intervention.work_report}</p>
              {intervention.parts_replaced && (
                <p className="text-xs text-muted-foreground mt-1">Pièces : {intervention.parts_replaced}</p>
              )}
            </div>
          )}

          {status !== 'cloturee' && status !== 'annulee' && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-destructive text-destructive rounded-lg text-sm hover:bg-destructive/10 transition-colors"
            >
              <Ban size={15} />
              {"Annuler l'intervention"}
            </button>
          )}

          {intervention.pdf_url && (
            <button
              onClick={handleDownloadPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-accent transition-colors"
            >
              <Download size={15} />
              Télécharger le compte rendu PDF
            </button>
          )}
        </section>
      )}

      {/* Modal annulation (Admin) */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-foreground">{"Annuler l'intervention ?"}</h3>
            <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent"
              >
                Retour
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  )
}
