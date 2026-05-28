// =============================================================
// UsersPage — Gestion des utilisateurs (Admin / Sudo)
//
// Onglets : En attente | Entreprises | Techniciens
// Actions : Valider, Désactiver, Supprimer, Affecter technicien
// =============================================================
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, XCircle, Trash2, UserPlus,
  Search, Building2, Wrench, Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { logAuditAction } from '@/lib/audit'

type Tab = 'pending' | 'companies' | 'technicians'

async function fetchProfiles(tab: Tab) {
  if (tab === 'pending') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, is_validated, is_active, created_at, companies(id, company_name), technicians(id, specialty)')
      .eq('is_validated', false)
      .in('role', ['entreprise', 'technicien'])
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  if (tab === 'companies') {
    // Jointure simplifiée : sans le triple-niveau contracts pour éviter les erreurs PostgREST
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, is_validated, is_active, created_at, companies(id, company_name, city, sector, contract_id)')
      .eq('role', 'entreprise')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  // Techniciens : jointure sur technicians + assignments simplifiée
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, is_validated, is_active, created_at, technicians(id, specialty, assignments(id, company_id))')
    .eq('role', 'technicien')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchCompaniesForAssignment() {
  const { data } = await supabase.from('companies').select('id, company_name')
  return data ?? []
}

async function validateUser(userId: string) {
  // is_active: true explicite pour rattraper les comptes qui auraient été désactivés avant validation
  await supabase.from('profiles').update({ is_validated: true, is_active: true }).eq('id', userId)
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'account_validated',
    title: 'Compte validé',
    body: "Votre compte a été validé. Vous pouvez maintenant accéder à l'application.",
    link: '/',
  })
}

async function toggleActive(userId: string, isActive: boolean) {
  await supabase.from('profiles').update({ is_active: !isActive }).eq('id', userId)
}

async function deleteUser(userId: string) {
  await logAuditAction({
    action: 'users.delete_requested',
    entityType: 'profiles',
    entityId: userId,
    details: { source: 'admin_panel' },
  })
  // Appelle la Edge Function qui supprime auth.users (cascade vers profiles/companies/etc.)
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { userId },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

async function assignTechnician(techUserId: string, companyId: string, assignedBy: string) {
  const { data: tech } = await supabase
    .from('technicians').select('id').eq('user_id', techUserId).single()
  if (!tech) throw new Error('Technicien introuvable')
  await supabase.from('assignments').upsert(
    { technician_id: tech.id, company_id: companyId, assigned_by: assignedBy },
    { onConflict: 'technician_id,company_id' }
  )
}

function Badge({ label, variant }: { label: string; variant: 'success' | 'warning' | 'danger' }) {
  const cls = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls[variant]}`}>
      {label}
    </span>
  )
}

function AssignModal({ techUserId, onClose }: { techUserId: string; onClose: () => void }) {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedCompany, setSelectedCompany] = useState('')
  const { data: companies = [] } = useQuery({
    queryKey: ['companies-for-assignment'],
    queryFn: fetchCompaniesForAssignment,
  })
  const { mutate, isPending } = useMutation({
    mutationFn: () => assignTechnician(techUserId, selectedCompany, profile!.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); onClose() },
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
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
            Annuler
          </button>
          <button
            onClick={() => mutate()}
            disabled={!selectedCompany || isPending}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
          >
            Affecter
          </button>
        </div>
      </div>
    </div>
  )
}

export function UsersPage() {
  const { profile: me } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [assignTarget, setAssignTarget] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users', tab],
    queryFn: () => fetchProfiles(tab),
  })

  const { mutate: doValidate } = useMutation({
    mutationFn: validateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
  const { mutate: doToggle } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
  const { mutate: doDelete } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
      setDeleteConfirm(null)
    },
  })

  const filtered = users.filter((u: any) => {
    const name = (u.companies?.company_name ?? u.full_name ?? '').toLowerCase()
    return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  })

  const TABS = [
    { id: 'pending' as Tab, label: 'En attente', icon: Clock },
    { id: 'companies' as Tab, label: 'Entreprises', icon: Building2 },
    { id: 'technicians' as Tab, label: 'Techniciens', icon: Wrench },
  ]

  return (
    <div className="space-y-6 page-transition">
      <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

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

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          Erreur de chargement : {(error as Error).message}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {tab === 'pending' ? 'Aucun compte en attente' : 'Aucun résultat'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nom / Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Téléphone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Depuis</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user: any) => (
                  <tr key={user.id} className="border-b border-border hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {user.companies?.company_name ?? user.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {tab === 'technicians' && user.technicians?.assignments?.length > 0 && (
                        <p className="text-xs text-primary mt-0.5">
                          {user.technicians.assignments.length} entreprise{user.technicians.assignments.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">{user.phone ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {!user.is_validated
                        ? <Badge label="En attente" variant="warning" />
                        : user.is_active
                          ? <Badge label="Actif" variant="success" />
                          : <Badge label="Désactivé" variant="danger" />
                      }
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
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {tab === 'technicians' && user.is_validated && (
                          <button onClick={() => setAssignTarget(user.id)} title="Affecter"
                            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                            <UserPlus size={16} />
                          </button>
                        )}
                        <button onClick={() => doToggle({ id: user.id, active: user.is_active })} title={user.is_active ? 'Désactiver' : 'Réactiver'}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                          <XCircle size={16} />
                        </button>
                        {/* Sudo peut supprimer tout le monde, Admin ne peut pas supprimer un Sudo */}
                        {(me?.role === 'sudo' || user.role !== 'sudo') && (
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

      {assignTarget && (
        <AssignModal techUserId={assignTarget} onClose={() => setAssignTarget(null)} />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-foreground">Supprimer cet utilisateur ?</h3>
            <p className="text-sm text-muted-foreground">Action irréversible. Toutes les données associées seront perdues.</p>
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
