import { useEffect, useState } from 'react'
import { Settings, Globe, Mail, CreditCard, Save, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Param {
  cle: string
  valeur: Record<string, any>
  modifie_le: string
}

interface PlanRow {
  plan: string
  prix_fcfa: number
  max_equipements: number
  max_techniciens: number
}

const CONFIG_KEYS = [
  {
    cle: 'app_info',
    label: "Informations de l'application",
    icon: Globe,
    fields: [
      { key: 'nom',      label: 'Nom de la plateforme', type: 'text',  placeholder: 'IT-Access' },
      { key: 'slogan',   label: 'Slogan',               type: 'text',  placeholder: 'Gestion de maintenance informatique' },
      { key: 'version',  label: 'Version',              type: 'text',  placeholder: '1.0.0' },
      { key: 'site_web', label: 'Site web',             type: 'url',   placeholder: 'https://itaccess.com' },
    ],
  },
  {
    cle: 'contact',
    label: 'Contact & support',
    icon: Mail,
    fields: [
      { key: 'email_support', label: 'Email support',  type: 'email', placeholder: 'support@itaccess.com' },
      { key: 'email_contact', label: 'Email contact',  type: 'email', placeholder: 'contact@itaccess.com' },
      { key: 'adresse',       label: 'Adresse / pays', type: 'text',  placeholder: 'Cotonou, Bénin' },
    ],
  },
]

const DEFAULTS: Record<string, Record<string, string>> = {
  app_info: { nom: 'IT-Access', slogan: 'Gestion de maintenance informatique', version: '1.0.0', site_web: '' },
  contact:  { email_support: '', email_contact: '', adresse: '' },
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  medium:  'Medium',
  premium: 'Premium',
}

const DEFAULT_PLANS: PlanRow[] = [
  { plan: 'starter', prix_fcfa: 50000,  max_equipements: 10,  max_techniciens: 2  },
  { plan: 'medium',  prix_fcfa: 120000, max_equipements: 30,  max_techniciens: 5  },
  { plan: 'premium', prix_fcfa: 250000, max_equipements: 100, max_techniciens: 15 },
]

export function SudoParametresPage() {
  const [params, setParams]       = useState<Record<string, Record<string, string>>>({})
  const [plans, setPlans]         = useState<PlanRow[]>(DEFAULT_PLANS)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState<string | null>(null)
  const [saved, setSaved]         = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [savingPlans, setSavingPlans] = useState(false)
  const [savedPlans, setSavedPlans]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: paramData }, { data: planData }] = await Promise.all([
      supabase.from('parametres_application').select('*'),
      supabase.from('abonnements').select('plan, prix_fcfa, max_equipements, max_techniciens'),
    ])
    const merged: Record<string, Record<string, string>> = {}
    for (const cfg of CONFIG_KEYS) {
      const row = (paramData as Param[] | null)?.find(p => p.cle === cfg.cle)
      merged[cfg.cle] = { ...DEFAULTS[cfg.cle], ...(row?.valeur ?? {}) }
    }
    setParams(merged)
    if (planData && planData.length > 0) {
      setPlans(DEFAULT_PLANS.map(dp => {
        const row = planData.find((r: any) => r.plan === dp.plan)
        return row ? { ...dp, ...row } : dp
      }))
    }
    setLoading(false)
  }

  function update(cle: string, key: string, value: string) {
    setParams(p => ({ ...p, [cle]: { ...p[cle], [key]: value } }))
  }

  function updatePlan(plan: string, key: keyof PlanRow, value: string) {
    setPlans(ps => ps.map(p => p.plan === plan ? { ...p, [key]: Number(value) } : p))
  }

  async function save(cle: string) {
    setSaving(cle); setError(null)
    const { error: err } = await supabase
      .from('parametres_application')
      .upsert({ cle, valeur: params[cle] }, { onConflict: 'cle' })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSaved(cle)
    setTimeout(() => setSaved(null), 2500)
  }

  async function savePlans() {
    setSavingPlans(true); setError(null)
    for (const row of plans) {
      const { error: err } = await supabase
        .from('abonnements')
        .upsert({ plan: row.plan, prix_fcfa: row.prix_fcfa, max_equipements: row.max_equipements, max_techniciens: row.max_techniciens }, { onConflict: 'plan' })
      if (err) { setError(err.message); setSavingPlans(false); return }
    }
    setSavingPlans(false)
    setSavedPlans(true)
    setTimeout(() => setSavedPlans(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <Settings size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Paramètres de l'application</h1>
          <p className="text-xs text-muted-foreground">Configuration globale — visible par tous les administrateurs</p>
        </div>
        <button onClick={load} className="ml-auto p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors" title="Recharger">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3">
          <AlertCircle size={15} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Sections paramétrées */}
      {CONFIG_KEYS.map(({ cle, label, icon: Icon, fields }) => (
        <div key={cle} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon size={14} className="text-primary" />
              </div>
              <span className="text-[13px] font-semibold text-foreground">{label}</span>
            </div>
            <button
              onClick={() => save(cle)}
              disabled={saving === cle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving === cle
                ? <Loader2 size={12} className="animate-spin" />
                : saved === cle
                  ? <CheckCircle2 size={12} />
                  : <Save size={12} />
              }
              {saved === cle ? 'Enregistré !' : 'Enregistrer'}
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(({ key, label: fieldLabel, type, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {fieldLabel}
                </label>
                <input
                  type={type}
                  value={params[cle]?.[key] ?? ''}
                  onChange={(e) => update(cle, key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Tarifications */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard size={14} className="text-primary" />
            </div>
            <span className="text-[13px] font-semibold text-foreground">Tarifications</span>
          </div>
          <button
            onClick={savePlans}
            disabled={savingPlans}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {savingPlans
              ? <Loader2 size={12} className="animate-spin" />
              : savedPlans
                ? <CheckCircle2 size={12} />
                : <Save size={12} />
            }
            {savedPlans ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </div>
        <div className="p-5 space-y-5">
          {plans.map((row) => (
            <div key={row.plan} className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">{PLAN_LABELS[row.plan]}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prix (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={row.prix_fcfa}
                    onChange={(e) => updatePlan(row.plan, 'prix_fcfa', e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max équipements</label>
                  <input
                    type="number"
                    min={1}
                    value={row.max_equipements}
                    onChange={(e) => updatePlan(row.plan, 'max_equipements', e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max techniciens</label>
                  <input
                    type="number"
                    min={1}
                    value={row.max_techniciens}
                    onChange={(e) => updatePlan(row.plan, 'max_techniciens', e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center pb-4">
        Les modifications sont enregistrées immédiatement dans la base de données et s'appliquent à l'ensemble du système.
      </p>
    </div>
  )
}
