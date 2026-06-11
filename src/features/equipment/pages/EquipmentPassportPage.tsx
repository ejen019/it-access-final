// =============================================================
// EquipmentPassportPage — Passeport numérique d'un équipement
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
import { useEquipementDetail } from '../hooks/useEquipment'
import { generateQRCodeDataUrl, getPassportUrl, printQRCode } from '@/lib/utils/qrcode'
import { EquipmentForm } from '../components/EquipmentForm'
import type { Equipement } from '@/types'

async function fetchEquipementInterventions(equipementId: string) {
  const { data } = await supabase
    .from('interventions_equipements')
    .select('interventions(id, titre, statut, urgence, cree_le)')
    .eq('equipement_id', equipementId)
    .limit(10)
  return (data ?? []).map((r: any) => r.interventions).filter(Boolean)
}

const URGENCY_COLOR: Record<string, string> = {
  faible: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  moyenne: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  critique: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
}
const STATUS_LABEL: Record<string, string> = {
  planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'À signer', signee: 'Clôturée', annulee: 'Annulée',
}

function SignalPanneModal({ equipment, onClose }: { equipment: any; onClose: () => void }) {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [description, setDescription] = useState('')
  const [urgence, setUrgence] = useState<'faible' | 'moyenne' | 'critique'>('moyenne')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      // L'affectation des techniciens se fait à la planification par l'admin.
      // La panne crée une intervention non assignée + notifie les admins.

      // Mettre l'équipement en panne
      await supabase.from('equipements').update({ etat: 'en_panne' }).eq('id', equipment.id)

      // Créer l'intervention
      const { data: intervention } = await supabase.from('interventions').insert({
        client_id: equipment.client_id,
        titre: `Panne — ${equipment.nom}`,
        description,
        urgence,
        statut: 'planifiee',
        cree_par: profile!.id,
      }).select().single()

      if (intervention) {
        await supabase.from('interventions_equipements').insert({
          intervention_id: intervention.id,
          equipement_id: equipment.id,
        })

        const { data: admins } = await supabase
          .from('utilisateurs').select('id').in('role', ['admin', 'super_admin'])
        if (admins?.length) {
          await supabase.from('notifications').insert(
            admins.map((a: any) => ({
              utilisateur_id: a.id,
              titre: `Panne signalée — ${equipment.clients?.nom_entreprise}`,
              corps: `${equipment.nom} : ${description.slice(0, 80)}`,
              lien: '/admin/interventions',
            }))
          )
        }

      }

      queryClient.invalidateQueries({ queryKey: ['equipement-detail', equipment.id] })
      queryClient.invalidateQueries({ queryKey: ['equipements', equipment.client_id] })
      onClose()
      navigate(profile?.role === 'client' ? '/entreprise/interventions' : '/technicien/interventions')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <h2 className="font-semibold text-foreground">Signaler une panne</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{equipment.nom}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description de la panne *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required rows={3}
              placeholder="Décrivez le problème observé…"
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{"Niveau d'urgence"}</label>
            <div className="flex gap-2">
              {(['faible', 'moyenne', 'critique'] as const).map((u) => (
                <button key={u} type="button" onClick={() => setUrgence(u)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors border ${
                    urgence === u ? URGENCY_COLOR[u] : 'bg-muted text-muted-foreground border-transparent'
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

  const { data: equipment, isLoading } = useEquipementDetail(id)
  const { data: interventions = [] } = useQuery({
    queryKey: ['equipement-interventions', id],
    queryFn: () => fetchEquipementInterventions(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (id) generateQRCodeDataUrl(id).then(setQrDataUrl)
  }, [id])

  const backLink = {
    super_admin: '/sudo/dashboard',
    admin: '/admin/equipements',
    technicien: '/technicien/dashboard',
    client: '/entreprise/parc',
  }[profile?.role ?? 'admin']

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
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

  const canEdit = ['admin', 'super_admin', 'client'].includes(profile?.role ?? '')
  const canSignalPanne = profile?.role === 'client' && equipment.etat === 'operationnel'

  return (
    <div className="page-transition">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(backLink)} className="p-1 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">{equipment.nom}</h1>
          <p className="text-xs text-muted-foreground">{(equipment as any).clients?.nom_entreprise}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowQr(true)} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <QrCode size={18} className="text-foreground" />
          </button>
          {canEdit && (
            <button onClick={() => setShowEdit(true)} className="p-2 rounded-lg hover:bg-accent transition-colors">
              <Edit2 size={18} className="text-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* État */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            equipment.etat === 'operationnel' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
            equipment.etat === 'maintenance'  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
            'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            ● {equipment.etat === 'operationnel' ? 'Opérationnel' : equipment.etat === 'maintenance' ? 'Maintenance' : 'En panne'}
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

        {/* QR Code */}
        {qrDataUrl && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="mx-auto md:mx-0 w-[156px] h-[156px] rounded-lg border border-border p-2 bg-white">
                <img src={qrDataUrl} alt={`QR ${equipment.nom}`} className="w-full h-full" />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <h2 className="text-sm font-semibold text-foreground">QR Code du passeport</h2>
                <p className="text-xs text-muted-foreground font-mono">{getPassportUrl(equipment.id)}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => printQRCode(equipment.id, equipment.nom)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                  >
                    <Printer size={14} />
                    Imprimer
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
        {(equipment as any).photos?.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(equipment as any).photos.map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="h-32 w-32 object-cover rounded-xl flex-shrink-0 border border-border" />
            ))}
          </div>
        )}

        {/* Informations */}
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {[
            { icon: Tag,      label: 'Catégorie',   value: equipment.categorie },
            { icon: Tag,      label: 'Modèle',      value: equipment.modele },
            { icon: Tag,      label: 'N° de série', value: equipment.numero_serie },
            { icon: MapPin,   label: 'Emplacement', value: equipment.emplacement },
            { icon: Calendar, label: "Date d'achat", value: equipment.date_achat ? new Date(equipment.date_achat).toLocaleDateString('fr-FR') : null },
            { icon: Calendar, label: 'Fin garantie', value: equipment.fin_garantie ? new Date(equipment.fin_garantie).toLocaleDateString('fr-FR') : null },
          ].filter(({ value }) => value).map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3">
              <Icon size={15} className="text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</span>
              <span className="text-sm text-foreground">{value}</span>
            </div>
          ))}
          {(equipment as any).notes && (
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground">{(equipment as any).notes}</p>
            </div>
          )}
        </div>

        {/* Documents */}
        {(equipment as any).documents_equipement?.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Documents</h2>
            <div className="space-y-2">
              {(equipment as any).documents_equipement.map((doc: any) => (
                <a key={doc.id} href={doc.url_fichier} download={doc.nom} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors">
                  <FileText size={18} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.nom}</p>
                    <p className="text-xs text-muted-foreground">{((doc.taille_octets ?? 0) / 1024).toFixed(0)} KB</p>
                  </div>
                  <Download size={15} className="text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Historique interventions */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">
            Historique des interventions ({interventions.length})
          </h2>
          {interventions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune intervention enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {(interventions as any[]).map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                  <Wrench size={16} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{inv.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.cree_le).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${URGENCY_COLOR[inv.urgence] ?? ''}`}>
                    {inv.urgence}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal QR */}
      {showQr && qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowQr(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground text-center">QR Code</h3>
            <img src={qrDataUrl} alt="QR Code" className="w-full rounded-lg" />
            <p className="text-xs text-muted-foreground text-center">{equipment.nom}</p>
            <button
              onClick={() => printQRCode(equipment.id, equipment.nom)}
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
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowEdit(false)}
        >
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <h2 className="font-semibold text-foreground">{"Modifier l'équipement"}</h2>
            </div>
            <div className="p-5">
              <EquipmentForm
                clientId={equipment.client_id}
                equipment={equipment as unknown as Equipement}
                onSuccess={() => setShowEdit(false)}
                onCancel={() => setShowEdit(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal panne */}
      {showPanne && (
        <SignalPanneModal equipment={equipment} onClose={() => setShowPanne(false)} />
      )}
    </div>
  )
}
