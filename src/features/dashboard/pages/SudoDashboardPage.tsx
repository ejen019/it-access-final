// =============================================================
// SudoDashboardPage — Super-administrateur (Sudo)
//
// Modérateur complet : stats globales, gestion admins,
// entreprises, techniciens, interventions, équipements.
// Le sudo a un droit de regard et d'action sur TOUT.
// =============================================================
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users, Building2, Monitor, Wrench, Plus, Loader2, Shield,
  CheckCircle2, XCircle, ChevronRight, Search,
  FileText, AlertTriangle, BarChart3, RefreshCw, Settings,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { fetchPublicConfig, savePublicConfig, type PublicAppConfig } from '@/lib/publicConfig'
import { SimpleBarChart } from '@/components/shared/SimpleBarChart'

// ----- Types locaux -----
type AdminForm = { email: string; password: string; full_name: string }

// ----- Helpers Supabase -----

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
  ])
  for (const r of results) {
    if (r.error) throw r.error
  }
  const [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10] = results
  return {
    companies:             r0.count ?? 0,
    admins:                r1.count ?? 0,
    techs:                 r2.count ?? 0,
    equipment:             r3.count ?? 0,
    interventions:         r4.count ?? 0,
    contracts:             r5.count ?? 0,
    pendingUsers:          r6.count ?? 0,
    criticalInterventions: r7.count ?? 0,
    adminList:             r8.data ?? [],
    recentInterventions:   r9.data ?? [],
    pendingList:           r10.data ?? [],
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

// ----- Composants UI -----

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

function StatCard({ icon: Icon, label, value, sub, alert }: {
  icon: any; label: string; value: number; sub?: string; alert?: boolean
}) {
  return (
    <div className={`bg-card border rounded-lg p-4 flex items-center gap-3 ${alert && value > 0 ? 'border-amber-300 dark:border-amber-700' : 'border-border'}`}>
      <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${alert && value > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-primary/8'}`}>
        <Icon size={17} className={alert && value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary'} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ----- Page principale -----

type ActiveTab = 'overview' | 'admins' | 'companies' | 'pending' | 'settings'

export function SudoDashboardPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<ActiveTab>('overview')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<AdminForm>({ email: '', password: '', full_name: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [configDraft, setConfigDraft] = useState<PublicAppConfig | null>(null)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['sudo-stats'],
    queryFn: fetchSudoStats,
    refetchInterval: 30_000,
  })

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['sudo-companies', companySearch],
    queryFn: () => fetchAllCompanies(companySearch),
    enabled: tab === 'companies',
  })
  const { data: publicConfig } = useQuery({
    queryKey: ['public-config'],
    queryFn: fetchPublicConfig,
    enabled: tab === 'settings',
  })
  const { mutate: saveConfig, isPending: savingConfig } = useMutation({
    mutationFn: savePublicConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-config'] })
    },
  })

  // Validation / désactivation d'un utilisateur depuis l'onglet pending
  const { mutate: doValidate } = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from('utilisateurs').update({ compte_valide: true, est_actif: true }).eq('id', userId)
      await supabase.from('notifications').insert({
        utilisateur_id: userId,
        titre: 'Compte validé',
        corps: "Votre compte a été validé par un administrateur.",
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
    if (!form.email || !form.password || !form.full_name) {
      setFormError('Tous les champs sont requis.')
      return
    }
    if (form.password.length < 6) {
      setFormError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setFormError(null)
    setCreating(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-admin', {
        body: { email: form.email, password: form.password, full_name: form.full_name },
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      queryClient.invalidateQueries({ queryKey: ['sudo-stats'] })
      setShowCreate(false)
      setForm({ email: '', password: '', full_name: '' })
    } catch (err: any) {
      setFormError(err?.message ?? 'Erreur lors de la création.')
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    if (tab === 'settings' && publicConfig) setConfigDraft(publicConfig)
  }, [tab, publicConfig])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  const TABS = [
    { id: 'overview' as ActiveTab,  label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'admins'   as ActiveTab,  label: 'Administrateurs', icon: Shield },
    { id: 'companies' as ActiveTab, label: 'Entreprises',     icon: Building2 },
    { id: 'pending'  as ActiveTab,  label: `En attente${(stats?.pendingUsers ?? 0) > 0 ? ` (${stats!.pendingUsers})` : ''}`, icon: AlertTriangle },
    { id: 'settings' as ActiveTab, label: 'Vitrine & Pricing', icon: Settings },
  ]

  return (
    <div className="p-6 space-y-5 page-transition max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Sudo — Contrôle global</h1>
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
      <div className="flex gap-0.5 bg-muted p-1 rounded-lg w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
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
            <StatCard icon={Building2}    label="Entreprises"      value={stats!.companies} />
            <StatCard icon={Users}        label="Techniciens"      value={stats!.techs} />
            <StatCard icon={Monitor}      label="Équipements"      value={stats!.equipment} />
            <StatCard icon={Wrench}       label="Interventions"    value={stats!.interventions} />
            <StatCard icon={FileText}     label="Contrats actifs"  value={stats!.contracts} />
            <StatCard icon={Shield}       label="Admins"           value={stats!.admins} />
            <StatCard icon={AlertTriangle} label="Critiques actives" value={stats!.criticalInterventions} alert />
            <StatCard icon={Users}        label="Comptes en attente" value={stats!.pendingUsers} alert />
          </div>
          <SimpleBarChart
            title="Distribution globale"
            items={[
              { label: 'Entreprises', value: stats!.companies },
              { label: 'Techniciens', value: stats!.techs, tone: 'success' },
              { label: 'Equipements', value: stats!.equipment, tone: 'primary' },
              { label: 'Interventions', value: stats!.interventions, tone: 'warning' },
            ]}
          />

          {/* Accès rapide vers l'espace Admin */}
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Accès modération</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/sudo/utilisateurs',  label: 'Utilisateurs',  icon: Users },
                { to: '/sudo/interventions', label: 'Interventions', icon: Wrench },
                { to: '/sudo/equipements',   label: 'Équipements',   icon: Monitor },
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

          {/* Interventions ouvertes récentes */}
          {stats!.recentInterventions.length > 0 && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold text-foreground">Interventions ouvertes</p>
              </div>
              <div className="divide-y divide-border">
                {stats!.recentInterventions.map((i: any) => (
                  <Link
                    key={i.id}
                    to={`/admin/interventions/${i.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${URGENCY_DOT[i.urgence]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{i.titre}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.clients?.nom_entreprise} · {new Date(i.cree_le).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_COLOR[i.statut]}`}>
                      {STATUS_LABEL[i.statut]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== VITRINE / PRICING ===== */}
      {tab === 'settings' && configDraft && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Contenu public</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={configDraft.hero_title}
                onChange={(e) => setConfigDraft({ ...configDraft, hero_title: e.target.value })}
                className="px-3 py-2 border border-input rounded-lg bg-background text-sm"
                placeholder="Titre principal"
              />
              <input
                value={configDraft.hero_subtitle}
                onChange={(e) => setConfigDraft({ ...configDraft, hero_subtitle: e.target.value })}
                className="px-3 py-2 border border-input rounded-lg bg-background text-sm"
                placeholder="Sous-titre"
              />
              <input
                value={configDraft.contact_email}
                onChange={(e) => setConfigDraft({ ...configDraft, contact_email: e.target.value })}
                className="px-3 py-2 border border-input rounded-lg bg-background text-sm"
                placeholder="Email contact"
              />
              <input
                value={configDraft.contact_phone}
                onChange={(e) => setConfigDraft({ ...configDraft, contact_phone: e.target.value })}
                className="px-3 py-2 border border-input rounded-lg bg-background text-sm"
                placeholder="Telephone contact"
              />
              <input
                value={configDraft.contact_whatsapp}
                onChange={(e) => setConfigDraft({ ...configDraft, contact_whatsapp: e.target.value })}
                className="px-3 py-2 border border-input rounded-lg bg-background text-sm"
                placeholder="WhatsApp (format international)"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Tarification (tests)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['starter', 'medium', 'premium'] as const).map((plan) => (
                <div key={plan} className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-sm font-semibold text-foreground capitalize">{plan}</p>
                  <input
                    type="number"
                    value={configDraft.pricing[plan].price_fcfa}
                    onChange={(e) => setConfigDraft({
                      ...configDraft,
                      pricing: {
                        ...configDraft.pricing,
                        [plan]: { ...configDraft.pricing[plan], price_fcfa: Number(e.target.value || 0) },
                      },
                    })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
                    placeholder="Prix annuel FCFA"
                  />
                  <input
                    type="number"
                    value={configDraft.pricing[plan].max_equipment}
                    onChange={(e) => setConfigDraft({
                      ...configDraft,
                      pricing: {
                        ...configDraft.pricing,
                        [plan]: { ...configDraft.pricing[plan], max_equipment: Number(e.target.value || 0) },
                      },
                    })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
                    placeholder="Nb equipements"
                  />
                  <input
                    type="number"
                    value={configDraft.pricing[plan].max_technicians}
                    onChange={(e) => setConfigDraft({
                      ...configDraft,
                      pricing: {
                        ...configDraft.pricing,
                        [plan]: { ...configDraft.pricing[plan], max_technicians: Number(e.target.value || 0) },
                      },
                    })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
                    placeholder="Nb techniciens"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => saveConfig(configDraft)}
              disabled={savingConfig}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              {savingConfig ? 'Enregistrement…' : 'Enregistrer la configuration'}
            </button>
          </div>
        </div>
      )}

      {/* ===== ADMINISTRATEURS ===== */}
      {tab === 'admins' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {stats!.adminList.length} administrateur{stats!.adminList.length > 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus size={13} />
                Créer un admin
              </button>
            </div>

            {stats!.adminList.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Aucun administrateur</p>
            ) : (
              <div className="divide-y divide-border">
                {stats!.adminList.map((admin: any) => (
                  <div key={admin.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{admin.nom?.[0]?.toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{admin.nom} {admin.prenom}</p>
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
                      const utilisateur = c['utilisateurs!clients_utilisateur_id_fkey']
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
                            <p className="text-xs text-foreground">{utilisateur ? `${utilisateur.nom} ${utilisateur.prenom ?? ''}`.trim() : '—'}</p>
                            <p className="text-xs text-muted-foreground">{utilisateur?.email ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            {utilisateur?.compte_valide
                              ? <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium">Validée</span>
                              : <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-medium">En attente</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to="/sudo/utilisateurs"
                              state={{ defaultTab: 'companies' }}
                              className="text-xs text-primary hover:underline"
                            >
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
          {(stats?.pendingList?.length ?? 0) === 0 ? (
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
                  {stats!.pendingList.length} compte{stats!.pendingList.length > 1 ? 's' : ''} à valider
                </p>
              </div>
              <div className="divide-y divide-border">
                {stats!.pendingList.map((user: any) => (
                  <div key={user.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
                        {user.nom?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user['clients']?.nom_entreprise ?? `${user.nom} ${user.prenom ?? ''}`.trim()}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
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
              {(['full_name', 'email', 'password'] as const).map((field) => (
                <input
                  key={field}
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  placeholder={field === 'full_name' ? 'Nom complet' : field === 'email' ? 'Email' : 'Mot de passe'}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ))}
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
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60 hover:bg-primary/90 transition-colors"
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
