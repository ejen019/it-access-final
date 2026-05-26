# IT-Access V2

Plateforme web de gestion de maintenance informatique pour centraliser:
- le parc d'équipements,
- les interventions terrain,
- les affectations techniciens,
- la signature client et les comptes-rendus PDF,
- le pilotage opérationnel (dashboards, notifications, contrats).

## Objectif
Remplacer les outils dispersés (Excel, cahiers, WhatsApp) par une application unique, traçable et multi-rôles.

## Profils utilisateurs
- `sudo`: supervision globale.
- `admin`: gestion utilisateurs, équipements, interventions, contrats.
- `technicien`: exécution des missions et rapports.
- `entreprise`: signalement des pannes, suivi et signature.

## Stack
- Frontend: `React 19`, `TypeScript`, `Vite`, `Tailwind CSS`
- Data/state: `@tanstack/react-query`, `Zustand`
- Backend: `Supabase` (Auth + Postgres + Realtime + Storage)
- Métier: `jsPDF`, `react-signature-canvas`, `qrcode`, `groq-sdk`

## Démarrage rapide

### 1) Prérequis
- Node.js LTS (18+ recommandé)
- npm
- Un projet Supabase

### 2) Installation
```bash
npm install
```

### 3) Variables d'environnement
Créer `.env.local` à partir de `.env.example` puis renseigner:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GROQ_API_KEY=...
```

### 4) Base de données
Exécuter le schéma SQL dans Supabase:
- Fichier: `supabase/schema.sql`
- Supabase Dashboard -> SQL Editor -> Run

### 5) Lancer l'application
```bash
npm run dev
```

## Scripts utiles
- `npm run dev` : lance le serveur local Vite
- `npm run build` : build de production
- `npm run preview` : preview du build
- `npm run typecheck` : vérification TypeScript
- `npm run lint` : lint ESLint

## Architecture projet

```txt
src/
  app/                 # providers, router
  components/
    layout/            # layouts par rôle
    shared/            # guards, loading, notifications
  features/
    auth/              # login/register/reset
    dashboard/         # dashboards par rôle
    equipment/         # parc, passeport, import IA, QR
    interventions/     # cycle complet intervention
    contracts/         # gestion contrats
    messaging/         # messagerie interne
    sudo/              # vues dédiées sudo
    users/             # profil et gestion utilisateurs
  lib/
    supabase/          # client + types DB
    utils/             # qrcode...
  stores/              # auth/ui (zustand)
  styles/              # styles globaux
supabase/
  schema.sql           # modèle base de données
docs/
  IT-ACCESS_AUDIT_ET_DOCUMENTATION.md
```

## Flux métier principal (intervention)
1. L'entreprise signale une panne sur un équipement.
2. Intervention créée (`active`) avec techniciens affectés.
3. Le technicien démarre (`en_cours`), rédige le rapport et ajoute des photos.
4. Le technicien clôture (`en_attente_validation`).
5. L'entreprise valide par code + signature.
6. Intervention `cloturee` + génération PDF.

## Sécurité et accès
- Routes protégées par rôle (`ProtectedRoute`).
- Espace `sudo` isolé de l'espace `admin`.
- Données côté Supabase à sécuriser via RLS/policies.

## Notes importantes
- Le module d'import IA est en mode extraction stricte: l'IA ne doit pas inventer d'équipements hors document.
- Le module interventions est le cœur critique à retester avant chaque release.

## Documentation complète
Pour l'audit détaillé et la documentation pas à pas (niveau débutant):
- `docs/IT-ACCESS_AUDIT_ET_DOCUMENTATION.md`

## Auteur
Projet porté par **Jean- Paul N'DAYAKE** et **Thierry YERIMA**.
