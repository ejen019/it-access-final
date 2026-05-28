// =============================================================
// InterventionsAdminPage — Vue globale des interventions (Admin)
//
// Liste toutes les interventions. Filtres par statut, urgence, entreprise.
// Actions : Créer, Voir détail, Annuler
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Clock, Ban, Wrench, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import {
  useAllInterventions,
  useCreateIntervention,
  useUpdateInterventionStatus,
  type InterventionInput,
} from '../hooks/useInterventions'
import type { UrgencyLevel } from '@/types'

// ----- Helpers visuels -----

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  en_cours: 'En cours',
  en_attente_validation: 'En attente',
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

const URGENCY_ROW_ACCENT: Record<string, string> = {
  faible: '',
  moyenne: '',
  critique: 'bg-red-50/40 dark:bg-red-900/10',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ----- Requêtes de formulaire -----

async function fetchCompanies() {
  const { data, error } = await supabase.from('companies').select('id, company_name')
  if (error) throw error
  return data ?? []
}

async function fetchCompanyEquipment(companyId: string) {
  const { data } = await supabase
    .from('equipment')
    .select('id, name, category')
    .eq('company_id', companyId)
    .eq('status', 'en_panne')
    .order('name')
  return data ?? []
}

async function fetchCompanyTechnicians(companyId: string) {
  // Step 1: get technician IDs for this company
  const { data: assignments, error: err1 } = await supabase
    .from('assignments')
    .select('technician_id, technicians(user_id)')
    .eq('company_id', companyId)
  if (err1) throw err1

  const entries = (assignments ?? [])
    .map((a: any) => ({ techId: a.technician_id, userId: a.technicians?.user_id as string }))
    .filter((e) => e.userId)

  if (!entries.length) return []

  // Step 2: get profile names
  const userIds = entries.map((e) => e.userId)
  const { data: profiles, error: err2 } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)
  if (err2) throw err2

  const nameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.full_name]))
  return entries.map((e) => ({ userId: e.userId, name: nameMap[e.userId] ?? 'Technicien' }))
}

// ----- Composant modal création -----

interface CreateModalProps {
  onClose: () => void
}

