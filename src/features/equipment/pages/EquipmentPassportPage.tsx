// =============================================================
// EquipmentPassportPage — Passeport numérique d'un équipement
//
// Accessible par : Admin, Technicien, Entreprise
// Contient : infos, QR code, photos, documents, historique interventions
// Bouton "Signaler une panne" si rôle = entreprise
// =============================================================
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, QrCode, Printer, FileText, AlertTriangle,
  Calendar, MapPin, Tag, Edit2, Wrench, Download,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { useEquipmentDetail } from '../hooks/useEquipment'
import { generateQRCodeDataUrl, getPassportUrl, printQRCode } from '@/lib/utils/qrcode'
import { EquipmentForm } from '../components/EquipmentForm'
import type { Equipment } from '@/types'

// Historique des interventions liées à cet équipement
async function fetchEquipmentInterventions(equipmentId: string) {
  const { data } = await supabase
    .from('interventions')
    .select('id, title, status, urgency, created_at, closed_at')
    .contains('equipment_ids', [equipmentId])
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

const URGENCY_COLOR: Record<string, string> = {
  faible: 'urgency-faible', moyenne: 'urgency-moyenne', critique: 'urgency-critique',
}

// Modal de signalement de panne
function SignalPanneModal({ equipment, onClose }: { equipment: any; onClose: () => void }) {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<'faible' | 'moyenne' | 'critique'>('moyenne')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    // Récupère les techniciens affectés à l'entreprise (profiles.id via technicians.user_id)
    const { data: assignedTechs } = await supabase
      .from('assignments')
      .select('technicians(user_id)')
      .eq('company_id', equipment.company_id)

    const technicianProfileIds = Array.from(new Set(
      (assignedTechs ?? [])
        .map((t: any) => t.technicians?.user_id as string | undefined)
        .filter((id): id is string => Boolean(id))
    ))

    // Met l'équipement en panne
    await supabase.from('equipment').update({ status: 'en_panne' }).eq('id', equipment.id)

    // Crée une intervention
    const { data: intervention } = await supabase.from('interventions').insert({
      company_id: equipment.company_id,
      equipment_ids: [equipment.id],
      title: `Panne — ${equipment.name}`,
      description,
      urgency,
      status: 'active',
      created_by: profile!.id,
      technician_ids: technicianProfileIds,
      photos: [],
    }).select().single()

    if (intervention) {
      // Notifie les admins ET sudos
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'sudo'])
      if (admins?.length) {
        await supabase.from('notifications').insert(
          admins.map((a: any) => ({
            user_id: a.id,
            type: 'new_intervention' as const,
            title: `Panne signalée — ${equipment.companies?.company_name}`,
            body: `${equipment.name} : ${description.slice(0, 80)}`,
            link: '/admin/interventions',
          }))
        )
      }
      // Notifie les techniciens assignés à l'entreprise
      if (technicianProfileIds.length) {
        await supabase.from('notifications').insert(
          technicianProfileIds.map((uid: string) => ({
            user_id: uid,
            type: 'intervention_assigned' as const,
            title: `Nouvelle panne — ${equipment.name}`,
            body: description.slice(0, 80),
            link: `/technicien/interventions/${intervention.id}`,
          }))
        )
      }
    }

    queryClient.invalidateQueries({ queryKey: ['equipment-detail', equipment.id] })
    queryClient.invalidateQueries({ queryKey: ['equipment', equipment.company_id] })
    setIsLoading(false)
    onClose()
    navigate(profile?.role === 'entreprise' ? '/entreprise/interventions' : '/technicien/interventions')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <h2 className="font-semibold text-foreground">Signaler une panne</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{equipment.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description de la panne *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Décrivez le problème observé…"
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{"Niveau d'urgence"}</label>
            <div className="flex gap-2">
              {(['faible', 'moyenne', 'critique'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                    urgency === u ? URGENCY_COLOR[u] + ' ring-2 ring-current' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium transition-colors">
              {isLoading ? 'Envoi…' : 'Signaler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function EquipmentPassportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showPanne, setShowPanne] = useState(false)

  const { data: equipment, isLoading } = useEquipmentDetail(id)
  const { data: interventions = [] } = useQuery({
    queryKey: ['equipment-interventions', id],
    queryFn: () => fetchEquipmentInterventions(id!),
    enabled: !!id,
  })

  // Génère le QR code au chargement
  useEffect(() => {
    if (id) generateQRCodeDataUrl(id).then(setQrDataUrl)
  }, [id])

  const backLink = {
    sudo: '/sudo/dashboard',
    admin: '/admin/equipements',
    technicien: '/technicien/dashboard',
    entreprise: '/entreprise/parc',
  }[profile?.role ?? 'admin']

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-muted-foreground">Équipement introuvable.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary hover:underline mt-2">
          Retour
        </button>
      </div>
    )
  }

  const canEdit = profile?.role === 'admin' || profile?.role === 'sudo' || profile?.role === 'entreprise'
  const canSignalPanne = profile?.role === 'entreprise' && equipment.status === 'operationnel'

  return (
    <div className="page-transition">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(backLink)} className="p-1 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">{equipment.name}</h1>
          <p className="text-xs text-muted-foreground">{equipment.companies?.company_name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowQr(true)} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Voir QR Code">
            <QrCode size={18} className="text-foreground" />
          </button>
          {canEdit && (
            <button onClick={() => setShowEdit(true)} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Modifier">
              <Edit2 size={18} className="text-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Statut */}
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            equipment.status === 'operationnel' ? 'status-operationnel' : 'status-en-panne'
          }`}>
            {equipment.status === 'operationnel' ? '● Opérationnel' : '● En panne'}
          </span>
          {canSignalPanne && (
            <button
              onClick={() => setShowPanne(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-sm font-medium hover:bg-destructive/20 transition-colors"
            >
              <AlertTriangle size={14} />
              Signaler une panne
            </button>
          )}
        </div>

        {/* QR permanent du passeport */}
        {qrDataUrl && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="mx-auto md:mx-0 w-[156px] h-[156px] rounded-lg border border-border p-2 bg-white">
                <img src={qrDataUrl} alt={`QR code ${equipment.name}`} className="w-full h-full" />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <h2 className="text-sm font-semibold text-foreground">QR Code du passeport</h2>
                <p className="text-xs text-muted-foreground">
                  Scan direct vers la fiche: <span className="font-mono">{getPassportUrl(equipment.id)}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => printQRCode(equipment.id, equipment.name)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                  >
                    <Printer size={14} />
                    Imprimer le QR
                  </button>
                  <button
                    onClick={() => setShowQr(true)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
                  >
                    <QrCode size={14} />
                    Agrandir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photos */}
        {equipment.photos?.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {equipment.photos.map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="h-32 w-32 object-cover rounded-xl flex-shrink-0 border border-border" />
            ))}
          </div>
        )}

        {/* Informations */}
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {[
            { icon: Tag, label: 'Catégorie', value: equipment.category },
            { icon: Tag, label: 'Modèle', value: equipment.model },
            { icon: Tag, label: 'N° de série', value: equipment.serial_number },
            { icon: MapPin, label: 'Localisation', value: equipment.location },
            { icon: Calendar, label: "Date d'achat", value: equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString('fr-FR') : null },
            { icon: Calendar, label: 'Fin garantie', value: equipment.warranty_end ? new Date(equipment.warranty_end).toLocaleDateString('fr-FR') : null },
          ].filter(({ value }) => value).map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3">
              <Icon size={15} className="text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</span>
              <span className="text-sm text-foreground">{value}</span>
            </div>
          ))}
          {equipment.notes && (
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground">{equipment.notes}</p>
            </div>
          )}
        </div>

        {/* Documents attachés */}
        {equipment.equipment_documents?.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Documents</h2>
            <div className="space-y-2">
              {equipment.equipment_documents.map((doc: any) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  download={doc.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <FileText size={18} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{(doc.file_size / 1024).toFixed(0)} KB</p>
                  </div>
                  <Download size={15} className="text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Historique des interventions */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            Historique des interventions ({interventions.length})
          </h2>
          {interventions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune intervention enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {interventions.map((i: any) => (
                <div key={i.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                  <Wrench size={16} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(i.created_at).toLocaleDateString('fr-FR')}
                      {i.closed_at && ` → ${new Date(i.closed_at).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${URGENCY_COLOR[i.urgency]}`}>
                    {i.urgency}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal QR Code */}
      {showQr && qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowQr(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground text-center">QR Code</h3>
            <img src={qrDataUrl} alt="QR Code" className="w-full rounded-lg" />
            <p className="text-xs text-muted-foreground text-center">{equipment.name}</p>
            <button
              onClick={() => printQRCode(equipment.id, equipment.name)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              <Printer size={16} />
              Imprimer
            </button>
          </div>
        </div>
      )}

      {/* Modal édition */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <h2 className="font-semibold text-foreground">{"Modifier l'équipement"}</h2>
            </div>
            <div className="p-5">
              <EquipmentForm
                companyId={equipment.company_id}
                equipment={equipment as Equipment}
                onSuccess={() => setShowEdit(false)}
                onCancel={() => setShowEdit(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal signaler panne */}
      {showPanne && (
        <SignalPanneModal equipment={equipment} onClose={() => setShowPanne(false)} />
      )}
    </div>
  )
}
