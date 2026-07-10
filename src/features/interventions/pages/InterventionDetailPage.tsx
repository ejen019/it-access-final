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
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  ArrowLeft, AlertTriangle, Play, PenLine, CheckCircle2,
  Camera, Loader2, Download, Ban, Wrench, Monitor, Users,
} from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import jsPDF from 'jspdf'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import {
  useDetailIntervention,
  useChangerStatutIntervention,
  useSignerIntervention,
  useValiderIntervention,
  uploadPhotoIntervention,
  uploadEtSauvegarderPdf,
} from '../hooks/useInterventions'

// Compat interop: selon le build, react-signature-canvas peut être exposé sur .default
const SignatureCanvasComponent = (SignatureCanvas as any)?.default ?? SignatureCanvas

// ----- Helpers visuels -----

const STATUS_LABEL: Record<string, string> = {
  en_attente: 'En attente de validation',
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'En attente de signature',
  signee: 'Clôturée',
  annulee: 'Annulée',
}

const STATUS_CLASS: Record<string, string> = {
  en_attente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  planifiee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  en_cours: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  terminee: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  signee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
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

function isEnAttente(inv: any): boolean {
  return inv?.statut === 'planifiee' && (!inv?.interventions_techniciens || inv.interventions_techniciens.length === 0)
}
function displayStatut(inv: any): string {
  return isEnAttente(inv) ? 'en_attente' : inv?.statut
}

async function fetchAllTechniciens() {
  const { data, error } = await supabase
    .from('techniciens')
    .select('id, specialite, utilisateurs(nom, prenom, est_actif, compte_valide)')
  if (error) throw error
  return (data ?? [])
    .filter((t: any) => t.utilisateurs?.est_actif !== false && t.utilisateurs?.compte_valide !== false)
    .map((t: any) => ({
      techId: t.id,
      name: `${t.utilisateurs?.prenom ?? ''} ${t.utilisateurs?.nom ?? ''}`.trim() || 'Technicien',
      specialite: t.specialite as string | null,
    }))
}

function ValiderModal({ interventionId, clientId, titre, onClose }: {
  interventionId: string
  clientId: string
  titre: string
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const mutation = useValiderIntervention()

  const { data: techs = [], isLoading } = useQuery({
    queryKey: ['all-techs'],
    queryFn: fetchAllTechniciens,
  })

  function toggle(id: string) {
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  async function handleSubmit() {
    await mutation.mutateAsync({ interventionId, technicienIds: selected, titre, clientId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm leading-tight">Valider & Planifier</h2>
            <p className="text-xs text-muted-foreground">Affecter un ou plusieurs techniciens</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground">
            Sélectionnez au moins un technicien pour valider ce signalement de panne. Le client et le technicien seront notifiés.
          </p>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            </div>
          ) : (techs as any[]).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              Aucun technicien actif disponible.
            </p>
          ) : (
            <div className="max-h-52 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
              {(techs as any[]).map(t => (
                <label key={t.techId} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-accent rounded-lg px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(t.techId)}
                    onChange={() => toggle(t.techId)}
                    className="rounded"
                  />
                  <span className="text-foreground font-medium">{t.name}</span>
                  {t.specialite && <span className="text-muted-foreground text-xs">· {t.specialite}</span>}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.length === 0 || mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
          >
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Valider
          </button>
        </div>
      </div>
    </div>
  )
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

  const rapport = intervention.rapports_intervention?.[0]
  const rows: [string, string][] = [
    ['Entreprise :', companyName],
    ['Titre :', intervention.titre],
    ['Urgence :', URGENCY_LABEL[intervention.urgence] ?? intervention.urgence],
    ['Créée le :', formatDate(intervention.cree_le)],
    ['Signée le :', formatDate(intervention.signee_le ?? new Date().toISOString())],
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
  if (rapport?.rapport_travaux) {
    doc.line(M, y, 190, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text("Rapport d'intervention", M, y)
    y += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const reportLines = doc.splitTextToSize(rapport.rapport_travaux, 165)
    doc.text(reportLines, M, y)
    y += reportLines.length * 5 + 3
  }

  // Pièces
  if (rapport?.pieces_remplacees) {
    doc.line(M, y, 190, y)
    y += 7
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Pièces remplacées', M, y)
    y += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const partsLines = doc.splitTextToSize(rapport.pieces_remplacees, 165)
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
  // Un admin/super_admin peut aussi réaliser les actions d'un technicien.
  const canIntervene = role === 'technicien' || role === 'admin' || role === 'super_admin'

  const { data: intervention, isLoading } = useDetailIntervention(id)
  const queryClient = useQueryClient()
  const updateStatus = useChangerStatutIntervention()
  const signMutation = useSignerIntervention()

  const [workReport, setWorkReport] = useState('')
  const [partsReplaced, setPartsReplaced] = useState('')
  const [techPhotos, setTechPhotos] = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [notesComplementaires, setNotesComplementaires] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const [validationCode, setValidationCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [sigError, setSigError] = useState(false)
  const [signing, setSigning] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const sigCanvasRef = useRef<any>(null)

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showValiderModal, setShowValiderModal] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const rapport = (intervention as any)?.rapports_intervention?.[0]

  // Affectation du technicien connecté sur cette intervention (accepter/refuser)
  const myAssignment = ((intervention as any)?.interventions_techniciens ?? [])
    .find((t: any) => t.techniciens?.utilisateur_id === profile?.id)
  const someRefused = ((intervention as any)?.interventions_techniciens ?? [])
    .some((t: any) => t.statut_affectation === 'refuse')

  async function handleAcceptAssignment() {
    if (!myAssignment) return
    await supabase.from('interventions_techniciens')
      .update({ statut_affectation: 'accepte' })
      .eq('intervention_id', id!).eq('technicien_id', myAssignment.technicien_id)
    queryClient.invalidateQueries({ queryKey: ['intervention-detail', id] })
  }

  async function handleRefuseAssignment() {
    if (!myAssignment) return
    await supabase.from('interventions_techniciens')
      .update({ statut_affectation: 'refuse' })
      .eq('intervention_id', id!).eq('technicien_id', myAssignment.technicien_id)
    const { data: admins } = await supabase.from('utilisateurs').select('id').in('role', ['admin', 'super_admin'])
    if (admins?.length) {
      await supabase.from('notifications').insert(admins.map((a: any) => ({
        utilisateur_id: a.id, type: 'intervention_refusee', titre: 'Intervention refusée',
        corps: `Un technicien a refusé « ${(intervention as any).titre} ». À réaffecter.`,
        lien: `/admin/interventions/${id}`,
      })))
    }
    queryClient.invalidateQueries({ queryKey: ['intervention-detail', id] })
  }

  // Pré-remplir le rapport
  useEffect(() => {
    if (intervention) {
      setWorkReport(rapport?.rapport_travaux ?? '')
      setPartsReplaced(rapport?.pieces_remplacees ?? '')
      setTechPhotos((intervention as any).photos ?? [])
      setNotesComplementaires((rapport as any)?.notes_complementaires ?? '')
    }
  }, [(intervention as any)?.id])

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

  const statut = (intervention as any).statut
  const enAttente = isEnAttente(intervention)
  const ds = displayStatut(intervention)
  const companyName = (intervention as any).clients?.nom_entreprise ?? '—'
  const clientId = (intervention as any).clients?.id ?? ''
  const validationCodeStored = (intervention as any).clients?.code_signature ?? ''
  const equipmentNames = ((intervention as any).interventions_equipements ?? [])
    .map((ie: any) => ie.equipements?.nom).filter(Boolean)

  // ----- Actions Technicien -----

  async function handleStart() {
    setActionError(null)
    try {
      await updateStatus.mutateAsync({ id: id!, statut: 'en_cours' })
    } catch (e: any) {
      setActionError(e?.message ?? "Erreur lors du démarrage. Réessayez.")
    }
  }

  async function handleSaveReport() {
    setSaving(true)
    await supabase
      .from('rapports_intervention')
      .upsert({ intervention_id: id!, rapport_travaux: workReport, pieces_remplacees: partsReplaced },
        { onConflict: 'intervention_id' })
    await supabase.from('interventions').update({ photos: techPhotos }).eq('id', id!)
    setSaving(false)
  }

  async function handleClose() {
    if (!workReport.trim()) return
    setClosing(true)
    try {
      await supabase.from('rapports_intervention').upsert(
        { intervention_id: id!, rapport_travaux: workReport, pieces_remplacees: partsReplaced, date_fin: new Date().toISOString() },
        { onConflict: 'intervention_id' }
      )
      await supabase.from('interventions').update({ photos: techPhotos }).eq('id', id!)
      await updateStatus.mutateAsync({ id: id!, statut: 'terminee' })
    } finally {
      setClosing(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (techPhotos.length + files.length > 3) return
    setPhotoUploading(true)
    try {
      const urls = await Promise.all(files.map((f) => uploadPhotoIntervention(f, id!)))
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
      const equipementIds = ((intervention as any).interventions_equipements ?? []).map((ie: any) => ie.equipement_id)
      await signMutation.mutateAsync({ id: id!, signatureDataUrl: dataUrl, equipementIds })

      // Génération et upload du PDF
      setPdfGenerating(true)
      try {
        const pdfBlob = generateInterventionPdf(
          { ...intervention!, rapport, signee_le: new Date().toISOString() },
          dataUrl,
          equipmentNames,
          companyName,
        )
        await uploadEtSauvegarderPdf(id!, pdfBlob)

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
    // Si c'est un signalement de panne (en attente), remettre l'équipement en service
    if (enAttente && intervention) {
      const equipIds = (intervention as any).interventions_equipements
        ?.map((ie: any) => ie.equipement_id).filter(Boolean) ?? []
      if (equipIds.length > 0) {
        await supabase.from('equipements').update({ etat: 'operationnel' }).in('id', equipIds)
      }
    }
    await updateStatus.mutateAsync({ id: id!, statut: 'annulee' })
    setShowCancelConfirm(false)
  }

  // ----- Télécharger PDF existant -----

  function handleDownloadPdf() {
    const pdfUrl = rapport?.url_pdf
    if (!pdfUrl) return
    const link = document.createElement('a')
    link.href = pdfUrl
    link.target = '_blank'
    link.download = `CR-Intervention-${id!.slice(0, 8)}.pdf`
    link.click()
  }

  // ----- Notes complémentaires (technicien, après signature) -----
  async function handleSaveNotes() {
    setSavingNotes(true)
    try {
      await supabase.from('rapports_intervention')
        .upsert({ intervention_id: id!, notes_complementaires: notesComplementaires }, { onConflict: 'intervention_id' })
    } finally {
      setSavingNotes(false)
    }
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
          <h1 className="text-xl font-bold text-foreground leading-tight">{(intervention as any).titre}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{companyName}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[ds] ?? ''}`}>
              {STATUS_LABEL[ds]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_CLASS[(intervention as any).urgence]}`}>
              {URGENCY_LABEL[(intervention as any).urgence]}
            </span>
            {(intervention as any).urgence === 'critique' && (
              <AlertTriangle size={14} className="text-red-500" />
            )}
          </div>
        </div>
      </div>

      {/* Équipements concernés */}
      {equipmentNames.length > 0 && (
        <section className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Équipements concernés</h2>
          <div className="space-y-1.5">
            {equipmentNames.map((nom: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                <Monitor size={14} className="text-muted-foreground flex-shrink-0" />
                <span>{nom}</span>
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
          <InfoRow label="Créée"  value={formatDate((intervention as any).cree_le)} />
          {(intervention as any).signee_le && <InfoRow label="Signée" value={formatDate((intervention as any).signee_le)} />}
        </div>
      </section>

      {/* ——— Bannière En attente (côté client) ——— */}
      {role === 'client' && enAttente && (
        <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Votre signalement est en attente de validation par un administrateur. Vous serez notifié dès qu'un technicien sera affecté.
            </p>
          </div>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-destructive/40 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors"
          >
            <Ban size={15} />
            Annuler mon signalement
          </button>
        </section>
      )}

      {/* ——— Technicien : accepter / refuser l'affectation ——— */}
      {role === 'technicien' && myAssignment && myAssignment.statut_affectation === 'en_attente' && statut === 'planifiee' && (
        <section className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Intervention à accepter</h2>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Cette intervention vous a été affectée. Acceptez-la pour pouvoir la démarrer, ou refusez-la (un administrateur la réaffectera).
          </p>
          <div className="flex gap-3">
            <button onClick={handleAcceptAssignment}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
              <CheckCircle2 size={15} /> Accepter
            </button>
            <button onClick={handleRefuseAssignment}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-destructive text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors">
              <Ban size={15} /> Refuser
            </button>
          </div>
        </section>
      )}
      {role === 'technicien' && myAssignment && myAssignment.statut_affectation === 'refuse' && (
        <section className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground">
          Vous avez refusé cette intervention. Elle est en attente de réaffectation par un administrateur.
        </section>
      )}

      {/* ——— Admin : un technicien a refusé ——— */}
      {(role === 'admin' || role === 'super_admin') && someRefused && statut !== 'signee' && statut !== 'annulee' && (
        <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">Intervention refusée par un technicien</h2>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">Vous pouvez affecter un autre technicien.</p>
          <button onClick={() => setShowValiderModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Users size={15} /> Réaffecter
          </button>
        </section>
      )}

      {/* ═══ VUE UNIFIÉE — INTERVENTION CLÔTURÉE (signee) ═══ */}
      {statut === 'signee' && (
        <section className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
            <h2 className="text-sm font-semibold text-green-700 dark:text-green-400">Intervention clôturée</h2>
          </div>

          {/* Rapport du technicien */}
          {rapport?.rapport_travaux && (
            <div className="bg-card border border-border rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Travaux effectués</p>
              <p className="text-sm text-foreground leading-relaxed">{rapport.rapport_travaux}</p>
              {rapport.pieces_remplacees && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Pièces remplacées</p>
                  <p className="text-sm text-foreground">{rapport.pieces_remplacees}</p>
                </div>
              )}
              {(rapport as any).notes_complementaires && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes complémentaires</p>
                  <p className="text-sm text-foreground">{(rapport as any).notes_complementaires}</p>
                </div>
              )}
            </div>
          )}

          {/* Photos d'intervention */}
          {((intervention as any).photos ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Photos</p>
              <div className="flex gap-2 flex-wrap">
                {((intervention as any).photos as string[]).map((url, i) => (
                  <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-border" />
                ))}
              </div>
            </div>
          )}

          {/* Signature — affichage selon le rôle */}
          {rapport?.url_signature && role === 'client' && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Votre signature</p>
              <img
                src={rapport.url_signature}
                alt="Signature client"
                className="max-h-28 border border-border rounded-xl bg-white p-2 shadow-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Signature électronique apposée le {formatDate((intervention as any).signee_le ?? rapport.date_fin)}
              </p>
            </div>
          )}
          {rapport?.url_signature && (role === 'admin' || role === 'super_admin') && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Signature client</p>
              <img src={rapport.url_signature} alt="Signature" className="h-16 border border-border rounded-lg bg-white p-1" />
            </div>
          )}

          {/* Télécharger PDF */}
          {rapport?.url_pdf && (
            <button onClick={handleDownloadPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors">
              <Download size={15} />
              Télécharger le compte rendu PDF
            </button>
          )}

          {/* Notes complémentaires — technicien uniquement */}
          {(role === 'technicien' || role === 'admin' || role === 'super_admin') && (
            <div className="border-t border-green-200 dark:border-green-800 pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {role === 'technicien' ? 'Ajouter des informations complémentaires' : 'Notes complémentaires (technicien)'}
              </p>
              <textarea
                value={notesComplementaires}
                onChange={(e) => setNotesComplementaires(e.target.value)}
                rows={3}
                readOnly={role !== 'technicien'}
                placeholder={role === 'technicien' ? 'Observations post-intervention, recommandations…' : '—'}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60 read-only:cursor-default"
              />
              {role === 'technicien' && (
                <button onClick={handleSaveNotes} disabled={savingNotes}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
                  {savingNotes ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Enregistrer
                </button>
              )}
            </div>
          )}

          {/* Signaler une nouvelle panne — client uniquement */}
          {role === 'client' && (() => {
            const equipId = ((intervention as any).interventions_equipements ?? [])[0]?.equipement_id
            return equipId ? (
              <div className="border-t border-green-200 dark:border-green-800 pt-4">
                <button onClick={() => navigate(`/entreprise/parc/${equipId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
                  Signaler une nouvelle panne sur cet équipement
                </button>
              </div>
            ) : null
          })()}
        </section>
      )}

      {/* ——— Section Technicien (aussi accessible à l'admin) ——— */}
      {canIntervene && statut !== 'signee' && !(role === 'technicien' && myAssignment && myAssignment.statut_affectation !== 'accepte') && (
        <>
          {/* Démarrer — masqué pour admin si aucun technicien assigné (en attente de validation) */}
          {statut === 'planifiee' && !(enAttente && (role === 'admin' || role === 'super_admin')) && (
            <section className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{"Démarrer l'intervention"}</h2>
              <p className="text-sm text-muted-foreground">
                {"Cliquez sur Démarrer pour indiquer que vous êtes en cours d'intervention."}
              </p>
              {actionError && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}
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
          {(statut === 'en_cours' || statut === 'terminee') && (
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
                  disabled={statut !== 'en_cours'}
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
                  disabled={statut !== 'en_cours'}
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
                      {statut === 'en_cours' && (
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
                  {statut === 'en_cours' && techPhotos.length < 3 && (
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
              {statut === 'en_cours' && (
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

              {statut === 'terminee' && (
                <p className="text-xs text-purple-600 dark:text-purple-400 text-center pt-1">
                  Intervention transmise — en attente de signature client
                </p>
              )}
            </section>
          )}
        </>
      )}

      {/* ——— Section Entreprise : Signature ——— */}
      {role === 'client' && statut === 'terminee' && (
        <section className="bg-card border border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <PenLine size={15} className="text-purple-500" />
            {"Valider et signer l'intervention"}
          </h2>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-xs text-purple-700 dark:text-purple-300">
            Votre code de validation se trouve dans votre espace Profil. Saisissez-le et apposez votre signature pour clôturer.
          </div>

          {/* Rapport du technicien en lecture seule avant signature */}
          {rapport?.rapport_travaux && (
            <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rapport du technicien</p>
              <p className="text-sm text-foreground leading-relaxed">{rapport.rapport_travaux}</p>
              {rapport.pieces_remplacees && (
                <div>
                  <p className="text-xs text-muted-foreground mt-1">Pièces remplacées :</p>
                  <p className="text-sm text-foreground">{rapport.pieces_remplacees}</p>
                </div>
              )}
            </div>
          )}

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

      {/* ——— Actions Admin ——— */}
      {(role === 'admin' || role === 'super_admin') && (
        <>
          {/* Bloc En attente : valider ou annuler le signalement */}
          {enAttente && (
            <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">En attente de validation</h2>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Ce signalement de panne n'a pas encore de technicien assigné. Validez-le pour planifier l'intervention, ou annulez-le si le signalement est invalide.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowValiderModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <CheckCircle2 size={15} />
                  Valider & Planifier
                </button>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-destructive text-destructive rounded-lg text-sm hover:bg-destructive/10 transition-colors"
                >
                  <Ban size={15} />
                  Annuler le signalement
                </button>
              </div>
            </section>
          )}

          {/* Actions standard (non En attente) */}
          <section className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Actions admin</h2>

            {!enAttente && statut !== 'signee' && statut !== 'annulee' && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-destructive text-destructive rounded-lg text-sm hover:bg-destructive/10 transition-colors"
              >
                <Ban size={15} />
                {"Annuler l'intervention"}
              </button>
            )}

            {rapport?.url_pdf && (
              <button
                onClick={handleDownloadPdf}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-accent transition-colors"
              >
                <Download size={15} />
                Télécharger le compte rendu PDF
              </button>
            )}

            {enAttente && !rapport?.url_pdf && (
              <p className="text-xs text-muted-foreground text-center">Validez le signalement ci-dessus pour accéder aux actions d'intervention.</p>
            )}
          </section>
        </>
      )}

      {/* Modal Valider & Planifier */}
      {showValiderModal && (
        <ValiderModal
          interventionId={id!}
          clientId={clientId}
          titre={(intervention as any).titre}
          onClose={() => setShowValiderModal(false)}
        />
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
