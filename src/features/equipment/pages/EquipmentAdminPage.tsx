// =============================================================
// EquipmentAdminPage — Vue équipements pour l'Administrateur
//
// Liste tous les équipements de toutes les entreprises.
// Filtres par entreprise, statut, catégorie.
// Actions : Créer, Voir passeport, Supprimer, Importer en masse (IA)
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Monitor, Trash2, QrCode, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAllEquipment, useDeleteEquipment } from '../hooks/useEquipment'
import { EquipmentForm } from '../components/EquipmentForm'
import { BulkImportModal } from '../components/BulkImportModal'
import { printQRCode } from '@/lib/utils/qrcode'

async function fetchCompanies() {
  const { data, error } = await supabase.from('companies').select('id, company_name')
  if (error) throw error
  return data ?? []
}

export function EquipmentAdminPage() {
  const [search, setSearch] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createCompanyId, setCreateCompanyId] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; companyId: string; name: string } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importCompanyId, setImportCompanyId] = useState('')
  const [pendingImportCompany, setPendingImportCompany] = useState('')

  const { data: equipment = [], isLoading, error } = useAllEquipment()
  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    queryFn: fetchCompanies,
  })
  const deleteMutation = useDeleteEquipment()

  const filtered = equipment.filter((e: any) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
      || (e.serial_number ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCompany = !filterCompany || e.company_id === filterCompany
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
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          Erreur de chargement : {(error as Error).message}
        </div>
      )}
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Équipements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} total · {stats.operationnel} opérationnels · {stats.en_panne} en panne
          </p>
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

      {/* Filtres */}
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
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="w-full sm:w-auto px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Toutes les entreprises</option>
          {companies.map((c: any) => (
            <option key={c.id} value={c.id}>{c.company_name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-auto px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tous les statuts</option>
          <option value="operationnel">Opérationnel</option>
          <option value="en_panne">En panne</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aucun équipement trouvé</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Équipement</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Entreprise</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
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
                          <p className="text-sm font-medium text-foreground">{e.name}</p>
                          {e.serial_number && (
                            <p className="text-xs text-muted-foreground">SN: {e.serial_number}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-muted-foreground">{e.companies?.company_name}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-sm text-muted-foreground">{e.category ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.status === 'operationnel' ? 'status-operationnel' : 'status-en-panne'
                      }`}>
                        {e.status === 'operationnel' ? 'Opérationnel' : 'En panne'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => printQRCode(e.id, e.name)}
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
                          onClick={() => setDeleteConfirm({ id: e.id, companyId: e.company_id, name: e.name })}
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

      {/* Modal import IA — sélection entreprise puis BulkImportModal */}
      {showImport && !importCompanyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-foreground">Import IA — Entreprise cible</h3>
            <select
              value={pendingImportCompany}
              onChange={(e) => setPendingImportCompany(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choisir une entreprise…</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowImport(false); setPendingImportCompany('') }}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                disabled={!pendingImportCompany}
                onClick={() => setImportCompanyId(pendingImportCompany)}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-60"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
      {showImport && importCompanyId && (
        <BulkImportModal
          companyId={importCompanyId}
          onClose={() => { setShowImport(false); setImportCompanyId(''); setPendingImportCompany('') }}
        />
      )}

      {/* Modal création équipement */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 pt-5 pb-3 border-b border-border space-y-3">
              <h2 className="font-semibold text-foreground">Nouvel équipement</h2>
              {/* Sélection de l'entreprise cible */}
              <select
                value={createCompanyId}
                onChange={(e) => setCreateCompanyId(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Choisir l'entreprise…</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>
            {createCompanyId ? (
              <div className="p-5">
                <EquipmentForm
                  companyId={createCompanyId}
                  onSuccess={() => { setShowCreate(false); setCreateCompanyId('') }}
                  onCancel={() => { setShowCreate(false); setCreateCompanyId('') }}
                />
              </div>
            ) : (
              <div className="p-5">
                <button
                  onClick={() => { setShowCreate(false); setCreateCompanyId('') }}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-foreground">Supprimer l'équipement ?</h3>
            <p className="text-sm text-muted-foreground">
              <strong>{deleteConfirm.name}</strong> sera définitivement supprimé avec tous ses documents et son historique.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
                Annuler
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate({ id: deleteConfirm.id, companyId: deleteConfirm.companyId })
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
