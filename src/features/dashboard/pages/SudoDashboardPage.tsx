// =============================================================
// SudoDashboardPage — Super-administrateur (super_admin)
// Contrôle global : stats, gestion admins, entreprises, validation.
// =============================================================
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users, Building2, Monitor, Wrench, Plus, Loader2, Shield,
  CheckCircle2, XCircle, ChevronRight, Search,
  FileText, AlertTriangle, BarChart3, RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { DonutChart } from '@/components/shared/DonutChart'
import { BarChart } from '@/components/shared/BarChart'

type AdminForm = { email: string; password: string; nom: string; prenom: string }

async function fetchSudoStats() {
  const results = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('utilisateurs').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('techniciens').select('*', { count: 'exact', head: true }),
    supabase.from('equipements').select('*', { count: 'exact', head: true }),
    supabase.from('interventions').select('*', { count: 'exact', head: true }),
    supabase.from('contrats').select('*', { count: 'exact', head: true }).eq('est_actif', true),
    supabase.from('utilisateurs').select('*', { count: 'exact', head: true })
      .eq('compte_valide', false).in('role', ['client', 'technicien']),
    supabase.from('interventions').select('*', { count: 'exact', head: true })
      .eq('urgence', 'critique').in('statut', ['planifiee', 'en_cours']),
    supabase.from('utilisateurs').select('id, nom, prenom, email, est_actif, cree_le')
      .eq('role', 'admin').order('cree_le', { ascending: false }),
    supabase.from('interventions')
      .select('id, titre, urgence, statut, cree_le, clients(nom_entreprise)')
      .in('statut', ['planifiee', 'en_cours', 'terminee'])
      .order('cree_le', { ascending: false })
      .limit(8),
    supabase.from('utilisateurs')
      .select('id, nom, prenom, email, role, cree_le, clients(nom_entreprise)')
      .eq('compte_valide', false)
      .in('role', ['client', 'technicien'])
      .order('cree_le', { ascending: false })
      .limit(10),
    supabase.from('equipements').select('*', { count: 'exact', head: true }).eq('etat', 'en_panne'),
    supabase.from('equipements').select('*', { count: 'exact', head: true }).eq('etat', 'maintenance'),
    supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('statut', 'planifiee'),
    supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('statut', 'en_cours'),
    supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('statut', 'terminee'),
    supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('statut', 'signee'),
  ])
  for (const r of results) {
    if (r.error) throw r.error
  }
  const [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16] = results
  const equipment = r3.count ?? 0
  const equipPanne = r11.count ?? 0
  const equipMaintenance = r12.count ?? 0
  return {
    companies:             r0.count ?? 0,
    admins:                r1.count ?? 0,
    techs:                 r2.count ?? 0,
    equipment,
    interventions:         r4.count ?? 0,
    contracts:             r5.count ?? 0,
    pendingUsers:          r6.count ?? 0,
    criticalInterventions: r7.count ?? 0,
    adminList:             r8.data ?? [],
    recentInterventions:   r9.data ?? [],
    pendingList:           r10.data ?? [],
    equipPanne,
    equipMaintenance,
    equipOperational:      Math.max(0, equipment - equipPanne - equipMaintenance),
    intPlanifiee:          r13.count ?? 0,
    intEnCours:            r14.count ?? 0,
    intTerminee:           r15.count ?? 0,
    intSignee:             r16.count ?? 0,
  }
}

