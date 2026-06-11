// =============================================================
// ProfilePage — Profil utilisateur (partagé tous rôles)
// =============================================================
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Lock, Sun, Moon, Monitor, RefreshCw, Copy, CheckCircle2, Loader2, LogOut, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { useNavigate } from 'react-router-dom'

async function fetchMyClient(userId: string) {
  const { data } = await supabase
    .from('clients')
    .select('id, code_signature')
    .eq('utilisateur_id', userId)
    .single()
  return data
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrateur',
  client: 'Entreprise',
  technicien: 'Technicien IT',
}

const ROLE_THEME: Record<string, { ring: string; badge: string; panel: string; panelSub: string }> = {
  super_admin: {
    ring: 'ring-rose-500/30',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
    panel: 'from-rose-50 to-white dark:from-rose-950/30 dark:to-card',
    panelSub: 'text-rose-700 dark:text-rose-300',
  },
  admin: {
    ring: 'ring-sky-500/30',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
    panel: 'from-sky-50 to-white dark:from-sky-950/30 dark:to-card',
    panelSub: 'text-sky-700 dark:text-sky-300',
  },
  client: {
    ring: 'ring-cyan-500/30',
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300',
    panel: 'from-cyan-50 to-white dark:from-cyan-950/30 dark:to-card',
    panelSub: 'text-cyan-700 dark:text-cyan-300',
  },
  technicien: {
    ring: 'ring-emerald-500/30',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    panel: 'from-emerald-50 to-white dark:from-emerald-950/30 dark:to-card',
    panelSub: 'text-emerald-700 dark:text-emerald-300',
  },
}

export function ProfilePage() {
  const { profile } = useAuthStore()
  const { theme, setTheme } = useUIStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [nom, setNom] = useState(profile?.nom ?? '')
  const [prenom, setPrenom] = useState(profile?.prenom ?? '')
  const [telephone, setTelephone] = useState(profile?.telephone ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  const [codeCopied, setCodeCopied] = useState(false)
  const [codeRegenerating, setCodeRegenerating] = useState(false)

  const { data: client, refetch: refetchClient } = useQuery({
    queryKey: ['my-client-profile', profile?.id],
    queryFn: () => fetchMyClient(profile!.id),
    enabled: profile?.role === 'client',
  })

  useEffect(() => {
    if (profile) {
      setNom(profile.nom)
      setPrenom(profile.prenom ?? '')
      setTelephone(profile.telephone ?? '')
    }
  }, [profile?.id])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    await supabase
      .from('utilisateurs')
      .update({ nom: nom.trim(), prenom: prenom.trim() || null, telephone: telephone.trim() || null })
      .eq('id', profile!.id)
    queryClient.invalidateQueries({ queryKey: ['auth-profile'] })
    setProfileSaving(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSaved(true)
      setNewPassword('')
      setTimeout(() => setPasswordSaved(false), 2000)
    }
  }

  async function handleRegenerateCode() {
    if (!client) return
    setCodeRegenerating(true)
    const newCode = generateCode()
    await supabase.from('clients').update({ code_signature: newCode }).eq('id', client.id)
    await refetchClient()
    setCodeRegenerating(false)
  }

  async function handleCopyCode() {
    if (!client?.code_signature) return
    await navigator.clipboard.writeText(client.code_signature)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/connexion')
  }

  const role = profile?.role ?? 'technicien'
  const roleTheme = ROLE_THEME[role] ?? ROLE_THEME.technicien
  const displayName = (`${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim()) || (profile?.nom ?? '')
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  return (
    <div className="max-w-5xl mx-auto space-y-5 p-4 md:p-6 page-transition">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -top-24 -right-16 h-40 w-40 rounded-full border border-border/40" />
          <div className="absolute -bottom-20 left-8 h-32 w-32 rounded-full border border-border/40" />
        </div>
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-14 h-14 rounded-2xl bg-card border border-border ring-4 ${roleTheme.ring} flex items-center justify-center flex-shrink-0`}>
              <span className="text-xl font-bold text-foreground">{initials}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate">{displayName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${roleTheme.badge}`}>
              {ROLE_LABEL[role]}
            </span>
            <span className={`text-xs font-medium ${roleTheme.panelSub}`}>Espace profil</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm xl:col-span-2">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <User size={14} className="text-primary" strokeWidth={1.8} />
          </div>
          <h2 className="font-semibold text-foreground text-sm">Informations personnelles</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Prénom</label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Téléphone</label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+229 XX XX XX XX"
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-lg text-sm font-semibold disabled:opacity-60 shadow-sm"
          >
            {profileSaving ? <Loader2 size={15} className="animate-spin" /> : profileSaved ? <CheckCircle2 size={15} /> : null}
            {profileSaved ? 'Enregistré !' : 'Enregistrer les modifications'}
          </button>
        </form>
      </section>

      <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm xl:col-span-2">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lock size={14} className="text-primary" strokeWidth={1.8} />
          </div>
          <h2 className="font-semibold text-foreground text-sm">Sécurité</h2>
        </div>
        <form onSubmit={handleChangePassword} className="p-5 space-y-3">
          {passwordError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{passwordError}</p>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 caractères"
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={passwordSaving || !newPassword}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/10 disabled:opacity-60 transition-colors"
          >
            {passwordSaving ? <Loader2 size={15} className="animate-spin" /> : passwordSaved ? <CheckCircle2 size={15} className="text-green-500" /> : null}
            {passwordSaved ? 'Mot de passe mis à jour !' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </section>

      <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm xl:col-span-1 xl:row-span-2">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sun size={14} className="text-primary" strokeWidth={1.8} />
          </div>
          <h2 className="font-semibold text-foreground text-sm">Apparence</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-2">
            {([
              ['light', Sun, 'Clair'],
              ['dark', Moon, 'Sombre'],
              ['system', Monitor, 'Système'],
            ] as const).map(([val, Icon, label]) => (
              <button
                key={val}
                onClick={() => setTheme(val as any)}
                className={`flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl border transition-all text-sm font-medium ${
                  theme === val
                    ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <span>{label}</span>
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </section>
      </div>

      {/* Code de signature (client uniquement) */}
      {profile?.role === 'client' && client && (
        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield size={14} className="text-primary" strokeWidth={1.8} />
            </div>
            <h2 className="font-semibold text-foreground text-sm">Code de validation</h2>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              Requis pour valider les interventions. Ne partagez ce code qu'avec vos représentants autorisés.
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <span className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground">
                {client.code_signature}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyCode}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                {codeCopied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                {codeCopied ? 'Copié !' : 'Copier'}
              </button>
              <button
                onClick={handleRegenerateCode}
                disabled={codeRegenerating}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 rounded-lg text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-60"
              >
                {codeRegenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Régénérer
              </button>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Régénérer invalide l'ancien code. Prévenez vos signataires.
            </p>
          </div>
        </section>
      )}

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-destructive/40 text-destructive rounded-xl text-sm font-medium hover:bg-destructive/10 transition-colors"
      >
        <LogOut size={16} />
        Se déconnecter
      </button>
    </div>
  )
}