function CreateModal({ onClose }: CreateModalProps) {
  const { profile } = useAuthStore()
  const createMutation = useCreateIntervention()

  const [companyId, setCompanyId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<UrgencyLevel>('moyenne')
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [selectedTechs, setSelectedTechs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data: companies = [] } = useQuery({ queryKey: ['companies-list'], queryFn: fetchCompanies })
  const { data: equipment = [] } = useQuery({
    queryKey: ['company-equipment-panne', companyId],
    queryFn: () => fetchCompanyEquipment(companyId),
    enabled: !!companyId,
  })
  const { data: technicians = [] } = useQuery({
    queryKey: ['company-techs', companyId],
    queryFn: () => fetchCompanyTechnicians(companyId),
    enabled: !!companyId,
  })

  function toggleEquipment(id: string) {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleTech(uid: string) {
    setSelectedTechs((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId || !title.trim() || !description.trim()) {
      setError('Renseignez l\'entreprise, le titre et la description.')
      return
    }
    setError(null)
    const input: InterventionInput = {
      company_id: companyId,
      equipment_ids: selectedEquipment,
      title: title.trim(),
      description: description.trim(),
      urgency,
      technician_ids: selectedTechs,
      created_by: profile!.id,
    }
    try {
      await createMutation.mutateAsync(input)
      onClose()
    } catch {
      setError('Erreur lors de la création. Réessayez.')
    }
  }

  const urgencyConfig = [
    { value: 'faible' as UrgencyLevel,   label: 'Faible',   from: 'from-slate-400',  to: 'to-slate-500' },
    { value: 'moyenne' as UrgencyLevel,  label: 'Moyenne',  from: 'from-amber-400',  to: 'to-orange-500' },
    { value: 'critique' as UrgencyLevel, label: 'Critique', from: 'from-red-400',    to: 'to-rose-600' },
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
              value={companyId}
              onChange={(e) => { setCompanyId(e.target.value); setSelectedEquipment([]); setSelectedTechs([]) }}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choisir une entreprise…</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Titre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
            <label className="text-sm font-medium text-foreground">Niveau d'urgence</label>
            <div className="flex gap-2">
              {urgencyConfig.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => setUrgency(u.value)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                    urgency === u.value
                      ? `bg-gradient-to-br ${u.from} ${u.to} text-white border-transparent shadow-sm`
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {companyId && equipment.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Équipements concernés <span className="text-muted-foreground font-normal text-xs">(en panne)</span>
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {equipment.map((eq: any) => (
                  <label key={eq.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded-lg p-1.5">
                    <input
                      type="checkbox"
                      checked={selectedEquipment.includes(eq.id)}
                      onChange={() => toggleEquipment(eq.id)}
                      className="rounded"
                    />
                    <span className="text-foreground">{eq.name}</span>
                    {eq.category && <span className="text-muted-foreground text-xs">· {eq.category}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {companyId && technicians.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Affecter des techniciens</label>
              <div className="space-y-1 border border-border rounded-lg p-2">
                {technicians.map((t) => (
                  <label key={t.userId} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded-lg p-1.5">
                    <input
                      type="checkbox"
                      checked={selectedTechs.includes(t.userId)}
                      onChange={() => toggleTech(t.userId)}
                      className="rounded"
                    />
                    <span className="text-foreground">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              {createMutation.isPending ? 'Création…' : 'Créer l\'intervention'}
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
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; title: string } | null>(null)

  const { data: interventions = [], isLoading, error } = useAllInterventions()
  const { data: companies = [] } = useQuery({ queryKey: ['companies-list'], queryFn: fetchCompanies })
  const cancelMutation = useUpdateInterventionStatus()

  const filtered = interventions.filter((i: any) => {
    const matchSearch =
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.companies?.company_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || i.status === filterStatus
    const matchUrgency = !filterUrgency || i.urgency === filterUrgency
    const matchCompany = !filterCompany || i.company_id === filterCompany
    return matchSearch && matchStatus && matchUrgency && matchCompany
  })

  const stats = {
    total: interventions.filter((i: any) => i.status !== 'annulee').length,
    active: interventions.filter((i: any) => i.status === 'active').length,
    en_cours: interventions.filter((i: any) => i.status === 'en_cours').length,
    en_attente: interventions.filter((i: any) => i.status === 'en_attente_validation').length,
    cloturees: interventions.filter((i: any) => i.status === 'cloturee').length,
    critiques: interventions.filter((i: any) => i.urgency === 'critique' && ['active', 'en_cours'].includes(i.status)).length,
  }

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
            {stats.total} actives · {stats.en_cours} en cours · {stats.en_attente} en attente · {stats.cloturees} clôturées
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
          { label: 'Actives',    value: stats.active,    from: 'from-blue-500',   to: 'to-indigo-600',  textColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'En cours',   value: stats.en_cours,  from: 'from-orange-400', to: 'to-amber-500',   textColor: 'text-orange-600 dark:text-orange-400' },
          { label: 'En attente', value: stats.en_attente, from: 'from-purple-400', to: 'to-violet-500', textColor: 'text-purple-600 dark:text-purple-400' },
          { label: 'Critiques',  value: stats.critiques, from: 'from-red-400',    to: 'to-rose-500',    textColor: 'text-red-600 dark:text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className={`text-xl font-bold ${s.textColor}`}>{s.value}</p>
            <div className={`h-0.5 w-8 rounded-full bg-gradient-to-r ${s.from} ${s.to} mt-1 mb-1`} />
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
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
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Toutes les entreprises</option>
          {companies.map((c: any) => (
            <option key={c.id} value={c.id}>{c.company_name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Active</option>
          <option value="en_cours">En cours</option>
          <option value="en_attente_validation">En attente</option>
          <option value="cloturee">Clôturée</option>
          <option value="annulee">Annulée</option>
        </select>
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Urgence</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i: any) => (
                  <tr key={i.id} className={`border-b border-border hover:bg-accent/40 transition-colors ${URGENCY_ROW_ACCENT[i.urgency]}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {i.urgency === 'critique' && (
                          <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground line-clamp-1">{i.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {i.equipment_ids?.length ?? 0} équipement{(i.equipment_ids?.length ?? 0) > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-muted-foreground">{i.companies?.company_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_CLASS[i.urgency]}`}>
                        {URGENCY_LABEL[i.urgency]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[i.status]}`}>
                        {STATUS_LABEL[i.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">{formatDate(i.created_at)}</p>
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
                        {i.status !== 'cloturee' && i.status !== 'annulee' && (
                          <button
                            onClick={() => setCancelConfirm({ id: i.id, title: i.title })}
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
              <strong className="text-foreground">{cancelConfirm.title}</strong> sera marquée comme annulée.
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
                  cancelMutation.mutate({ id: cancelConfirm.id, status: 'annulee' })
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
