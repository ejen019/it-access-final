import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Mail, Phone, MessageCircle } from 'lucide-react'
import { fetchPublicConfig } from '@/lib/publicConfig'

export function PublicLandingPage() {
  const { data: config } = useQuery({
    queryKey: ['public-config'],
    queryFn: fetchPublicConfig,
  })

  if (!config) return null

  const plans = Object.entries(config.pricing)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <p className="font-semibold text-foreground">IT-Access</p>
          <div className="flex items-center gap-2">
            <Link to="/connexion" className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">Connexion</Link>
            <Link to="/inscription" className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Inscription</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{config.hero_title}</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">{config.hero_subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/inscription" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              Demarrer <ArrowRight size={14} />
            </Link>
            <Link to="/connexion" className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
              J'ai deja un compte
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            'Suivi des equipements et passeports QR',
            'Gestion des interventions et signatures',
            'Pilotage des quotas par abonnement annuel',
          ].map((text) => (
            <div key={text} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 mt-0.5" />
                <p className="text-sm text-foreground">{text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Tarifs entreprise</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {plans.map(([key, p]) => (
              <article key={key} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">{p.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{p.price_fcfa.toLocaleString('fr-FR')} FCFA</p>
                <p className="text-xs text-muted-foreground">par an</p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li>{p.max_equipment} equipements max</li>
                  <li>{p.max_technicians} techniciens max</li>
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <a href={`mailto:${config.contact_email}`} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-accent">
              <Mail size={14} /> {config.contact_email}
            </a>
            <a href={`tel:${config.contact_phone}`} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-accent">
              <Phone size={14} /> {config.contact_phone}
            </a>
            <a href={`https://wa.me/${config.contact_whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-accent">
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Liens rapides</h2>
          <div className="flex flex-wrap gap-2">
            {config.quick_links.map((item) => (
              <a key={item.href + item.label} href={item.href} className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">
                {item.label}
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-3">
          <p className="text-sm text-muted-foreground">
            IT-Access centralise le suivi, la maintenance et les preuves d'intervention de vos équipements IT.
          </p>
          <p className="text-xs text-muted-foreground">
            © 2026 IT-Access. Tous droits réservés.
          </p>
          <div className="pt-2">
            <p className="text-sm font-semibold text-foreground">Liens utiles</p>
            <p className="text-sm text-foreground mt-2">Nous contacter</p>
            <a href="mailto:itaccesscontact@gmail.com" className="text-sm text-primary hover:underline">
              itaccesscontact@gmail.com
            </a>
            <p className="text-sm text-muted-foreground mt-1">Support IT-Access</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
