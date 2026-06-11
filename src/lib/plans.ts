// Définition statique des formules d'abonnement.
// Source unique pour la landing publique et le formulaire d'inscription.
import type { TypePlan } from '@/types'

export interface PlanInfo {
  key: TypePlan
  label: string
  prix_fcfa: number
  max_equipements: number
  max_techniciens: number
  description: string
}

export const PLANS: PlanInfo[] = [
  {
    key: 'starter',
    label: 'Starter',
    prix_fcfa: 50_000,
    max_equipements: 10,
    max_techniciens: 2,
    description: 'Petites structures',
  },
  {
    key: 'medium',
    label: 'Medium',
    prix_fcfa: 120_000,
    max_equipements: 30,
    max_techniciens: 5,
    description: 'Entreprises en croissance',
  },
  {
    key: 'premium',
    label: 'Premium',
    prix_fcfa: 250_000,
    max_equipements: 100,
    max_techniciens: 15,
    description: 'Grandes entreprises',
  },
]

export const PLAN_BY_KEY: Record<TypePlan, PlanInfo> = Object.fromEntries(
  PLANS.map((p) => [p.key, p])
) as Record<TypePlan, PlanInfo>
