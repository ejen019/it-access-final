# 02 - Frontend binome par binome

## Lecture rapide
- `Binome A` prend le socle technique, l auth, les espaces admin/sudo, les pages de pilotage et les ecrans de gestion.
- `Binome B` prend les layouts mobiles, le metier terrain, les hooks data, les composants reutilisables et les pages operatives.
- L ordre ci-dessous suit la logique de reproduction: base app -> acces -> navigation -> modules metier -> finition.

## 1. Socle applicatif

| Ordre | Fichier | Role | Difficulté | Prérequis | Ce qu il faut reproduire | Binôme |
|---|---|---|---|---|---|---|
| 1 | `src/main.tsx` | Point d entree React/Vite | Débutant | `createRoot`, CSS globale, racine HTML | Monter `<Providers />` dans `StrictMode` et charger `globals.css` | A |
| 2 | `src/app/providers.tsx` | Providers globaux, auth, theme, network, router | Avancé | `React Query`, Supabase Auth, Realtime, stores Zustand | Refaire le chainage `QueryClient -> Auth -> Theme -> Network -> Router` avec chargement profil et synchro Realtime | A |
| 3 | `src/app/router.tsx` | Arbre des routes de toute l app | Avancé | React Router v6, guards, layouts par role | Reproduire toutes les routes publiques, role-based, et les redirects de l application | A |
| 4 | `src/stores/auth.store.ts` | Etat global de session et role | Intermédiaire | Zustand, persistance localStorage | Refaire le store `profile/isLoading` et les helpers de role | A |
| 5 | `src/stores/ui.store.ts` | Theme, sidebar, statut reseau | Intermédiaire | Zustand persist, events navigateur | Refaire le theme persiste et le statut online/offline | B |
| 6 | `src/types/index.ts` | Types metier partages | Intermédiaire | Types TS, correspondance schema SQL | Reproduire les interfaces metier et les unions de roles/statuts | B |
| 7 | `src/lib/supabase/client.ts` | Client Supabase typé | Débutant | `createClient`, env Vite, generics Database | Refaire le client unique avec validation des variables d environnement | B |
| 8 | `src/lib/supabase/database.types.ts` | Types generes Supabase | Avancé | `supabase gen types`, schema a jour | Regenerer les types depuis le schema Supabase, ne pas modifier a la main | B |
| 9 | `src/styles/globals.css` | Design system global + tokens | Intermédiaire | Tailwind, CSS variables, dark mode | Reproduire les variables, polices, utilitaires `status-*`/`urgency-*`, animations | B |

## 2. Composants partagees

| Ordre | Fichier | Role | Difficulté | Prérequis | Ce qu il faut reproduire | Binôme |
|---|---|---|---|---|---|---|
| 10 | `src/components/shared/LoadingScreen.tsx` | Ecran de chargement global | Débutant | JSX conditionnel | Refaire le loader plein ecran reutilisable | A |
| 11 | `src/components/shared/NotFoundPage.tsx` | Page 404 | Débutant | React Router `Link` | Reproduire la 404 simple et propre | A |
| 12 | `src/components/shared/RootRedirect.tsx` | Redirection racine selon role | Intermédiaire | Store auth, navigation conditionnelle | Refaire le choix entre accueil public et dashboard role-based | A |
| 13 | `src/components/shared/ProtectedRoute.tsx` | Garde de route et attente validation | Avancé | Role-based auth, `Navigate`, Realtime, UX de transition | Reproduire la logique: loading, no session, attente validation, redirection apres validation, page 403 implicite | A |
| 14 | `src/components/shared/NetworkBanner.tsx` | Bandeau online/offline | Intermédiaire | `online/offline`, framer-motion | Refaire le bandeau qui apparait hors ligne puis confirme le retour en ligne | B |
| 15 | `src/components/shared/NotificationBell.tsx` | Cloche notifications temps reel | Avancé | React Query, Supabase Realtime, menu contextuel | Reproduire le compteur, l invalidation Realtime, le marquage lu et la navigation sur clic | B |
| 16 | `src/components/shared/SimpleBarChart.tsx` | Micro composant KPI visuel | Débutant | Props typées, calcul de largeur | Refaire le bar chart compact reutilisable dans les dashboards | B |

## 3. Layouts

| Ordre | Fichier | Role | Difficulté | Prérequis | Ce qu il faut reproduire | Binôme |
|---|---|---|---|---|---|---|
| 17 | `src/components/layout/AdminLayout.tsx` | Shell desktop Admin | Intermédiaire | `Outlet`, `NavLink`, logout Supabase | Refaire sidebar, header, notification bell et mini-profil | A |
| 18 | `src/components/layout/SudoLayout.tsx` | Shell desktop Sudo | Intermédiaire | Layout role-based, navigation isolée | Refaire l espace sudo separé de admin avec la meme logique visuelle | A |
| 19 | `src/components/layout/TechnicienLayout.tsx` | Shell mobile-first Technicien | Intermédiaire | Bottom nav, mobile UX | Refaire le header compact + navigation basse fixe | B |
| 20 | `src/components/layout/EntrepriseLayout.tsx` | Shell mobile-first Entreprise | Intermédiaire | Bottom nav, mobile UX | Refaire le header compact + navigation basse fixe, sur le modele entreprise | B |

