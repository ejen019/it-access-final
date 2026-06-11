// =============================================================
// InterventionsAdminPage — Vue globale des interventions (Admin)
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Clock, Ban, Wrench, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import {
  useToutesInterventions,
  useCreerIntervention,
  useChangerStatutIntervention,
  type InterventionInput,
} from '../hooks/useInterventions'
import type { NiveauUrgence } from '@/types'

// ----- Helpers visuels -----

const STATUS_LABEL: Record<string, string> = {
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  signee: 'Signée',
  annulee: 'Annulée',
}

const STATUS_CLASS: Record<string, string> = {
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

const TYPE_LABEL: Record<string, string> = {
  reparation: 'Réparation', periodique: 'Périodique',
}
const TYPE_CLASS: Record<string, string> = {
  reparation: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  periodique: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
}

const URGENCY_ROW_ACCENT: Record<string, string> = {
  faible: '',
  moyenne: '',
  critique: 'bg-red-50/40 dark:bg-red-900/10',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ----- Requêtes de formulaire -----

async function fetchClients() {
  const { data, error } = await supabase.from('clients').select('id, nom_entreprise')
  if (error) throw error
  return data ?? []
}

async function fetchClientEquipements(clientId: string) {
  const { data } = await supabase
    .from('equipements')
    .select('id, nom, categorie')
    .eq('client_id', clientId)
    .eq('etat', 'en_panne')
    .order('nom')
  return data ?? []
}

// Tous les techniciens actifs — l'affectation se fait à la planification (plus de lien entreprise↔technicien)
async function fetchAllTechniciens() {
  const { data, error } = await supabase
    .from('techniciens')
    .select('id, utilisateur_id, specialite, utilisateurs(nom, prenom, est_actif, compte_valide)')
  if (error) throw error
  return (data ?? [])
    .filter((t: any) => t.utilisateurs?.est_actif !== false && t.utilisateurs?.compte_valide !== false)
    .map((t: any) => ({
      techId: t.id,
      userId: t.utilisateur_id,
      name: `${t.utilisateurs?.prenom ?? ''} ${t.utilisateurs?.nom ?? ''}`.trim() || 'Technicien',
      specialite: t.specialite as string | null,
    }))
}

// ----- Composant modal création -----

interface CreateModalProps {
  onClose: () => void
}

function CreateModal({ onClose }: CreateModalProps) {
  const { profile } = useAuthStore()
  const createMutation = useCreerIntervention()

  const [clientId, setClientId] = useState('')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [urgence, setUrgence] = useState<NiveauUrgence>('moyenne')
  const [typePlanification, setTypePlanification] = useState<'reparation' | 'periodique'>('reparation')
  const [planifieLe, setPlanifieLe] = useState('')
  const [selectedEquipements, setSelectedEquipements] = useState<string[]>([])
  const [selectedTechs, setSelectedTechs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data: clients = [] } = useQuery({ queryKey: ['clients-list'], queryFn: fetchClients })
  const { data: equipements = [] } = useQuery({
    queryKey: ['client-equipements-panne', clientId],
    queryFn: () => fetchClientEquipements(clientId),
    enabled: !!clientId,
  })
  const { data: techniciens = [] } = useQuery({
    queryKey: ['all-techs'],
    queryFn: fetchAllTechniciens,
  })

  function toggleEquipement(id: string) {
    setSelectedEquipements((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleTech(techId: string) {
    setSelectedTechs((prev) =>
      prev.includes(techId) ? prev.filter((x) => x !== techId) : [...prev, techId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !titre.trim() || !description.trim()) {
      setError("Renseignez l'entreprise, le titre et la description.")
      return
    }
    setError(null)
    const input: InterventionInput = {
      client_id: clientId,
      equipement_ids: selectedEquipements,
      titre: titre.trim(),
      description: description.trim(),
      urgence,
      technicien_ids: selectedTechs,
      cree_par: profile!.id,
      type_planification: typePlanification,
      planifie_le: typePlanification === 'periodique' && planifieLe ? new Date(planifieLe).toISOString() : undefined,
    }
    try {
      await createMutation.mutateAsync(input)
      onClose()
    } catch {
      setError('Erreur lors de la création. Réessayez.')
    }
  }

  const urgencyConfig = [
    { value: 'faible' as NiveauUrgence,   label: 'Faible',   solid: 'bg-slate-500' },
    { value: 'moyenne' as NiveauUrgence,  label: 'Moyenne',  solid: 'bg-amber-500' },
    { value: 'critique' as NiveauUrgence, label: 'Critique', solid: 'bg-red-500' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
              <Plus size={16} className="text-white" />
            </div>
            <h2 className="font-semibold text-foreground">Nouvelle intervention</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Entreprise *</label>
            <select
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); setSelectedEquipements([]); setSelectedTechs([]) }}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choisir une entreprise…</option>
              {(clients as any[]).map((c) => (
                <option key={c.id} value={c.id}>{c.nom_entreprise}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Titre *</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Panne serveur principal"
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Décrivez le problème…"
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Type de planification</label>
            <div className="flex gap-2">
              {([
                { value: 'reparation' as const, label: 'Réparation' },
                { value: 'periodique' as const, label: 'Périodique' },
              ]).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTypePlanification(t.value)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors border ${
                    typePlanification === t.value
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {typePlanification === 'periodique' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Date de planification</label>
              <input
                type="datetime-local"
                value={planifieLe}
                onChange={(e) => setPlanifieLe(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Niveau d'urgence</label>
            <div className="flex gap-2">
              {urgencyConfig.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => setUrgence(u.value)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors border ${
                    urgence === u.value
                      ? `${u.solid} text-white border-transparent`
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {clientId && (equipements as any[]).length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Équipements concernés <span className="text-muted-foreground font-normal text-xs">(en panne)</span>
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {(equipements as any[]).map((eq) => (
                  <label key={eq.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded-lg p-1.5">
                    <input
                      type="checkbox"
                      checked={selectedEquipements.includes(eq.id)}
                      onChange={() => toggleEquipement(eq.id)}
                      className="rounded"
                    />
                    <span className="text-foreground">{eq.nom}</span>
                    {eq.categorie && <span className="text-muted-foreground text-xs">· {eq.categorie}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Affecter des techniciens
              {selectedTechs.length > 0 && (
                <span className="ml-1.5 text-xs text-primary font-normal">({selectedTechs.length} sélectionné{selectedTechs.length > 1 ? 's' : ''})</span>
              )}
            </label>
            {(techniciens as any[]).length === 0 ? (
              <p className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-3 text-center">
                Aucun technicien actif disponible.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {(techniciens as any[]).map((t) => (
                  <label key={t.techId} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded-lg p-1.5">
                    <input
                      type="checkbox"
                      checked={selectedTechs.includes(t.techId)}
                      onChange={() => toggleTech(t.techId)}
                      className="rounded"
                    />
                    <span className="text-foreground">{t.name}</span>
                    {t.specialite && <span className="text-muted-foreground text-xs">· {t.specialite}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 gradient-primary text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors shadow-sm"
            >
              {createMutation.isPending ? 'Création…' : "Créer l'intervention"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ----- Page principale -----

export function InterventionsAdminPage() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'reparation' | 'periodique'>('all')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; titre: string } | null>(null)

  const { data: interventions = [], isLoading, error } = useToutesInterventions()
  const { data: clients = [] } = useQuery({ queryKey: ['clients-list'], queryFn: fetchClients })
  const cancelMutation = useChangerStatutIntervention()

  const filtered = interventions.filter((i: any) => {
    const matchSearch =
      (i.titre ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (i.clients?.nom_entreprise ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || i.statut === filterStatus
    const matchUrgency = !filterUrgency || i.urgence === filterUrgency
    const matchClient = !filterClient || i.client_id === filterClient
    const type = i.type_planification ?? 'reparation'
    const matchType = filterType === 'all' || type === filterType
    return matchSearch && matchStatus && matchUrgency && matchClient && matchType
  })

  const stats = {
    total: interventions.filter((i: any) => i.statut !== 'annulee').length,
    planifiee: interventions.filter((i: any) => i.statut === 'planifiee').length,
    en_cours: interventions.filter((i: any) => i.statut === 'en_cours').length,
    terminee: interventions.filter((i: any) => i.statut === 'terminee').length,
    signee: interventions.filter((i: any) => i.statut === 'signee').length,
    critiques: interventions.filter((i: any) => i.urgence === 'critique' && ['planifiee', 'en_cours'].includes(i.statut)).length,
    reparations: interventions.filter((i: any) => (i.type_planification ?? 'reparation') === 'reparation' && i.statut !== 'annulee').length,
    periodiques: interventions.filter((i: any) => i.type_planification === 'periodique' && i.statut !== 'annulee').length,
  }

  const TYPE_TABS = [
    { id: 'all' as const, label: 'Toutes', count: stats.total },
    { id: 'reparation' as const, label: 'Réparations', count: stats.reparations },
    { id: 'periodique' as const, label: 'Périodiques', count: stats.periodiques },
  ]

  return (
    <div className="space-y-6 page-transition">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          Erreur de chargement : {(error as Error).message}
        </div>
      )}
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interventions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} actives · {stats.en_cours} en cours · {stats.terminee} terminées · {stats.signee} signées
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} />
          Nouvelle intervention
        </button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Planifiées',  value: stats.planifiee, bar: 'bg-blue-500',   textColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'En cours',    value: stats.en_cours,  bar: 'bg-amber-500',  textColor: 'text-amber-600 dark:text-amber-400' },
          { label: 'Terminées',   value: stats.terminee,  bar: 'bg-violet-500', textColor: 'text-violet-600 dark:text-violet-400' },
          { label: 'Critiques',   value: stats.critiques, bar: 'bg-red-500',    textColor: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className={`text-xl font-bold ${s.textColor}`}>{s.value}</p>
            <div className={`h-0.5 w-8 rounded-full ${s.bar} mt-1 mb-1`} />
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Onglets type de planification */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {TYPE_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterType(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              filterType === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filterType === t.id ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Titre, entreprise…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Toutes les entreprises</option>
          {(clients as any[]).map((c) => (
            <option key={c.id} value={c.id}>{c.nom_entreprise}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tous les statuts</option>
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="signee">Signée</option>
          <option value="annulee">Annulée</option>
        </select>
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Toutes urgences</option>
          <option value="faible">Faible</option>
          <option value="moyenne">Moyenne</option>
          <option value="critique">Critique</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Wrench size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Aucune intervention trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Titre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Entreprise</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Urgence</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i: any) => (
                  <tr key={i.id} className={`border-b border-border hover:bg-accent/40 transition-colors ${URGENCY_ROW_ACCENT[i.urgence] ?? ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {i.urgence === 'critique' && (
                          <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground line-clamp-1">{i.titre}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {i.interventions_equipements?.length ?? 0} équipement{(i.interventions_equipements?.length ?? 0) > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-muted-foreground">{i.clients?.nom_entreprise ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_CLASS[i.type_planification ?? 'reparation'] ?? ''}`}>
                        {TYPE_LABEL[i.type_planification ?? 'reparation']}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_CLASS[i.urgence] ?? ''}`}>
                        {URGENCY_LABEL[i.urgence]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[i.statut] ?? ''}`}>
                        {STATUS_LABEL[i.statut]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">{formatDate(i.cree_le)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          to={`/admin/interventions/${i.id}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Voir le détail"
                        >
                          <Clock size={16} />
                        </Link>
                        {i.statut !== 'signee' && i.statut !== 'annulee' && (
                          <button
                            onClick={() => setCancelConfirm({ id: i.id, titre: i.titre })}
                            title="Annuler"
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Ban size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal création */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}

      {/* Modal confirmation annulation */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Ban size={18} className="text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground">Annuler l'intervention ?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{cancelConfirm.titre}</strong> sera marquée comme annulée.
              Cette action ne peut pas être défaite.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                Garder
              </button>
              <button
                onClick={() => {
                  cancelMutation.mutate({ id: cancelConfirm.id, statut: 'annulee' })
                  setCancelConfirm(null)
                }}
                className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium transition-colors"
              >
                Annuler quand même
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
