// =============================================================
// ParcPage — Vue parc d'équipements pour l'Entreprise
//
// Liste tous les équipements de l'entreprise connectée.
// Actions : Ajouter, Voir passeport, Signaler panne,
// + actions groupées (sélection multiple) : panne / demande de suppression.
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Monitor, Search, Upload, CheckSquare, Square, X, AlertTriangle, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { useClientEquipement } from '../hooks/useEquipment'
import { EquipmentForm } from '../components/EquipmentForm'
import { BulkImportModal } from '../components/BulkImportModal'
import type { Equipement } from '@/types'

async function fetchMyClientId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('utilisateur_id', userId)
    .single()
  return data?.id ?? null
}

const ETAT_LABEL: Record<string, string> = {
  operationnel: 'Opérationnel', maintenance: 'Maintenance', en_panne: 'En panne',
}
const ETAT_CLASS: Record<string, string> = {
  operationnel: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  maintenance: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  en_panne: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}
const URGENCY_BTN: Record<string, string> = {
  faible: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-200',
  moyenne: 'bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-800 dark:text-amber-100',
  critique: 'bg-red-200 text-red-900 border-red-300 dark:bg-red-800 dark:text-red-100',
}

function EquipmentCard({ equipment, selectMode, selected, onToggle }: {
  equipment: Equipement
  selectMode: boolean
  selected: boolean
  onToggle: () => void
}) {
  const photos = (equipment as any).photos as string[] | undefined

  const inner = (
    <>
      <div className="w-full h-32 bg-muted rounded-lg mb-3 overflow-hidden flex items-center justify-center relative">
        {photos?.[0] ? (
          <img src={photos[0]} alt={equipment.nom} className="w-full h-full object-cover" />
        ) : (
          <Monitor size={32} className="text-muted-foreground/40" />
        )}
        {selectMode && (
          <div className={`absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center ${selected ? 'bg-primary text-white' : 'bg-card/90 border border-border'}`}>
            {selected ? <CheckSquare size={16} /> : <Square size={16} className="text-muted-foreground" />}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ETAT_CLASS[equipment.etat] ?? ''}`}>
          {ETAT_LABEL[equipment.etat] ?? equipment.etat}
        </span>
        {equipment.categorie && (
          <span className="text-xs text-muted-foreground">{equipment.categorie}</span>
        )}
      </div>

      <p className="text-sm font-semibold text-foreground line-clamp-1">{equipment.nom}</p>
      {equipment.modele && <p className="text-xs text-muted-foreground mt-0.5">{equipment.modele}</p>}
      {equipment.emplacement && <p className="text-xs text-muted-foreground mt-1">📍 {equipment.emplacement}</p>}
    </>
  )

  if (selectMode) {
    return (
      <button
        onClick={onToggle}
        className={`text-left bg-card border rounded-xl p-4 transition-all ${selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40'}`}
      >
        {inner}
      </button>
    )
  }

  return (
    <Link
      to={`/entreprise/parc/${equipment.id}`}
      className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition-all group block"
    >
      {inner}
    </Link>
  )
}

export function ParcPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'operationnel' | 'en_panne' | 'maintenance'>('all')

  // Sélection multiple / actions groupées
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkPanne, setShowBulkPanne] = useState(false)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkDesc, setBulkDesc] = useState('')
  const [bulkUrg, setBulkUrg] = useState<'faible' | 'moyenne' | 'critique'>('moyenne')
  const [bulkLoading, setBulkLoading] = useState(false)

  const { data: clientId } = useQuery({
    queryKey: ['my-client-id', profile?.id],
    queryFn: () => fetchMyClientId(profile!.id),
    enabled: !!profile,
  })

  const { data: equipment = [], isLoading } = useClientEquipement(clientId ?? undefined)

  const filtered = equipment.filter((e) => {
    const matchSearch = e.nom.toLowerCase().includes(search.toLowerCase())
      || (e.modele ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || e.etat === filterStatus
    return matchSearch && matchStatus
  })

  const panneCount = equipment.filter((e) => e.etat === 'en_panne').length

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function selectAll() {
    setSelectedIds(new Set(filtered.map((e) => e.id)))
  }
  function clearSelection() {
    setSelectedIds(new Set())
  }
  function exitSelectMode() {
    setSelectMode(false)
    clearSelection()
  }

  async function notifyAdmins(titre: string, corps: string) {
    const { data: admins } = await supabase.from('utilisateurs').select('id').in('role', ['admin', 'super_admin'])
    if (admins?.length) {
      await supabase.from('notifications').insert(
        admins.map((a: any) => ({ utilisateur_id: a.id, type: 'nouvelle_intervention', titre, corps, lien: '/admin/interventions' }))
      )
    }
  }

  // Panne groupée : UNE seule intervention liée à tous les équipements sélectionnés (non déjà en panne)
  async function handleBulkPanne() {
    if (!clientId) return
    const targets = equipment.filter((e) => selectedIds.has(e.id) && e.etat !== 'en_panne')
    if (targets.length === 0) { setShowBulkPanne(false); return }
    setBulkLoading(true)
    try {
      await supabase.from('equipements').update({ etat: 'en_panne' }).in('id', targets.map((e) => e.id))
      const titre = targets.length === 1 ? `Panne — ${targets[0].nom}` : `Panne — ${targets.length} équipements`
      const { data: intervention } = await supabase.from('interventions').insert({
        client_id: clientId, titre, description: bulkDesc, urgence: bulkUrg, statut: 'planifiee', cree_par: profile!.id,
      }).select().single()
      if (intervention) {
        await supabase.from('interventions_equipements').insert(
          targets.map((e) => ({ intervention_id: intervention.id, equipement_id: e.id }))
        )
        await notifyAdmins('Panne signalée (groupée)', `${targets.length} équipement(s) — ${bulkDesc.slice(0, 60)}`)
      }
      queryClient.invalidateQueries({ queryKey: ['equipements', clientId] })
      queryClient.invalidateQueries({ queryKey: ['interventions-client'] })
      setShowBulkPanne(false); setBulkDesc(''); exitSelectMode()
    } finally {
      setBulkLoading(false)
    }
  }

  // Demande de suppression groupée : une demande par équipement, validée par l'admin
  async function handleBulkDeleteRequest() {
    if (!clientId) return
    const targets = equipment.filter((e) => selectedIds.has(e.id))
    if (targets.length === 0) { setShowBulkDelete(false); return }
    setBulkLoading(true)
    try {
      await supabase.from('demandes_modification').insert(
        targets.map((e) => ({
          action: 'suppression', client_id: clientId, equipement_id: e.id,
          demande_par: profile!.id, statut: 'en_attente', donnees: { nom: e.nom },
        }))
      )
      await notifyAdmins('Demande de suppression (groupée)', `${targets.length} équipement(s) à supprimer.`)
      setShowBulkDelete(false); exitSelectMode()
    } finally {
      setBulkLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const selectedCount = selectedIds.size

  return (
    <div className="p-4 space-y-4 page-transition pb-24">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Mon Parc</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {equipment.length} équipement{equipment.length > 1 ? 's' : ''}
            {panneCount > 0 && ` · ${panneCount} en panne`}
          </p>
        </div>
        {clientId && (
          <div className="flex items-center gap-2">
            {equipment.length > 0 && (
              selectMode ? (
                <button
                  onClick={exitSelectMode}
                  className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  <X size={15} /> Terminer
                </button>
              ) : (
                <button
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  <CheckSquare size={15} /> Sélectionner
                </button>
              )
            )}
            {!selectMode && (
              <>
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  <Upload size={15} />
                  Import CSV
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                >
                  <Plus size={15} />
                  Ajouter
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'operationnel', 'maintenance', 'en_panne'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filterStatus === s
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? 'Tous' : s === 'operationnel' ? 'Opérationnels' : s === 'maintenance' ? 'En validation' : 'En panne'}
            </button>
          ))}
        </div>
      </div>

      {/* Barre de sélection */}
      {selectMode && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <span className="text-sm text-foreground font-medium">{selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}</span>
          <div className="flex gap-3 text-xs">
            <button onClick={selectAll} className="text-primary hover:underline">Tout sélectionner</button>
            <button onClick={clearSelection} className="text-muted-foreground hover:underline">Effacer</button>
          </div>
        </div>
      )}

      {/* Grille équipements */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Monitor size={40} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {equipment.length === 0 ? 'Aucun équipement enregistré' : 'Aucun résultat'}
          </p>
          {equipment.length === 0 && clientId && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-primary hover:underline"
            >
              Ajouter le premier équipement
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((e) => (
            <EquipmentCard
              key={e.id}
              equipment={e}
              selectMode={selectMode}
              selected={selectedIds.has(e.id)}
              onToggle={() => toggleSelect(e.id)}
            />
          ))}
        </div>
      )}

      {/* Notice équipements en validation */}
      {!selectMode && equipment.some(e => e.etat === 'maintenance') && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
          Certains équipements sont en attente de validation par l'administrateur (affichés comme "En validation").
        </div>
      )}

      {/* Barre d'actions groupées (fixée en bas) */}
      {selectMode && selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border p-3 flex gap-3 max-w-2xl mx-auto sm:left-56">
          <button
            onClick={() => setShowBulkPanne(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium"
          >
            <AlertTriangle size={15} /> Signaler une panne
          </button>
          <button
            onClick={() => setShowBulkDelete(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-destructive text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={15} /> Demander la suppression
          </button>
        </div>
      )}

      {/* Modal panne groupée */}
      {showBulkPanne && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => !bulkLoading && setShowBulkPanne(false)}>
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Signaler une panne</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedCount} équipement(s) sélectionné(s)</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Description de la panne *</label>
                <textarea
                  value={bulkDesc}
                  onChange={(e) => setBulkDesc(e.target.value)}
                  required rows={3}
                  placeholder="Décrivez le problème observé…"
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{"Niveau d'urgence"}</label>
                <div className="flex gap-2">
                  {(['faible', 'moyenne', 'critique'] as const).map((u) => (
                    <button key={u} type="button" onClick={() => setBulkUrg(u)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors border ${
                        bulkUrg === u ? URGENCY_BTN[u] : 'bg-muted text-muted-foreground border-transparent'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowBulkPanne(false)} disabled={bulkLoading}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
                  Annuler
                </button>
                <button onClick={handleBulkPanne} disabled={bulkLoading || !bulkDesc.trim()}
                  className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
                  {bulkLoading ? 'Envoi…' : 'Signaler'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal demande de suppression groupée */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !bulkLoading && setShowBulkDelete(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground">Demander la suppression ?</h3>
            <p className="text-sm text-muted-foreground">
              {selectedCount} équipement(s) : la demande sera envoyée à l'administrateur pour validation. Rien n'est supprimé immédiatement.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkDelete(false)} disabled={bulkLoading}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
                Annuler
              </button>
              <button onClick={handleBulkDeleteRequest} disabled={bulkLoading}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
                {bulkLoading ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajout équipement */}
      {showForm && clientId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Nouvel équipement</h2>
              <p className="text-xs text-muted-foreground mt-0.5">L'équipement sera soumis à validation par l'administrateur.</p>
            </div>
            <div className="p-5">
              <EquipmentForm
                clientId={clientId}
                onSuccess={() => {
                  setShowForm(false)
                  queryClient.invalidateQueries({ queryKey: ['equipements', clientId] })
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal import CSV */}
      {showImport && clientId && (
        <BulkImportModal
          clientId={clientId}
          pendingValidation
          onClose={() => {
            setShowImport(false)
            queryClient.invalidateQueries({ queryKey: ['equipements', clientId] })
          }}
        />
      )}
    </div>
  )
}