## 4. Auth et acces

| Ordre | Fichier | Role | Difficulté | Prérequis | Ce qu il faut reproduire | Binôme |
|---|---|---|---|---|---|---|
| 21 | `src/features/auth/pages/LoginPage.tsx` | Connexion commune | Intermédiaire | Supabase Auth, lecture profil, redirect role | Refaire login + verification `is_active`/`is_validated` + redirection par role | A |
| 22 | `src/features/auth/pages/SudoLoginPage.tsx` | Connexion secrete Sudo | Intermédiaire | Auth, controle role stricte | Reproduire le login sans branding et la validation du role `sudo` uniquement | A |
| 23 | `src/features/auth/pages/RegisterPage.tsx` | Inscription entreprise/technicien | Avancé | React state multi-etapes, Edge Function `register-user`, pricing public | Refaire le choix de role, le formulaire, la validation de formule entreprise et l appel backend | A |
| 24 | `src/features/auth/pages/ForgotPasswordPage.tsx` | Demande reset mot de passe | Débutant | `resetPasswordForEmail` | Refaire l envoi de lien de reset et l ecran de confirmation | B |
| 25 | `src/features/auth/pages/ResetPasswordPage.tsx` | Nouveau mot de passe | Intermédiaire | `PASSWORD_RECOVERY`, `updateUser` | Reproduire la saisie + confirmation + mise a jour du mot de passe | B |

## 5. Dashboards

| Ordre | Fichier | Role | Difficulté | Prérequis | Ce qu il faut reproduire | Binôme |
|---|---|---|---|---|---|---|
| 26 | `src/features/dashboard/pages/AdminDashboardPage.tsx` | Vue d ensemble admin | Avancé | Count queries, KPI, charts, React Query | Refaire les KPI, l apercu des interventions recentes et les raccourcis | A |
| 27 | `src/features/dashboard/pages/SudoDashboardPage.tsx` | Supervision globale sudo | Avancé | Query multiples, tabs, mutation create admin, config publique | Reproduire l onglet overview/admins/companies/pending/settings | A |
| 28 | `src/features/dashboard/pages/TechnicienDashboardPage.tsx` | Tableau de bord technicien | Intermédiaire | Filtrage interventions, assignments | Refaire les compteurs missions, alerte critique, raccourcis scanner/interventions | B |
| 29 | `src/features/dashboard/pages/EntrepriseDashboardPage.tsx` | Tableau de bord entreprise | Avancé | `useCompanyEquipment`, `useCompanyInterventions`, clipboard | Reproduire les KPI, le code de validation, le contrat et les alertes | B |

## 6. Utilisateurs, profils, audit, contrats, public

| Ordre | Fichier | Role | Difficulté | Prérequis | Ce qu il faut reproduire | Binôme |
|---|---|---|---|---|---|---|
| 30 | `src/features/users/pages/UsersPage.tsx` | Gestion users admin | Avancé | Queries jointes, mutations, delete via Edge Function | Refaire les onglets attente/entreprises/techniciens, validation, affectation, suppression | A |
| 31 | `src/features/sudo/pages/SudoUsersPage.tsx` | Gestion users sudo | Avancé | Meme logique que UsersPage + onglet admins | Refaire la vue complete avec admins visibles et action globale | A |
| 32 | `src/features/users/pages/ProfilePage.tsx` | Profil commun | Avancé | Update profile, update password, theme store, code validation | Reproduire edition profil, changement mdp, theme et code de validation entreprise | A |
| 33 | `src/features/audit/pages/AuditLogsPage.tsx` | Historique global | Intermédiaire | JSONB, recherche filtre, lecture audit_logs | Refaire le tableau filtrable des evenements et le rendu du JSON details | A |
| 34 | `src/features/contracts/pages/ContractsPage.tsx` | Gestion contrats | Avancé | Plans tarifaires, insert/update relationnels | Reproduire creation, quotas, affichage expiration, liaison company -> contract | A |
| 35 | `src/features/public/pages/PublicLandingPage.tsx` | Vitrine publique | Intermédiaire | Config publique, SEO simple, liens externes | Refaire le hero, les cartes tarifaires, les contacts et les liens rapides | B |
| 36 | `src/lib/publicConfig.ts` | Config publique + fallback local | Intermédiaire | `app_settings`, localStorage, merge config | Reproduire le chargement/backup local et le save vers Supabase | B |
| 37 | `src/lib/audit.ts` | Helper d ecriture audit | Débutant | Supabase Auth getUser, insert audit_logs | Refaire l ecriture d un log d audit cote client | A |

## 7. Equipements

