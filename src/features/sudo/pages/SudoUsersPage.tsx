// =============================================================
// SudoUsersPage — Gestion complète des utilisateurs (Sudo)
//
// Onglets : En attente | Entreprises | Techniciens | Admins
// Actions : Valider, Désactiver, Supprimer, Affecter technicien
// Différence vs AdminUsersPage : le sudo voit les admins et peut tout faire
// =============================================================
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, XCircle, Trash2, UserPlus,
  Search, Building2, Wrench, Clock, Shield, RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { logAuditAction } from '@/lib/audit'

type Tab = 'pending' | 'companies' | 'technicians' | 'admins'

// ----- Fetch helpers -----

async function fetchUsers(tab: Tab) {
  if (tab === 'pending') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, is_validated, is_active, created_at')
      .eq('is_validated', false)
      .in('role', ['entreprise', 'technicien'])
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  if (tab === 'companies') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, is_validated, is_active, created_at, companies(id, company_name, city, sector)')
      .eq('role', 'entreprise')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  if (tab === 'technicians') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, is_validated, is_active, created_at, technicians(id, specialty)')
      .eq('role', 'technicien')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  // admins
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, is_validated, is_active, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchCompaniesForAssignment() {
  const { data } = await supabase.from('companies').select('id, company_name').order('company_name')
  return data ?? []
}

async function validateUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_validated: true, is_active: true })
    .eq('id', userId)
  if (error) throw error
  await supabase.from('notifications').insert({
    user_id: userId, type: 'account_validated',
    title: 'Compte validé',
    body: "Votre compte a été validé. Vous pouvez maintenant accéder à l'application.",
    link: '/',
  })
}

async function toggleActive(userId: string, current: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: !current })
    .eq('id', userId)
  if (error) throw error
}

async function deleteUser(userId: string) {
  await logAuditAction({
    action: 'users.delete_requested',
    entityType: 'profiles',
    entityId: userId,
    details: { source: 'sudo_panel' },
  })
  const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

async function assignTechnician(techUserId: string, companyId: string, assignedBy: string) {
  const { data: tech } = await supabase
    .from('technicians').select('id').eq('user_id', techUserId).single()
  if (!tech) throw new Error('Technicien introuvable')
  const { error } = await supabase.from('assignments').upsert(
    { technician_id: tech.id, company_id: companyId, assigned_by: assignedBy },
    { onConflict: 'technician_id,company_id' }
  )
  if (error) throw error
}

// ----- UI -----

function Badge({ label, variant }: { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }) {
  const cls = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls[variant]}`}>
      {label}
    </span>
  )
}

function AssignModal({ techUserId, onClose, assignedBy }: { techUserId: string; onClose: () => void; assignedBy: string }) {
  const queryClient = useQueryClient()
  const [selectedCompany, setSelectedCompany] = useState('')
  const { data: companies = [] } = useQuery({
    queryKey: ['companies-for-assignment'],
    queryFn: fetchCompaniesForAssignment,
  })
  const { mutate, isPending } = useMutation({
    mutationFn: () => assignTechnician(techUserId, selectedCompany, assignedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sudo-users'] })
      onClose()
    },
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-semibold text-foreground">Affecter à une entreprise</h3>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Choisir une entreprise…</option>
          {companies.map((c: any) => (
            <option key={c.id} value={c.id}>{c.company_name}</option>
          ))}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
            Annuler
          </button>
          <button
            onClick={() => mutate()}
            disabled={!selectedCompany || isPending}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
            Affecter
          </button>
        </div>
      </div>
    </div>
  )
}

// ----- Page -----

export function SudoUsersPage() {
  const location = useLocation()
  const defaultTab = (location.state as { defaultTab?: Tab } | null)?.defaultTab
  const { profile: me } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>(
    defaultTab === 'companies' || defaultTab === 'technicians' || defaultTab === 'admins'
      ? defaultTab
      : 'pending'
  )
  const [search, setSearch] = useState('')
  const [assignTarget, setAssignTarget] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sudo-users', tab],
    queryFn: () => fetchUsers(tab),
  })

  const { mutate: doValidate } = useMutation({
    mutationFn: validateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sudo-users'] }),
  })
  const { mutate: doToggle } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sudo-users'] }),
  })
  const { mutate: doDelete } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sudo-users'] })
      queryClient.invalidateQueries({ queryKey: ['sudo-stats'] })
      setDeleteConfirm(null)
    },
  })

  const filtered = users.filter((u: any) => {
    const name = (u.companies?.company_name ?? u.full_name ?? '').toLowerCase()
    return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  })

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'pending',     label: 'En attente',  icon: Clock },
    { id: 'companies',   label: 'Entreprises', icon: Building2 },
    { id: 'technicians', label: 'Techniciens', icon: Wrench },
    { id: 'admins',      label: 'Admins',      icon: Shield },
  ]

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tous les comptes de la plateforme</p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-accent transition-colors">
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-full sm:w-fit overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setSearch('') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
          Erreur : {(error as Error).message}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {tab === 'pending' ? 'Aucun compte en attente de validation' : 'Aucun résultat'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom / Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    {tab === 'companies' ? 'Entreprise' : tab === 'technicians' ? 'Spécialité' : 'Téléphone'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Inscrit le</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user: any) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">
                        {tab === 'companies'
                          ? (user.companies?.company_name ?? '—')
                          : tab === 'technicians'
                          ? (user.technicians?.specialty ?? '—')
                          : (user.phone ?? '—')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {!user.is_validated
                        ? <Badge label="En attente" variant="warning" />
                        : user.is_active
                        ? <Badge label="Actif" variant="success" />
                        : <Badge label="Désactivé" variant="danger" />}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {!user.is_validated && (
                          <button onClick={() => doValidate(user.id)} title="Valider"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {tab === 'technicians' && user.is_validated && (
                          <button onClick={() => setAssignTarget(user.id)} title="Affecter"
                            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                            <UserPlus size={16} />
                          </button>
                        )}
                        {/* Ne pas désactiver un autre sudo */}
                        {user.role !== 'sudo' && (
                          <button
                            onClick={() => doToggle({ id: user.id, active: user.is_active })}
                            title={user.is_active ? 'Désactiver' : 'Réactiver'}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                            <XCircle size={16} />
                          </button>
                        )}
                        {/* Sudo peut supprimer tout le monde sauf lui-même */}
                        {user.id !== me?.id && (
                          <button onClick={() => setDeleteConfirm(user.id)} title="Supprimer"
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 size={16} />
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

      {/* Modals */}
      {assignTarget && (
        <AssignModal
          techUserId={assignTarget}
          assignedBy={me!.id}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-foreground">Supprimer cet utilisateur ?</h3>
            <p className="text-sm text-muted-foreground">Action irréversible. Toutes les données associées seront supprimées.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
                Annuler
              </button>
              <button onClick={() => doDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
