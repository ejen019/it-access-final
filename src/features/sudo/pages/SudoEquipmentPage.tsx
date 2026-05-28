// =============================================================
// SudoEquipmentPage — Vue globale des équipements (Sudo)
//
// Affiche tous les équipements de toutes les entreprises.
// Filtres : entreprise, statut, catégorie, recherche.
// Vue lecture + lien passeport.
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Monitor, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// ----- Fetch -----

async function fetchAllEquipment() {
  const { data, error } = await supabase
    .from('equipment')
    .select('id, name, model, serial_number, status, category, location, created_at, companies(id, company_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchCompanies() {
  const { data } = await supabase
    .from('companies')
    .select('id, company_name')
    .order('company_name')
  return data ?? []
}

// ----- Page -----

export function SudoEquipmentPage() {
  const [search, setSearch] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const { data: equipment = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sudo-equipment'],
    queryFn: fetchAllEquipment,
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['sudo-companies-list'],
    queryFn: fetchCompanies,
  })

  const filtered = equipment.filter((e: any) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
      || (e.serial_number ?? '').toLowerCase().includes(search.toLowerCase())
      || (e.model ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCompany = !filterCompany || e.companies?.id === filterCompany
    const matchStatus = !filterStatus || e.status === filterStatus
    return matchSearch && matchCompany && matchStatus
  })

  const stats = {
    total: equipment.length,
    operationnel: equipment.filter((e: any) => e.status === 'operationnel').length,
    en_panne: equipment.filter((e: any) => e.status === 'en_panne').length,
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Équipements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} équipement{stats.total > 1 ? 's' : ''}
            {stats.en_panne > 0 && <span className="text-red-500 ml-2">· {stats.en_panne} en panne</span>}
          </p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-accent transition-colors">
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Opérationnels', value: stats.operationnel },
          { label: 'En panne', value: stats.en_panne, alert: stats.en_panne > 0 },
        ].map(({ label, value, alert }) => (
          <div key={label}
            className={`bg-card border rounded-lg p-4 ${alert ? 'border-red-300 dark:border-red-700' : 'border-border'}`}>
            <p className={`text-2xl font-bold ${alert ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[16rem]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Nom, modèle, n° série…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Toutes les entreprises</option>
          {companies.map((c: any) => (
            <option key={c.id} value={c.id}>{c.company_name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tous les statuts</option>
          <option value="operationnel">Opérationnel</option>
          <option value="en_panne">En panne</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle size={16} />
          {(error as Error).message}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Monitor size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Aucun équipement trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Équipement</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Entreprise</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Catégorie</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Passeport</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((eq: any) => (
                  <tr key={eq.id} className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{eq.name}</p>
                      {eq.model && <p className="text-xs text-muted-foreground">{eq.model}</p>}
                      {eq.serial_number && (
                        <p className="text-xs text-muted-foreground/70">S/N: {eq.serial_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">{eq.companies?.company_name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        eq.status === 'operationnel'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {eq.status === 'operationnel' ? 'Opérationnel' : 'En panne'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">{eq.category ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/sudo/equipements/${eq.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/8 text-primary hover:bg-primary/15 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