| Ordre | Fichier | Role | Difficulté | Prérequis | Ce qu il faut reproduire | Binôme |
|---|---|---|---|---|---|---|
| 38 | `src/features/equipment/hooks/useEquipment.ts` | CRUD equipements + upload photo | Avancé | React Query, Storage Supabase, QR URL | Refaire les queries par entreprise, les mutations CRUD, l upload Storage et le QR apres creation | B |
| 39 | `src/features/equipment/components/EquipmentForm.tsx` | Formulaire create/edit equipement | Avancé | Formulaire complexe, upload photos, max 3 photos | Reproduire le formulaire reutilisable en creation et edition | B |
| 40 | `src/features/equipment/components/BulkImportModal.tsx` | Import IA en masse | Avancé | Groq SDK, lecture fichier texte, filtre stricte | Refaire le flow upload -> extraction -> preview -> import -> done sans inventer de data | B |
| 41 | `src/features/equipment/pages/EquipmentAdminPage.tsx` | Vue admin du parc | Avancé | Tables, filtres, modales, print QR | Reproduire la liste globale, les filtres, l ajout, la suppression et l import IA | A |
| 42 | `src/features/equipment/pages/ParcPage.tsx` | Parc entreprise | Intermédiaire | Cartes responsive, `useCompanyEquipment` | Refaire la liste mobile, les filtres et l ouverture du formulaire d ajout | B |
| 43 | `src/features/equipment/pages/EquipmentPassportPage.tsx` | Passeport numerique equipement | Avancé | QR code, documents, historique interventions, modales | Reproduire la fiche complete, le QR, les documents, l edition et le signalement panne | B |
| 44 | `src/features/equipment/pages/ScanPage.tsx` | Scanner QR technicien | Avancé | `BarcodeDetector`, camera, cleanup stream | Refaire le scan video + saisie manuelle de fallback | B |
| 45 | `src/lib/utils/qrcode.ts` | Generation/impression QR | Intermédiaire | `qrcode`, `window.print`, URL origine | Reproduire la generation du lien passeport, l image base64 et la fenetre d impression | B |
| 46 | `src/features/sudo/pages/SudoEquipmentPage.tsx` | Vue globale lecture equipements | Intermédiaire | Query liste + filtres | Refaire la vue lecture sudo avec stats et lien vers le passeport | A |

## 8. Interventions

| Ordre | Fichier | Role | Difficulté | Prérequis | Ce qu il faut reproduire | Binôme |
|---|---|---|---|---|---|---|
| 47 | `src/features/interventions/hooks/useInterventions.ts` | Hooks metier interventions | Avancé | Queries jointes, notifications, Storage, PDF | Refaire les queries, les mutations, les notifications, le upload media et le PDF | B |
| 48 | `src/features/interventions/pages/InterventionsAdminPage.tsx` | Vue admin des interventions | Avancé | Filtres, creation, annulation | Reproduire la liste, la creation, les filtres et l action de moderation | A |
| 49 | `src/features/interventions/pages/InterventionsEntreprisePage.tsx` | Vue entreprise des interventions | Intermédiaire | Etat de signature, filtres status | Refaire la liste compacte et l alerte a signer | B |
| 50 | `src/features/interventions/pages/InterventionsTechPage.tsx` | Vue technicien des missions | Intermédiaire | Mobile list, badges, priorite | Reproduire les cartes mission et les stats rapides | B |
| 51 | `src/features/interventions/pages/InterventionDetailPage.tsx` | Detail complet du workflow | Avancé | `react-signature-canvas`, `jsPDF`, Storage, mutations status | Refaire le cycle complet: demarrer -> rapport -> cloturer -> signer -> PDF -> annuler admin | B |
| 52 | `src/features/sudo/pages/SudoInterventionsPage.tsx` | Vue globale lecture interventions | Intermédiaire | Query liste, filtres, lien detail | Refaire la vue sudo avec stats, filtres et navigation detail | A |

## 9. Messaging

| Ordre | Fichier | Role | Difficulté | Prérequis | Ce qu il faut reproduire | Binôme |
|---|---|---|---|---|---|---|
| 53 | `src/features/messaging/pages/MessagingPage.tsx` | Messagerie temps reel | Avancé | Realtime, conversation id, reply, mobile split view | Refaire la liste contacts, le chat, les replies, le temps reel et la navigation mobile | B |

## 10. Assets frontend

| Fichier | Role | Ce qu il faut faire | Binôme |
|---|---|---|---|
| `src/assets/hero.png` | Image hero de la landing | Reutiliser telle quelle, ne pas la refaire | B |
| `src/assets/react.svg` | Asset Vite de demo | Conserver ou ignorer | B |
| `src/assets/vite.svg` | Asset Vite de demo | Conserver ou ignorer | B |

## 11. Rythme conseille
- Reprendre le socle, puis auth, puis layouts, puis un module metier complet a la fois.
- Ne pas ouvrir plus de 2 fichiers en parallele par personne tant que le comportement n est pas valide.
- Chaque fichier doit etre recrée, lance, et teste dans le navigateur avant de passer au suivant.
