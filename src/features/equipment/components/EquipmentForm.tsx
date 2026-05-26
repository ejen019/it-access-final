// =============================================================
// EquipmentForm — Formulaire de création / édition d'un équipement
// Réutilisé par Admin et Entreprise
// =============================================================
import { useState } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import {
  useCreateEquipment,
  useUpdateEquipment,
  uploadEquipmentPhoto,
  type EquipmentInput,
} from '../hooks/useEquipment'
import type { Equipment } from '@/types'

const CATEGORIES = ['PC / Laptop', 'Imprimante', 'Serveur', 'Réseau / Switch', 'Écran', 'Scanner', 'Autre']

interface Props {
  companyId: string
  equipment?: Equipment        // Si fourni → mode édition
  onSuccess: () => void
  onCancel: () => void
}

export function EquipmentForm({ companyId, equipment, onSuccess, onCancel }: Props) {
  const { profile } = useAuthStore()
  const createMutation = useCreateEquipment()
  const updateMutation = useUpdateEquipment()

  const [form, setForm] = useState({
    name: equipment?.name ?? '',
    model: equipment?.model ?? '',
    serial_number: equipment?.serial_number ?? '',
    category: equipment?.category ?? '',
    location: equipment?.location ?? '',
    purchase_date: equipment?.purchase_date ?? '',
    warranty_end: equipment?.warranty_end ?? '',
    notes: equipment?.notes ?? '',
  })

  const [photos, setPhotos] = useState<string[]>(equipment?.photos ?? [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!equipment
  const isPending = createMutation.isPending || updateMutation.isPending

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
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
      const equipmentId = equipment?.id ?? `temp-${Date.now()}`
      const urls = await Promise.all(
        files.map((f) => {
          if (f.size > 10 * 1024 * 1024) throw new Error('Fichier trop volumineux (max 10 MB).')
          return uploadEquipmentPhoto(f, equipmentId)
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
    if (!form.name.trim()) return
    setError(null)

    const input: EquipmentInput = {
      company_id: companyId,
      name: form.name.trim(),
      model: form.model || undefined,
      serial_number: form.serial_number || undefined,
      category: form.category || undefined,
      location: form.location || undefined,
      purchase_date: form.purchase_date || undefined,
      warranty_end: form.warranty_end || undefined,
      notes: form.notes || undefined,
      photos,
      created_by: profile!.id,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: equipment.id, updates: { ...input, photos } })
      } else {
        await createMutation.mutateAsync(input)
      }
      onSuccess()
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Nom (requis) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{"Nom de l'équipement *"}</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
          placeholder="Ex: Dell Latitude 5520"
          className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Catégorie + Modèle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Catégorie</label>
          <select
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
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
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            placeholder="Ex: Latitude 5520"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Numéro de série + Localisation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">N° de série</label>
          <input
            type="text"
            value={form.serial_number}
            onChange={(e) => update('serial_number', e.target.value)}
            placeholder="SN123456"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Localisation</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="Bureau direction"
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{"Date d'achat"}</label>
          <input
            type="date"
            value={form.purchase_date}
            onChange={(e) => update('purchase_date', e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Fin de garantie</label>
          <input
            type="date"
            value={form.warranty_end}
            onChange={(e) => update('warranty_end', e.target.value)}
            className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Notes */}
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

      {/* Photos */}
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

      {/* Actions */}
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
