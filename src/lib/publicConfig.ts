import { supabase } from '@/lib/supabase/client'

export type PricingPlanKey = 'starter' | 'medium' | 'premium'

export interface PricingPlanConfig {
  label: string
  price_fcfa: number
  max_equipment: number
  max_technicians: number
}

export interface PublicAppConfig {
  hero_title: string
  hero_subtitle: string
  contact_email: string
  contact_phone: string
  contact_whatsapp: string
  quick_links: Array<{ label: string; href: string }>
  pricing: Record<PricingPlanKey, PricingPlanConfig>
}

const STORAGE_KEY = 'it_access_public_config'

export const DEFAULT_PUBLIC_CONFIG: PublicAppConfig = {
  hero_title: 'Maintenance IT centralisee pour entreprises',
  hero_subtitle: 'Pilotez votre parc, vos incidents et vos interventions en un seul espace.',
  contact_email: 'itaccesscontact@gmail.com',
  contact_phone: '+229 01 00 00 00 00',
  contact_whatsapp: '+2290100000000',
  quick_links: [
    { label: 'Se connecter', href: '/connexion' },
    { label: "S'inscrire", href: '/inscription' },
    { label: 'Acces Sudo', href: '/sudo' },
  ],
  pricing: {
    starter: { label: 'Starter', price_fcfa: 5000, max_equipment: 5, max_technicians: 2 },
    medium: { label: 'Medium', price_fcfa: 15000, max_equipment: 15, max_technicians: 5 },
    premium: { label: 'Premium', price_fcfa: 45000, max_equipment: 50, max_technicians: 7 },
  },
}

function readLocalFallback(): PublicAppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PUBLIC_CONFIG
    return { ...DEFAULT_PUBLIC_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PUBLIC_CONFIG
  }
}

function writeLocalFallback(config: PublicAppConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // no-op
  }
}

export async function fetchPublicConfig(): Promise<PublicAppConfig> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'public_config')
    .maybeSingle()

  if (error || !data?.value) {
    return readLocalFallback()
  }

  const merged = {
    ...DEFAULT_PUBLIC_CONFIG,
    ...((data.value as unknown as Partial<PublicAppConfig>) ?? {}),
  }
  writeLocalFallback(merged)
  return merged
}

export async function savePublicConfig(config: PublicAppConfig) {
  writeLocalFallback(config)
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      {
        key: 'public_config',
        value: config as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
  if (error) throw error
}
