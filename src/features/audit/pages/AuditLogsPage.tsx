import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, History, Download, Calendar, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const ACTION_LABEL: Record<string, string> = {
  creation: 'Création', modification: 'Modification', suppression: 'Suppression',
}

function actionBadge(action: string): string {
  const a = action.toLowerCase()
  if (a.includes('creation') || a.includes('create')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  if (a.includes('suppression') || a.includes('delete')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  if (a.includes('modification') || a.includes('update')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
}

function prettyAction(action: string): string {
  // "equipements.modification" → "Modification" ; sinon brut
  const part = action.split('.').pop() ?? action
  return ACTION_LABEL[part] ?? action
}

function toCSV(rows: any[]): string {
  const header = ['Date', 'Utilisateur', 'Email', 'Rôle', 'Action', 'Entité', 'ID entité', 'Détails']
  const esc = (v: unknown) => {
    const s = String(v ?? '').replace(/"/g, '""')
    return `"${s}"`
  }
  const lines = rows.map((log) => [
    formatDateTime(log.cree_le),
    log.utilisateurs ? `${log.utilisateurs.prenom ?? ''} ${log.utilisateurs.nom ?? ''}`.trim() : 'Utilisateur supprimé',
    log.utilisateurs?.email ?? log.acteur_id ?? '',
    log.role_acteur ?? '',
    log.action,
    log.type_entite,
    log.entite_id ?? '',
    JSON.stringify(log.details ?? {}),
  ].map(esc).join(','))
  return [header.map(esc).join(','), ...lines].join('\r\n')
}

function downloadCSV(rows: any[]) {
  const csv = '﻿' + toCSV(rows) // BOM pour Excel/accents
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `historique_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['journaux-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journaux_audit')
        .select('id, acteur_id, role_acteur, action, type_entite, entite_id, details, cree_le, utilisateurs(nom, prenom, email)')
        .order('cree_le', { ascending: false })
        .limit(1000)
      if (error) throw error
      return data ?? []
    },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null
    const toTs = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null
    return logs.filter((log: any) => {
      const ts = new Date(log.cree_le).getTime()
      if (fromTs && ts < fromTs) return false
      if (toTs && ts > toTs) return false
      if (!q) return true
      const actor = `${log.utilisateurs?.prenom ?? ''} ${log.utilisateurs?.nom ?? ''} ${log.utilisateurs?.email ?? ''}`.toLowerCase()
      const line = `${log.action} ${log.type_entite} ${log.entite_id ?? ''} ${log.role_acteur ?? ''}`.toLowerCase()
      return actor.includes(q) || line.includes(q)
    })
  }, [logs, search, dateFrom, dateTo])

  const hasFilters = search || dateFrom || dateTo

  return (
    <div className="space-y-5 page-transition">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
            <History size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Historique global</h1>
            <p className="text-sm text-muted-foreground">Traçabilité de toutes les actions métier · du plus récent au plus ancien</p>
          </div>
        </div>
        <button
          onClick={() => downloadCSV(filtered)}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Download size={15} />
          Télécharger ({filtered.length})
        </button>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par action, entité, utilisateur…"
            className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="relative">
          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Date de début"
          />
        </div>
        <div className="relative">
          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Date de fin"
          />
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
          <button
            onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <X size={12} /> Réinitialiser
          </button>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : error ? (
          <p className="p-8 text-center text-sm text-destructive">Erreur: {(error as Error).message}</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aucun évènement</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Quand</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qui</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entité</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Détails</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log: any) => (
                  <tr key={log.id} className="border-b border-border align-top hover:bg-accent/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.cree_le)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {log.utilisateurs ? `${log.utilisateurs.prenom ?? ''} ${log.utilisateurs.nom}`.trim() : 'Utilisateur supprimé'}
                      </p>
                      <p className="text-xs text-muted-foreground">{log.utilisateurs?.email ?? log.acteur_id}</p>
                      <p className="text-[11px] text-muted-foreground uppercase mt-0.5">{log.role_acteur ?? 'inconnu'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${actionBadge(log.action)}`}>
                        {prettyAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <p className="text-foreground">{log.type_entite}</p>
                      {log.entite_id && <p className="text-[11px] font-mono text-muted-foreground/70 truncate max-w-[140px]">{log.entite_id}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[320px]">
                      <details className="group">
                        <summary className="cursor-pointer text-primary hover:underline list-none select-none">
                          Voir les détails
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] max-h-48 overflow-y-auto bg-muted/40 rounded-lg p-2">
                          {JSON.stringify(log.details ?? {}, null, 2)}
                        </pre>
                      </details>
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
