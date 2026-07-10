// =============================================================
// EquipmentForm — Formulaire de création / édition d'un équipement
// =============================================================
import { useState } from 'react'
import { Loader2, Upload, X, FileText } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase/client'
import {
  useCreerEquipement,
  useModifierEquipement,
  uploadPhotoEquipement,
  type EquipementInput,
} from '../hooks/useEquipment'
import type { Equipement } from '@/types'

const DOC_ACCEPT = '.csv,.pdf,.doc,.docx,.txt,application/pdf,text/plain,text/csv'
const DOC_MAX_MB = 4

async function uploadDocumentEquipement(file: File, equipementId: string, uploadedPar: string): Promise<void> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `documents/${equipementId}/${Date.now()}_${file.name}`
  const { error: upErr } = await supabase.storage
    .from('it-access-fichiers')
    .upload(path, file, { upsert: false })
  if (upErr) throw upErr
  const { data: urlData } = supabase.storage.from('it-access-fichiers').getPublicUrl(path)
  const typeMap: Record<string, string> = { pdf: 'pdf', docx: 'docx', doc: 'docx', txt: 'txt', csv: 'csv' }
  await supabase.from('documents_equipement').insert({
    equipement_id: equipementId,
    nom: file.name,
    url_fichier: urlData.publicUrl,
    type_fichier: typeMap[ext] ?? 'txt',
    taille_fichier: file.size,
    uploade_par: uploadedPar,
  })
}

const CATEGORIES = ['PC / Laptop', 'Imprimante', 'Serveur', 'Réseau / Switch', 'Écran', 'Scanner', 'Autre']

interface Props {
  clientId: string
  equipment?: Equipement
  onSuccess: () => void
  onCancel: () => void
}

