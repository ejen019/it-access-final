// =============================================================
// BulkImportModal — Import en masse d'équipements via Groq AI
//
// Flow : Upload CSV/TXT → Groq extrait les équipements → Preview → Confirmer
// L'extraction supporte CSV, TXT. PDF/DOCX tentés en tant que texte brut.
// =============================================================
import { useState, useRef } from 'react'
import { Upload, Loader2, CheckCircle2, AlertCircle, X, Bot } from 'lucide-react'
import Groq from 'groq-sdk'
import { useAuthStore } from '@/stores/auth.store'
import { useCreerEquipement } from '../hooks/useEquipment'

const CATEGORIES = ['PC / Laptop', 'Imprimante', 'Serveur', 'Réseau / Switch', 'Écran', 'Scanner', 'Autre']

interface ExtractedEquipment {
  name: string
  model?: string
  serial_number?: string
  category?: string
  location?: string
  notes?: string
  selected: boolean
}

interface Props {
  clientId: string
  onClose: () => void
  pendingValidation?: boolean
}

const GROQ_SYSTEM_PROMPT = `Tu es un extracteur STRICT de données pour un système de gestion d'équipements IT.
Ta tâche : extraire uniquement les équipements explicitement présents dans les données brutes fournies.
Règles impératives :
- N'invente jamais d'équipement.
- N'ajoute aucune ligne absente du document.
- Si une information est incertaine, laisse le champ vide.
- Si aucun équipement clair n'est trouvé, retourne [].
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ou après, sans markdown.
Format de chaque objet :
{
  "name": "Nom descriptif de l'équipement (REQUIS)",
  "model": "Modèle ou référence (optionnel)",
  "serial_number": "Numéro de série SN si présent (optionnel)",
  "category": "Une de : PC / Laptop | Imprimante | Serveur | Réseau / Switch | Écran | Scanner | Autre",
  "location": "Salle ou localisation (optionnel)",
  "notes": "Toute autre information utile (optionnel)"
}
Si tu ne peux pas identifier d'équipements, retourne un tableau vide : []`

function normalizeText(v: string): string {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function isExtractedFromSource(item: any, sourceNormalized: string): boolean {
  const candidates = [
    item?.name,
    item?.model,
    item?.serial_number,
    item?.location,
  ]
    .filter((x) => typeof x === 'string')
    .map((x) => normalizeText(String(x).trim()))
    .filter((x) => x.length >= 3)

  if (!candidates.length) return false
  return candidates.some((c) => sourceNormalized.includes(c))
}

async function extractWithGroq(fileContent: string): Promise<ExtractedEquipment[]> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('Clé API Groq non configurée (VITE_GROQ_API_KEY).')

  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true })

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: GROQ_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extrait uniquement les équipements qui existent textuellement dans ces données (pas d'invention) :\n\n${fileContent.slice(0, 8000)}`,
      },
    ],
    temperature: 0,
    max_tokens: 4000,
  })

  const raw = response.choices[0].message.content ?? '[]'

  // Nettoyer le JSON si Groq ajoute du markdown
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  const parsed: any[] = JSON.parse(jsonMatch[0])
  const sourceNormalized = normalizeText(fileContent)
  return parsed
    .filter((e) => e.name && typeof e.name === 'string')
    .filter((e) => isExtractedFromSource(e, sourceNormalized))
    .map((e) => ({
      name: String(e.name).trim(),
      model: e.model ? String(e.model).trim() : undefined,
      serial_number: e.serial_number ? String(e.serial_number).trim() : undefined,
      category: CATEGORIES.includes(e.category) ? e.category : undefined,
      location: e.location ? String(e.location).trim() : undefined,
      notes: e.notes ? String(e.notes).trim() : undefined,
      selected: true,
    }))
}

