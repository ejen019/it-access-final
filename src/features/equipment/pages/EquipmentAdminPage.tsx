// =============================================================
// EquipmentAdminPage — Vue équipements pour l'Administrateur
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Monitor, Trash2, QrCode, Upload, Pencil, CheckCircle2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { useTousEquipements, useSupprimerEquipement, useModifierEquipement } from '../hooks/useEquipment'
import { EquipmentForm } from '../components/EquipmentForm'
import { BulkImportModal } from '../components/BulkImportModal'
import { printQRCode } from '@/lib/utils/qrcode'
import type { Equipement } from '@/types'

async function fetchClients() {
  const { data, error } = await supabase.from('clients').select('id, nom_entreprise')
  if (error) throw error
  return data ?? []
}

const ETAT_LABEL: Record<string, string> = {
  operationnel: 'Opérationnel', maintenance: 'Maintenance', en_panne: 'En panne', detruit: 'Détruit',
}
const ETAT_CLASS: Record<string, string> = {
  operationnel: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  maintenance: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  en_panne: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  detruit: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export function EquipmentAdminPage() {
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterEtat, setFilterEtat] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createClientId, setCreateClientId] = useState('')
  const [editTarget, setEditTarget] = useState<Equipement | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; clientId: string; nom: string } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importClientId, setImportClientId] = useState('')
  const [pendingImportClient, setPendingImportClient] = useState('')

  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const { data: equipment = [], isLoading, error } = useTousEquipements()
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: fetchClients,
  })
  const deleteMutation = useSupprimerEquipement()
  const updateMutation = useModifierEquipement()

  // Demandes de suppression envoyées par les clients (à valider)
  const { data: deletionRequests = [] } = useQuery({
    queryKey: ['demandes-suppression-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('demandes_modification')
        .select('id, equipement_id, client_id, demande_par, donnees, cree_le, clients(nom_entreprise)')
        .eq('action', 'suppression')
        .eq('statut', 'en_attente')
        .order('cree_le', { ascending: false })
      return data ?? []
    },
  })

  async function approveDeletion(req: any) {
    // Supprime l'équipement (la demande est supprimée en cascade)
    await deleteMutation.mutateAsync({ id: req.equipement_id, clientId: req.client_id })
    if (req.demande_par) {
      await supabase.from('notifications').insert({
        utilisateur_id: req.demande_par,
        type: 'demande_traitee',
        titre: 'Suppression validée',
        corps: `La suppression de « ${req.donnees?.nom ?? 'équipement'} » a été validée.`,
        lien: '/entreprise/parc',
      })
    }
    queryClient.invalidateQueries({ queryKey: ['demandes-suppression-admin'] })
  }

  async function rejectDeletion(req: any) {
    await supabase.from('demandes_modification')
      .update({ statut: 'rejete', revise_par: profile?.id, revise_le: new Date().toISOString() })
      .eq('id', req.id)
    if (req.demande_par) {
      await supabase.from('notifications').insert({
        utilisateur_id: req.demande_par,
        type: 'demande_traitee',
        titre: 'Suppression refusée',
        corps: `La suppression de « ${req.donnees?.nom ?? 'équipement'} » a été refusée par l'administrateur.`,
        lien: '/entreprise/parc',
      })
    }
    queryClient.invalidateQueries({ queryKey: ['demandes-suppression-admin'] })
  }

  const filtered = (equipment as any[]).filter((e) => {
    const matchSearch = e.nom.toLowerCase().includes(search.toLowerCase())
      || (e.numero_serie ?? '').toLowerCase().includes(search.toLowerCase())
    const matchClient = !filterClient || e.client_id === filterClient
    const matchEtat = !filterEtat || e.etat === filterEtat
    return matchSearch && matchClient && matchEtat
  })

  const stats = {
    total: equipment.length,
    operationnel: (equipment as any[]).filter((e) => e.etat === 'operationnel').length,
    maintenance: (equipment as any[]).filter((e) => e.etat === 'maintenance').length,
    en_panne: (equipment as any[]).filter((e) => e.etat === 'en_panne').length,
  }

  return (
    <div className="space-y-6 page-transition">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          Erreur de chargement : {(error as Error).message}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Équipements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Parc informatique de toutes les entreprises</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            <Upload size={16} />
            Importer IA
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Demandes de suppression à valider (envoyées par les clients) */}
      {(deletionRequests as any[]).length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Trash2 size={15} />
            Demandes de suppression à valider ({(deletionRequests as any[]).length})
          </h2>
          <div className="space-y-2">
            {(deletionRequests as any[]).map((req) => (
              <div key={req.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{req.donnees?.nom ?? 'Équipement'}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.clients?.nom_entreprise ?? '—'} · {new Date(req.cree_le).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => approveDeletion(req)}
                  title="Valider la suppression"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-xs font-medium hover:bg-destructive/90 transition-colors"
                >
                  <CheckCircle2 size={14} /> Valider & supprimer
                </button>
                <button
                  onClick={() => rejectDeletion(req)}
                  title="Refuser"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors"
                >
                  <X size={14} /> Refuser
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',         value: stats.total,        bar: 'bg-primary',     textColor: 'text-foreground' },
          { label: 'Opérationnels', value: stats.operationnel, bar: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Maintenance',   value: stats.maintenance,  bar: 'bg-amber-500',   textColor: 'text-amber-600 dark:text-amber-400' },
          { label: 'En panne',      value: stats.en_panne,     bar: 'bg-red-500',     textColor: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className={`text-xl font-bold ${s.textColor}`}>{s.value}</p>
            <div className={`h-0.5 w-8 rounded-full ${s.bar} mt-1 mb-1`} />
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative w-full sm:flex-1 sm:min-w-[16rem]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Nom, numéro de série…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="w-full sm:w-auto px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Toutes les entreprises</option>
          {(clients as any[]).map((c) => (
            <option key={c.id} value={c.id}>{c.nom_entreprise}</option>
          ))}
        </select>
        <select
          value={filterEtat}
          onChange={(e) => setFilterEtat(e.target.value)}
          className="w-full sm:w-auto px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tous les états</option>
          <option value="operationnel">Opérationnel</option>
          <option value="maintenance">Maintenance</option>
          <option value="en_panne">En panne</option>
          <option value="detruit">Détruit</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Monitor size={26} className="text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">
              {search || filterClient || filterEtat ? 'Aucun équipement ne correspond aux filtres' : 'Aucun équipement enregistré'}
            </p>
            {!search && !filterClient && !filterEtat && (
              <button onClick={() => setShowCreate(true)} className="text-sm text-primary hover:underline">
                Ajouter le premier équipement
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Équipement</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Entreprise</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">État</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => (
                  <tr key={e.id} className="border-b border-border hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {e.photos?.[0] ? (
                          <img src={e.photos[0]} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                            <Monitor size={14} className="text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{e.nom}</p>
                          {e.numero_serie && (
                            <p className="text-xs text-muted-foreground">SN: {e.numero_serie}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-muted-foreground">{e.clients?.nom_entreprise ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-sm text-muted-foreground">{e.categorie ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ETAT_CLASS[e.etat] ?? ''}`}>
                        {ETAT_LABEL[e.etat] ?? e.etat}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {e.etat === 'maintenance' && (
                          <button
                            onClick={() => updateMutation.mutate({ id: e.id, updates: { etat: 'operationnel' } })}
                            title="Valider (rendre opérationnel)"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setEditTarget(e as Equipement)}
                          title="Modifier"
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => printQRCode(e.id, e.nom)}
                          title="Imprimer QR Code"
                          className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                        >
                          <QrCode size={16} />
                        </button>
                        <Link
                          to={`/admin/equipements/${e.id}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                          title="Voir passeport"
                        >
                          <Monitor size={16} />
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm({ id: e.id, clientId: e.client_id, nom: e.nom })}
                          title="Supprimer"
                          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal import IA */}
      {showImport && !importClientId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowImport(false); setPendingImportClient('') }}
        >
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground">Import IA — Entreprise cible</h3>
            <select
              value={pendingImportClient}
              onChange={(e) => setPendingImportClient(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choisir une entreprise…</option>
              {(clients as any[]).map((c) => (
                <option key={c.id} value={c.id}>{c.nom_entreprise}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowImport(false); setPendingImportClient('') }}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                disabled={!pendingImportClient}
                onClick={() => setImportClientId(pendingImportClient)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-60"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
      {showImport && importClientId && (
        <BulkImportModal
          clientId={importClientId}
          onClose={() => { setShowImport(false); setImportClientId(''); setPendingImportClient('') }}
        />
      )}

      {/* Modal création équipement */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowCreate(false); setCreateClientId('') }}
        >
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-border space-y-3">
              <h2 className="font-semibold text-foreground">Nouvel équipement</h2>
              <select
                value={createClientId}
                onChange={(e) => setCreateClientId(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Choisir l'entreprise…</option>
                {(clients as any[]).map((c) => (
                  <option key={c.id} value={c.id}>{c.nom_entreprise}</option>
                ))}
              </select>
            </div>
            {createClientId ? (
              <div className="p-5">
                <EquipmentForm
                  clientId={createClientId}
                  onSuccess={() => { setShowCreate(false); setCreateClientId('') }}
                  onCancel={() => { setShowCreate(false); setCreateClientId('') }}
                />
              </div>
            ) : (
              <div className="p-5">
                <button
                  onClick={() => { setShowCreate(false); setCreateClientId('') }}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal édition équipement */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setEditTarget(null)}
        >
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Modifier l'équipement</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{(editTarget as any).clients?.nom_entreprise ?? ''}</p>
            </div>
            <div className="p-5">
              <EquipmentForm
                clientId={editTarget.client_id}
                equipment={editTarget}
                onSuccess={() => setEditTarget(null)}
                onCancel={() => setEditTarget(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground">Supprimer l'équipement ?</h3>
            <p className="text-sm text-muted-foreground">
              <strong>{deleteConfirm.nom}</strong> sera définitivement supprimé.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
                Annuler
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate({ id: deleteConfirm.id, clientId: deleteConfirm.clientId })
                  setDeleteConfirm(null)
                }}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