export function EquipmentForm({ clientId, equipment, onSuccess, onCancel }: Props) {
  const { profile } = useAuthStore()
  const createMutation = useCreerEquipement()
  const updateMutation = useModifierEquipement()

  const [form, setForm] = useState({
    nom: equipment?.nom ?? '',
    modele: equipment?.modele ?? '',
    numero_serie: equipment?.numero_serie ?? '',
    categorie: equipment?.categorie ?? '',
    emplacement: equipment?.emplacement ?? '',
    date_achat: equipment?.date_achat ?? '',
    fin_garantie: equipment?.fin_garantie ?? '',
    prochaine_maintenance: (equipment as any)?.prochaine_maintenance ?? '',
    notes: equipment?.notes ?? '',
    etat: equipment?.etat ?? 'operationnel',
  })

  const [photos, setPhotos] = useState<string[]>((equipment as any)?.photos ?? [])
  const [pendingDocs, setPendingDocs] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!equipment
  const isPending = createMutation.isPending || updateMutation.isPending
  // Seul l'admin / super_admin peut fixer l'état (validation).
  // Un client crée un équipement « en validation » (maintenance) par défaut.
  const canEditEtat = profile?.role === 'admin' || profile?.role === 'super_admin'

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleDocSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const invalid = files.filter((f) => f.size > DOC_MAX_MB * 1024 * 1024)
    if (invalid.length > 0) {
      setError(`Certains fichiers dépassent ${DOC_MAX_MB} Mo.`)
      e.target.value = ''
      return
    }
    setPendingDocs((prev) => [...prev, ...files])
    e.target.value = ''
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (photos.length + files.length > 3) {
      setError('Maximum 3 photos par équipement.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const equipementId = equipment?.id ?? `temp-${Date.now()}`
      const urls = await Promise.all(
        files.map((f) => {
          if (f.size > 10 * 1024 * 1024) throw new Error('Fichier trop volumineux (max 10 MB).')
          return uploadPhotoEquipement(f, equipementId)
        })
      )
      setPhotos((p) => [...p, ...urls])
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'upload.")
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim()) return
    setError(null)

    const input: EquipementInput = {
      client_id: clientId,
      nom: form.nom.trim(),
      modele: form.modele || undefined,
      numero_serie: form.numero_serie || undefined,
      categorie: form.categorie || undefined,
      emplacement: form.emplacement || undefined,
      date_achat: form.date_achat || undefined,
      fin_garantie: form.fin_garantie || undefined,
      prochaine_maintenance: form.prochaine_maintenance || undefined,
      notes: form.notes || undefined,
      photos,
      cree_par: profile!.id,
      etat: canEditEtat
        ? (form.etat as 'operationnel' | 'maintenance' | 'en_panne' | 'detruit')
        : (isEdit ? (equipment!.etat) : 'maintenance'),
    }

    try {
      let equipementId: string
      if (isEdit) {
        await updateMutation.mutateAsync({ id: equipment.id, updates: { ...input, photos } })
        equipementId = equipment.id
      } else {
        const created = await createMutation.mutateAsync(input)
        equipementId = (created as any).id
      }
      if (pendingDocs.length > 0) {
        await Promise.all(pendingDocs.map((f) => uploadDocumentEquipement(f, equipementId, profile!.id)))
      }
      onSuccess()
    } catch (err: any) {
      setError(err?.message ?? 'Une erreur est survenue. Réessayez.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{"Nom de l'équipement *"}</label>
        <input
          type="text"
          value={form.nom}
          onChange={(e) => update('nom', e.target.value)}
          required
          placeholder="Ex: Dell Latitude 5520"
          className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Catégorie</label>
          <select
            value={form.categorie}
            onChange={(e) => update('categorie', e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Choisir…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Modèle</label>
          <input
            type="text"
            value={form.modele}
            onChange={(e) => update('modele', e.target.value)}
            placeholder="Ex: Latitude 5520"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">N° de série</label>
          <input
            type="text"
            value={form.numero_serie}
            onChange={(e) => update('numero_serie', e.target.value)}
            placeholder="SN123456"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Emplacement</label>
          <input
            type="text"
            value={form.emplacement}
            onChange={(e) => update('emplacement', e.target.value)}
            placeholder="Bureau direction"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{"Date d'achat"}</label>
          <input
            type="date"
            value={form.date_achat}
            onChange={(e) => update('date_achat', e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Fin de garantie</label>
          <input
            type="date"
            value={form.fin_garantie}
            onChange={(e) => update('fin_garantie', e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Prochaine maintenance préventive</label>
        <input
          type="date"
          value={form.prochaine_maintenance}
          onChange={(e) => update('prochaine_maintenance', e.target.value)}
          className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">Un rappel apparaîtra pour l'administrateur à cette date.</p>
      </div>

      {canEditEtat && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">État</label>
          <select
            value={form.etat}
            onChange={(e) => update('etat', e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="operationnel">Opérationnel</option>
            <option value="maintenance">En validation / maintenance</option>
            <option value="en_panne">En panne</option>
            <option value="detruit">Détruit</option>
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={2}
          placeholder="Informations complémentaires…"
          className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Photos ({photos.length}/3)
        </label>
        <div className="flex gap-2 flex-wrap">
          {photos.map((url, i) => (
            <div key={i} className="relative w-20 h-20">
              <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-border" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {photos.length < 3 && (
            <label className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
              {uploading ? <Loader2 size={16} className="animate-spin text-muted-foreground" /> : <Upload size={16} className="text-muted-foreground" />}
              <span className="text-xs text-muted-foreground mt-1">Photo</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Documents ({pendingDocs.length} en attente)
        </label>
        <p className="text-xs text-muted-foreground">CSV, PDF, Docx, TXT — max {DOC_MAX_MB} Mo par fichier</p>
        {pendingDocs.length > 0 && (
          <div className="space-y-1.5">
            {pendingDocs.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg">
                <FileText size={14} className="text-primary flex-shrink-0" />
                <span className="text-xs text-foreground flex-1 truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
                <button type="button" onClick={() => setPendingDocs((p) => p.filter((_, j) => j !== i))}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors w-fit">
          <Upload size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Ajouter un document</span>
          <input type="file" accept={DOC_ACCEPT} multiple className="hidden" onChange={handleDocSelect} />
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending || uploading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
        >
          {isPending && <Loader2 size={15} className="animate-spin" />}
          {isEdit ? "Enregistrer" : "Créer l'équipement"}
        </button>
      </div>
    </form>
  )
}
