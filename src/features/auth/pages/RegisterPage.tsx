// =============================================================
// RegisterPage — Inscription Entreprise ou Technicien
//
// Flow :
//  1. Choix du rôle (Entreprise / Technicien)
//  2. Email + mot de passe + infos de base
//  3. Appel Edge Function register-user (service_role, sans email)
//  4. Compte créé, confirmé → en attente de validation Admin
//  5. Redirection vers /connexion
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Building2, Wrench, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { fetchPublicConfig, type PricingPlanKey } from '@/lib/publicConfig'
import { useQuery } from '@tanstack/react-query'

type Role = 'client' | 'technicien'

export function RegisterPage() {
  const [step, setStep] = useState<'role' | 'form'>('role')
  const [role, setRole] = useState<Role | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanKey>('starter')
  const [confirmedPlan, setConfirmedPlan] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { data: publicConfig } = useQuery({
    queryKey: ['public-config'],
    queryFn: fetchPublicConfig,
  })

  function selectRole(r: Role) {
    setRole(r)
    setStep('form')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (role === 'client' && !companyName.trim()) {
      setError("Le nom de l'entreprise est requis.")
      return
    }
    if (role === 'client' && !confirmedPlan) {
      setError("Confirmez la formule choisie pour continuer.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('register-user', {
        body: {
          email: email.trim().toLowerCase(),
          password,
          nom: fullName.trim(),
          telephone: phone.trim() || null,
          role,
          nom_entreprise: role === 'client' ? companyName.trim() : undefined,
          selected_plan: role === 'client' ? selectedPlan : undefined,
        },
      })

      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)

      setSuccess(true)
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.includes('already registered') || msg.includes('Email already registered')) {
        setError('Cette adresse email est déjà utilisée. Essayez de vous connecter.')
      } else {
        setError(msg || "Erreur lors de la création du compte.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Écran de succès après inscription
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Compte créé avec succès !</h2>
          <p className="text-sm text-muted-foreground">
            Votre compte est en attente de validation par un administrateur.
            Vous recevrez un accès dès validation.
          </p>
          <Link
            to="/connexion"
            className="inline-block w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium text-center hover:bg-primary/90 transition"
          >
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">IT-Access</h1>
          <p className="mt-2 text-sm text-muted-foreground">Créer un compte</p>
        </div>

        {/* Étape 1 : Choix du rôle */}
        {step === 'role' && (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">Vous êtes…</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => selectRole('entreprise')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all"
              >
                <Building2 size={32} className="text-primary" />
                <span className="text-sm font-medium text-foreground">Une entreprise</span>
              </button>
              <button
                onClick={() => selectRole('technicien')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all"
              >
                <Wrench size={32} className="text-primary" />
                <span className="text-sm font-medium text-foreground">Un technicien</span>
              </button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Déjà inscrit ?{' '}
              <Link to="/connexion" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        )}

        {/* Étape 2 : Formulaire */}
        {step === 'form' && role && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => { setStep('role'); setError(null) }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              ← Changer de type de compte
            </button>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {role === 'client' ? 'Nom du responsable' : 'Nom complet'}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>

            {role === 'client' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                </div>
                {publicConfig && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Formule (1 an)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(['starter', 'medium', 'premium'] as const).map((plan) => {
                        const p = publicConfig.pricing[plan]
                        return (
                          <button
                            key={plan}
                            type="button"
                            onClick={() => { setSelectedPlan(plan); setConfirmedPlan(false) }}
                            className={`text-left border rounded-lg p-3 ${selectedPlan === plan ? 'border-primary bg-primary/5' : 'border-border'}`}
                          >
                            <p className="text-xs font-semibold text-foreground">{p.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{p.price_fcfa.toLocaleString('fr-FR')} FCFA/an</p>
                            <p className="text-[11px] text-muted-foreground mt-1">{p.max_equipment} equip. · {p.max_technicians} tech.</p>
                          </button>
                        )
                      })}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={confirmedPlan}
                        onChange={(e) => setConfirmedPlan(e.target.checked)}
                      />
                      Je confirme la formule choisie pour 1 an.
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+229 90 00 00 00"
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              Créer mon compte
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Déjà inscrit ?{' '}
              <Link to="/connexion" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