async function fetchAllCompanies(search: string) {
  let q = supabase.from('clients')
    .select('id, nom_entreprise, ville, secteur, cree_le, utilisateurs!clients_utilisateur_id_fkey(nom, prenom, email, est_actif, compte_valide)')
    .order('cree_le', { ascending: false })
  if (search) q = q.ilike('nom_entreprise', `%${search}%`)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

const STATUS_LABEL: Record<string, string> = {
  planifiee: 'Planifiée', en_cours: 'En cours',
  terminee: 'À signer', signee: 'Clôturée', annulee: 'Annulée',
}
const STATUS_COLOR: Record<string, string> = {
  planifiee: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  en_cours: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  terminee: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  signee: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  annulee: 'bg-muted text-muted-foreground',
}
const URGENCY_DOT: Record<string, string> = {
  faible: 'bg-emerald-400', moyenne: 'bg-amber-400', critique: 'bg-red-500',
}

function StatCard({ icon: Icon, label, value, alert }: {
  icon: any; label: string; value: number; alert?: boolean
}) {
  return (
    <div className={`bg-card border rounded-lg p-4 flex items-center gap-3 ${alert && value > 0 ? 'border-amber-300 dark:border-amber-700' : 'border-border'}`}>
      <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${alert && value > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-primary/8'}`}>
        <Icon size={17} className={alert && value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary'} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}

type ActiveTab = 'overview' | 'admins' | 'companies' | 'pending'

export function SudoDashboardPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<ActiveTab>('overview')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<AdminForm>({ email: '', password: '', nom: '', prenom: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [companySearch, setCompanySearch] = useState('')

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['sudo-stats'],
    queryFn: fetchSudoStats,
    refetchInterval: 30_000,
  })

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['sudo-companies', companySearch],
    queryFn: () => fetchAllCompanies(companySearch),
    enabled: tab === 'companies',
  })

  const { mutate: doValidate } = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from('utilisateurs').update({ compte_valide: true, est_actif: true }).eq('id', userId)
      await supabase.from('notifications').insert({
        utilisateur_id: userId,
        titre: 'Compte validé',
        corps: 'Votre compte a été validé par un administrateur.',
        lien: '/',
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sudo-stats'] }),
  })

  const { mutate: doReject } = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from('utilisateurs').update({ est_actif: false }).eq('id', userId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sudo-stats'] }),
  })

  async function handleToggleAdmin(id: string, isActive: boolean) {
    await supabase.from('utilisateurs').update({ est_actif: !isActive }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['sudo-stats'] })
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password || !form.nom) {
      setFormError('Nom, email et mot de passe sont requis.')
      return
    }
    if (form.password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setFormError(null)
    setCreating(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-admin', {
        body: { email: form.email, password: form.password, nom: form.nom, prenom: form.prenom },
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      queryClient.invalidateQueries({ queryKey: ['sudo-stats'] })
      setShowCreate(false)
      setForm({ email: '', password: '', nom: '', prenom: '' })
    } catch (err: any) {
      setFormError(err?.message ?? 'Erreur lors de la création.')
    } finally {
      setCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-card border border-border rounded-xl p-6 text-center space-y-3">
        <AlertTriangle size={28} className="mx-auto text-amber-500" />
        <p className="text-sm font-medium text-foreground">Impossible de charger les statistiques</p>
        <p className="text-xs text-muted-foreground">{(error as Error)?.message ?? 'Données indisponibles'}</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['sudo-stats'] })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md text-xs font-medium"
        >
          <RefreshCw size={13} /> Réessayer
        </button>
      </div>
    )
  }

  const TABS = [
    { id: 'overview' as ActiveTab,  label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'admins'   as ActiveTab,  label: 'Administrateurs', icon: Shield },
    { id: 'companies' as ActiveTab, label: 'Entreprises',     icon: Building2 },
    { id: 'pending'  as ActiveTab,  label: `En attente${stats.pendingUsers > 0 ? ` (${stats.pendingUsers})` : ''}`, icon: AlertTriangle },
  ]

  return (
    <div className="space-y-5 page-transition max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/12 flex items-center justify-center">
            <Shield size={18} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Contrôle global</h1>
            <p className="text-xs text-muted-foreground">Accès complet à la plateforme IT-Access</p>
          </div>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['sudo-stats'] })}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw size={13} />
          Actualiser
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-0.5 bg-muted p-1 rounded-lg w-fit overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ===== VUE D'ENSEMBLE ===== */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Building2}     label="Entreprises"        value={stats.companies} />
            <StatCard icon={Users}         label="Techniciens"        value={stats.techs} />
            <StatCard icon={Monitor}       label="Équipements"        value={stats.equipment} />
            <StatCard icon={Wrench}        label="Interventions"      value={stats.interventions} />
            <StatCard icon={FileText}      label="Contrats actifs"    value={stats.contracts} />
            <StatCard icon={Shield}        label="Admins"             value={stats.admins} />
            <StatCard icon={AlertTriangle} label="Critiques actives"  value={stats.criticalInterventions} alert />
            <StatCard icon={Users}         label="Comptes en attente" value={stats.pendingUsers} alert />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DonutChart
              title="Parc équipements par état"
              centerLabel="Équip."
              data={[
                { label: 'Opérationnels', value: stats.equipOperational, color: '#10b981' },
                { label: 'Maintenance', value: stats.equipMaintenance, color: '#f59e0b' },
                { label: 'En panne', value: stats.equipPanne, color: '#ef4444' },
              ]}
            />
            <BarChart
              title="Interventions par statut"
              data={[
                { label: 'Planif.', value: stats.intPlanifiee, color: '#3b82f6' },
                { label: 'En cours', value: stats.intEnCours, color: '#f59e0b' },
                { label: 'À signer', value: stats.intTerminee, color: '#a855f7' },
                { label: 'Clôturées', value: stats.intSignee, color: '#10b981' },
              ]}
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Accès modération</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/sudo/utilisateurs',  label: 'Utilisateurs',  icon: Users },
                { to: '/sudo/interventions', label: 'Interventions', icon: Wrench },
                { to: '/sudo/equipements',   label: 'Équipements',   icon: Monitor },
                { to: '/sudo/historique',    label: 'Historique',    icon: FileText },
              ].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-md hover:bg-accent hover:border-primary/30 transition-all group"
                >
                  <Icon size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <ChevronRight size={13} className="ml-auto text-muted-foreground/50 group-hover:text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>

          {stats.recentInterventions.length > 0 && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold text-foreground">Interventions ouvertes</p>
              </div>
              <div className="divide-y divide-border">
                {stats.recentInterventions.map((i: any) => (
                  <Link
                    key={i.id}
                    to={`/sudo/interventions/${i.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${URGENCY_DOT[i.urgence] ?? 'bg-border'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{i.titre}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.clients?.nom_entreprise ?? '—'} · {new Date(i.cree_le).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_COLOR[i.statut] ?? ''}`}>
                      {STATUS_LABEL[i.statut] ?? i.statut}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ADMINISTRATEURS ===== */}
      {tab === 'admins' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {stats.adminList.length} administrateur{stats.adminList.length > 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus size={13} />
              Créer un admin
            </button>
          </div>

          {stats.adminList.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Aucun administrateur</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.adminList.map((admin: any) => (
                <div key={admin.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{(admin.prenom?.[0] ?? admin.nom?.[0] ?? '?').toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{`${admin.prenom ?? ''} ${admin.nom ?? ''}`.trim()}</p>
                      <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      admin.est_actif
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {admin.est_actif ? 'Actif' : 'Inactif'}
                    </span>
                    <button
                      onClick={() => handleToggleAdmin(admin.id, admin.est_actif)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        admin.est_actif
                          ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400'
                      }`}
                    >
                      {admin.est_actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ENTREPRISES ===== */}
      {tab === 'companies' && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher une entreprise…"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {companiesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : companies.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Aucune entreprise</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Entreprise</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Secteur / Ville</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Responsable</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Statut</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c: any) => {
                      const u = c['utilisateurs!clients_utilisateur_id_fkey'] ?? c.utilisateurs
                      return (
                        <tr key={c.id} className="border-b border-border hover:bg-accent/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-foreground">{c.nom_entreprise}</p>
                            <p className="text-xs text-muted-foreground">{new Date(c.cree_le).toLocaleDateString('fr-FR')}</p>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs text-muted-foreground">{c.secteur || '—'}</p>
                            <p className="text-xs text-muted-foreground">{c.ville || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-foreground">{u ? `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || '—' : '—'}</p>
                            <p className="text-xs text-muted-foreground">{u?.email ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            {u?.compte_valide
                              ? <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium">Validée</span>
                              : <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-medium">En attente</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to="/sudo/utilisateurs" className="text-xs text-primary hover:underline">
                              Gérer
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== EN ATTENTE ===== */}
      {tab === 'pending' && (
        <div className="space-y-3">
          {stats.pendingList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-muted-foreground">Aucun compte en attente de validation</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold text-foreground">
                  {stats.pendingList.length} compte{stats.pendingList.length > 1 ? 's' : ''} à valider
                </p>
              </div>
              <div className="divide-y divide-border">
                {stats.pendingList.map((user: any) => (
                  <div key={user.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
                        {(user.prenom?.[0] ?? user.nom?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.clients?.nom_entreprise ?? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim()}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs text-primary mt-0.5 capitalize">{user.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => doValidate(user.id)}
                        title="Valider"
                        className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button
                        onClick={() => doReject(user.id)}
                        title="Refuser"
                        className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL CRÉATION ADMIN ===== */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowCreate(false); setFormError(null) }}
        >
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Shield size={15} className="text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">Créer un administrateur</h2>
            </div>
            {formError && (
              <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{formError}</p>
            )}
            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" placeholder="Prénom"
                  value={form.prenom}
                  onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="text" placeholder="Nom"
                  value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <input
                type="email" placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="password" placeholder="Mot de passe (min. 8 caractères)"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setFormError(null) }}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-60 hover:bg-primary/90 transition-colors"
                >
                  {creating ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
