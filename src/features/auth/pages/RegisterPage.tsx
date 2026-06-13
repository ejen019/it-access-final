import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Building2, Wrench, CheckCircle2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { PLANS } from '@/lib/plans'
import type { TypePlan } from '@/types'

type Role = 'client' | 'technicien'

export function RegisterPage() {
  const [step, setStep]       = useState<'role' | 'form'>('role')
  const [role, setRole]       = useState<Role | null>(null)

  const [fullName, setFullName]         = useState('')
  const [email, setEmail]               = useState('')
  const [companyName, setCompanyName]   = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShow]         = useState(false)
  const [selectedPlan, setPlan]         = useState<TypePlan>('starter')
  const [confirmedPlan, setConfirmed]   = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState(false)

  function selectRole(r: Role) { setRole(r); setStep('form') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (role === 'client' && !companyName.trim()) { setError("Le nom de l'entreprise est requis."); return }
    if (role === 'client' && !confirmedPlan) { setError("Confirmez la formule choisie pour continuer."); return }

    setIsLoading(true); setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('register-user', {
        body: {
          email: email.trim().toLowerCase(), password,
          nom: fullName.trim(), role,
          nom_entreprise: role === 'client' ? companyName.trim() : undefined,
          selected_plan:  role === 'client' ? selectedPlan : undefined,
        },
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      setSuccess(true)
    } catch (err: any) {
      const msg = err?.message ?? ''
      setError(msg.includes('already registered') || msg.includes('Email already registered')
        ? 'Cette adresse email est déjà utilisée. Essayez de vous connecter.'
        : msg || "Erreur lors de la création du compte.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Compte créé avec succès !</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Votre compte est en attente de validation par un administrateur. Vous recevrez un accès dès validation.
            </p>
          </div>
          <Link to="/connexion"
            className="inline-block w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium text-center hover:bg-primary/90 transition">
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between max-w-3xl mx-auto">
        <Link to="/" className="text-[15px] font-bold text-primary tracking-tight">IT-Access</Link>
        <Link to="/connexion" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Déjà inscrit ?
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Étape 1 : Choix du type */}
        {step === 'role' && (
          <div>
            <div className="text-center mb-10">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Créer un compte <span className="text-primary">IT-Access</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">Choisissez le type de compte qui vous correspond.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  role: 'client' as Role,
                  icon: Building2,
                  title: 'Inscrire mon entreprise',
                  desc: 'Vous gérerez le parc d\'équipements, les techniciens et les interventions. Choisissez votre formule d\'abonnement.',
                },
                {
                  role: 'technicien' as Role,
                  icon: Wrench,
                  title: 'Compte technicien',
                  desc: 'Vous effectuez les interventions terrain. Votre compte sera validé par un administrateur.',
                },
              ].map(({ role: r, icon: Icon, title, desc }) => (
                <button key={r} onClick={() => selectRole(r)}
                  className="group text-left rounded-2xl border-2 border-border bg-card p-6 hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:border-primary transition-colors">
                    <Icon size={20} className="text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Continuer →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Étape 2 : Formulaire */}
        {step === 'form' && role && (
          <div>
            <button type="button"
              onClick={() => { setStep('role'); setError(null) }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft size={14} /> Retour
            </button>

            <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {role === 'client' ? <Building2 size={16} className="text-primary" /> : <Wrench size={16} className="text-primary" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {role === 'client' ? 'Compte entreprise' : 'Compte technicien'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {role === 'client' ? 'Vous serez l\'administrateur principal de votre espace.' : 'En attente de validation par un administrateur.'}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nom complet *</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" />
              </div>

              {role === 'client' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Nom de l'entreprise *</label>
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                      className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Formule souhaitée (1 an) *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {PLANS.map((p) => (
                        <button key={p.key} type="button"
                          onClick={() => { setPlan(p.key); setConfirmed(false) }}
                          className={`text-left border rounded-xl p-3.5 transition-all ${selectedPlan === p.key ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40'}`}>
                          <p className="text-xs font-semibold text-foreground">{p.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.prix_fcfa.toLocaleString('fr-FR')} FCFA/an</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{p.max_equipements} équip. · {p.max_techniciens} tech.</p>
                        </button>
                      ))}
                    </div>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={confirmedPlan} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 flex-shrink-0" />
                      Je confirme la formule choisie. L'administrateur activera le contrat.
                    </label>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Adresse email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Mot de passe * <span className="text-xs text-muted-foreground font-normal">(8 caractères min)</span>
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
                    className="w-full px-3 py-2.5 pr-10 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" />
                  <button type="button" onClick={() => setShow(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition h-11">
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Créer mon compte
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
