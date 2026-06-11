import { Link } from 'react-router-dom'
import {
  Monitor, Wrench, QrCode, FileText, MessageSquare,
  Shield, ArrowRight, CheckCircle2, ChevronRight,
  BarChart2, Clock, Users,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Monitor,
    title: 'Parc d\'équipements',
    desc: 'Centralisez tous vos équipements IT. Fiches détaillées, historique, photos et passeport numérique QR pour chaque machine.',
  },
  {
    icon: Wrench,
    title: 'Gestion des interventions',
    desc: 'Planifiez et suivez chaque intervention en temps réel. De la création à la signature électronique du rapport de clôture.',
  },
  {
    icon: QrCode,
    title: 'Passeport QR code',
    desc: 'Chaque équipement dispose d\'un QR code unique. Scannez et accédez instantanément à toutes les informations et l\'historique.',
  },
  {
    icon: FileText,
    title: 'Contrats & abonnements',
    desc: 'Gérez vos contrats de maintenance avec des plans adaptés (Starter, Medium, Premium) incluant quotas d\'équipements et techniciens.',
  },
  {
    icon: MessageSquare,
    title: 'Messagerie intégrée',
    desc: 'Communiquez directement entre entreprises, techniciens et administrateurs sans sortir de l\'application.',
  },
  {
    icon: Shield,
    title: 'Sécurité & traçabilité',
    desc: 'Journal d\'audit complet, validation des comptes, rôles et permissions granulaires pour protéger toutes vos données.',
  },
]

const PLANS = [
  { name: 'Starter',  price: '50 000',  desc: 'Petites structures',       equipment: 10,  technicians: 2,  popular: false },
  { name: 'Medium',   price: '120 000', desc: 'Entreprises en croissance', equipment: 30,  technicians: 5,  popular: true  },
  { name: 'Premium',  price: '250 000', desc: 'Grandes entreprises',       equipment: 100, technicians: 15, popular: false },
]

const STEPS = [
  { step: '01', title: 'Créez votre compte',  desc: 'Inscrivez votre entreprise. Un administrateur valide votre accès sous 24h.' },
  { step: '02', title: 'Importez votre parc', desc: 'Ajoutez vos équipements manuellement ou via import CSV assisté par IA.' },
  { step: '03', title: 'Déclarez vos pannes', desc: 'Signalez une panne depuis l\'app. Un technicien est affecté automatiquement.' },
  { step: '04', title: 'Suivez & signez',     desc: 'Suivez l\'intervention en temps réel et signez le rapport électroniquement.' },
]

const STATS = [
  { icon: BarChart2, value: '99.9%', label: 'Disponibilité' },
  { icon: Clock,     value: '< 2h',  label: 'Temps de réponse' },
  { icon: Users,     value: '500+',  label: 'Équipements gérés' },
]

export function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white leading-none">IT</span>
            </div>
            <span className="text-[13px] font-semibold text-foreground">IT-Access</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-[13px] text-muted-foreground">
            <a href="#fonctionnalites" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-foreground transition-colors">Tarifs</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/connexion" className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">
              Connexion
            </Link>
            <Link to="/inscription" className="px-3 py-1.5 text-[13px] text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors font-medium">
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4">

        {/* Hero */}
        <section className="pt-10 pb-16 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight max-w-2xl mx-auto tracking-tight">
            Gérez votre parc IT
            <span className="text-primary block">simplement.</span>
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
            IT-Access centralise équipements, interventions et contrats de maintenance en une seule plateforme, accessible partout.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/inscription" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm">
              Démarrer gratuitement 
            </Link>
            <Link to="/connexion" className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              J'ai déjà un compte <ChevronRight size={15} />
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="pb-16 grid grid-cols-3 gap-3">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
              <Icon size={18} className="text-primary mx-auto mb-2 opacity-60" strokeWidth={1.8} />
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="pb-16 space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold text-foreground">Tout ce dont vous avez besoin</h2>
            <p className="text-muted-foreground text-sm">Une suite complète pour la maintenance IT</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/12 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                  <Icon size={16} className="text-primary" strokeWidth={1.8} />
                </div>
                <p className="text-[13px] font-semibold text-foreground mb-1">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="pb-16 space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold text-foreground">Comment ça marche</h2>
            <p className="text-muted-foreground text-sm">Opérationnel en moins de 10 minutes</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {STEPS.map(({ step, title, desc }, i) => (
              <div key={step} className="relative bg-card border border-border rounded-xl p-5">
                <p className="text-[11px] font-bold text-primary/40 mb-2 tracking-widest">{step}</p>
                <p className="text-[13px] font-semibold text-foreground mb-1.5">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-1.5 w-3 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="pb-16 space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold text-foreground">Plans & Tarifs</h2>
            <p className="text-muted-foreground text-sm">Facturation annuelle · Support inclus dans tous les plans</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(({ name, price, desc, equipment, technicians, popular }) => (
              <div key={name} className={`bg-card rounded-xl p-6 relative flex flex-col border-2 ${popular ? 'border-primary' : 'border-border'}`}>
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-[11px] font-semibold rounded-full whitespace-nowrap">
                    Le plus populaire
                  </span>
                )}
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-sm font-bold text-foreground">{name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{price}</span>
                    <span className="text-xs text-muted-foreground">FCFA / an</span>
                  </div>
                  <ul className="space-y-2">
                    {[
                      `${equipment} équipements maximum`,
                      `${technicians} technicien${technicians > 1 ? 's' : ''} maximum`,
                      'Passeports QR illimités',
                      'Journal d\'audit',
                      'Support prioritaire',
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 size={12} className="text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link to="/inscription"
                  className={`mt-5 block text-center px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    popular
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'border border-border hover:bg-accent text-foreground'
                  }`}>
                  Choisir {name}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="pb-20">
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-10 text-center space-y-4">
            <h2 className="text-xl font-bold text-foreground">Prêt à démarrer ?</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Inscrivez votre entreprise maintenant. Votre accès sera validé sous 24h par un administrateur.
            </p>
            <Link to="/inscription" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors">
              Créer mon compte <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <span className="text-[9px] font-bold text-white">IT</span>
            </div>
            <span className="text-[13px] font-medium text-foreground">IT-Access</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">· Gestion de maintenance informatique</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} IT-Access. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