export function BulkImportModal({ clientId, onClose, pendingValidation = false }: Props) {
  const { profile } = useAuthStore()
  const createMutation = useCreerEquipement()

  const [step, setStep] = useState<'upload' | 'extracting' | 'preview' | 'importing' | 'done'>('upload')
  const [equipment, setEquipment] = useState<ExtractedEquipment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setError(null)
    setFileName(file.name)

    const maxSize = 5 * 1024 * 1024 // 5 MB
    if (file.size > maxSize) {
      setError('Fichier trop volumineux. Maximum 5 MB.')
      return
    }

    setStep('extracting')

    try {
      const content = await readFileAsText(file)
      if (!content.trim()) {
        setError('Le fichier est vide ou illisible.')
        setStep('upload')
        return
      }

      const extracted = await extractWithGroq(content)

      if (extracted.length === 0) {
        setError('Aucun équipement détecté dans ce fichier. Vérifiez le format.')
        setStep('upload')
        return
      }

      setEquipment(extracted)
      setStep('preview')
    } catch (err: any) {
      setError(err?.message ?? "Erreur lors de l'analyse. Réessayez.")
      setStep('upload')
    }
  }

  async function handleImport() {
    const toImport = equipment.filter((e) => e.selected)
    if (toImport.length === 0) return

    setStep('importing')
    setImportedCount(0)

    let count = 0
    for (const eq of toImport) {
      try {
        await createMutation.mutateAsync({
          client_id: clientId,
          nom: eq.name,
          modele: eq.model,
          numero_serie: eq.serial_number,
          categorie: eq.category,
          emplacement: eq.location,
          notes: eq.notes,
          cree_par: profile!.id,
          etat: pendingValidation ? 'maintenance' : 'operationnel',
        })
        count++
        setImportedCount(count)
      } catch {
        // Continuer malgré les erreurs individuelles
      }
    }

    setStep('done')
  }

  function toggleSelect(index: number) {
    setEquipment((prev) =>
      prev.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e))
    )
  }

  function toggleAll(select: boolean) {
    setEquipment((prev) => prev.map((e) => ({ ...e, selected: select })))
  }

  const selectedCount = equipment.filter((e) => e.selected).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">Import IA — Équipements</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* STEP: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Importez un fichier d'inventaire (CSV, TXT, ou tout fichier texte). L'IA Groq (Llama 3.3 70B) extraira automatiquement les équipements détectés.
              </p>
              {pendingValidation && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
                  Les équipements importés seront soumis à validation par l'administrateur avant d'être activés.
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <AlertCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Upload size={32} className="mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">Cliquez pour choisir un fichier</p>
                <p className="text-xs text-muted-foreground mt-1">CSV, TXT, ou tout format texte · Max 5 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv,.xlsx"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Format CSV recommandé :</p>
                <p className="font-mono">nom;modele;numero_serie;localisation</p>
                <p className="font-mono">Dell Latitude 5520;Latitude 5520;SN123456;Bureau 1</p>
                <p className="mt-1">{"L'IA s'adapte à n'importe quelle structure de données."}</p>
              </div>
            </div>
          )}

          {/* STEP: Extracting */}
          {step === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <Loader2 size={40} className="animate-spin text-primary" />
                <Bot size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Analyse en cours…</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Groq AI analyse <strong>{fileName}</strong>
                </p>
              </div>
            </div>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <strong>{equipment.length}</strong> équipement{equipment.length > 1 ? 's' : ''} détecté{equipment.length > 1 ? 's' : ''}
                </p>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => toggleAll(true)} className="text-primary hover:underline">Tout sélectionner</button>
                  <span className="text-muted-foreground">·</span>
                  <button onClick={() => toggleAll(false)} className="text-muted-foreground hover:underline">Tout désélectionner</button>
                </div>
              </div>

              <div className="space-y-2">
                {equipment.map((eq, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${
                      eq.selected ? 'border-primary/50 bg-primary/5' : 'border-border opacity-60'
                    }`}
                    onClick={() => toggleSelect(index)}
                  >
                    <input
                      type="checkbox"
                      checked={eq.selected}
                      onChange={() => toggleSelect(index)}
                      className="mt-0.5 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{eq.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {eq.model && <span className="text-xs text-muted-foreground">{eq.model}</span>}
                        {eq.serial_number && <span className="text-xs text-muted-foreground">SN: {eq.serial_number}</span>}
                        {eq.category && <span className="text-xs text-muted-foreground">{eq.category}</span>}
                        {eq.location && <span className="text-xs text-muted-foreground">📍 {eq.location}</span>}
                      </div>
                      {eq.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{eq.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 size={36} className="animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Import en cours…</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {importedCount} / {equipment.filter((e) => e.selected).length} équipements
                </p>
                <div className="w-48 bg-muted rounded-full h-1.5 mt-3">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${(importedCount / equipment.filter((e) => e.selected).length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <CheckCircle2 size={48} className="text-green-500" />
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">{importedCount} équipements importés</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {pendingValidation
                    ? "En attente de validation par l'administrateur."
                    : 'Ils apparaissent maintenant dans la liste.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                Fermer
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={() => { setStep('upload'); setEquipment([]) }}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent"
            >
              Recommencer
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60"
            >
              Importer {selectedCount > 0 ? `(${selectedCount})` : ''}
            </button>
          </div>
        )}
        {step === 'upload' && (
          <div className="px-5 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Lit un fichier en tant que texte (fonctionne bien pour CSV/TXT)
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string ?? '')
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'))
    reader.readAsText(file, 'UTF-8')
  })
}
