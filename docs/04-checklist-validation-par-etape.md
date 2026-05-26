# 04 - Checklist de validation par etape

## Regle de travail
- Ne passez pas a l etape suivante tant que l etape courante n est pas validee a la fois visuellement et cote data.
- A chaque etape: un test utilisateur minimal, un test d acces role, un test Supabase si applicable.

## Etape 1 - Socle applicatif
- [ ] `npm run typecheck` passe.
- [ ] `npm run lint` passe.
- [ ] L application monte sur la page d accueil ou la page de connexion selon la session.
- [ ] Le theme est conserve apres refresh.
- [ ] Le mode hors ligne affiche bien le bandeau `NetworkBanner`.
- [ ] La page inconnue renvoie bien vers la 404.

## Etape 2 - Authentification
- [ ] Connexion utilisateur classique fonctionne.
- [ ] Connexion sudo fonctionne uniquement pour les comptes `sudo`.
- [ ] Inscription entreprise cree le compte, le profil et le statut en attente.
- [ ] Inscription technicien cree le compte et le profil correspondant.
- [ ] Mot de passe oublie envoie bien le mail.
- [ ] Reset mot de passe met a jour l utilisateur et renvoie vers la connexion.

## Etape 3 - Garde de route et redirections
- [ ] `/` redirige vers le bon espace selon le role.
- [ ] Un utilisateur non connecte est renvoye vers `/connexion`.
- [ ] Un compte non valide voit l ecran d attente.
- [ ] Un compte valide est redirige vers son dashboard.
- [ ] Un role refuse ne peut pas entrer dans un espace qui ne lui appartient pas.

## Etape 4 - Layouts et navigation
- [ ] L espace admin affiche la sidebar desktop correcte.
- [ ] L espace sudo est bien isole de l espace admin.
- [ ] L espace technicien affiche la navigation basse mobile.
- [ ] L espace entreprise affiche la navigation basse mobile.
- [ ] La cloche notifications fonctionne dans tous les layouts.

## Etape 5 - Utilisateurs et profils
- [ ] L admin voit les onglets attente / entreprises / techniciens.
- [ ] Le sudo voit aussi les admins.
- [ ] Valider un compte change bien son statut dans `profiles`.
- [ ] Desactiver un compte empeche la connexion.
- [ ] L affectation technicien -> entreprise s enregistre dans `assignments`.
- [ ] Le profil permet de modifier nom, telephone et mot de passe.
- [ ] Le code de validation entreprise peut etre copie et regenere.

## Etape 6 - Equipements
- [ ] L admin voit tous les equipements de toutes les entreprises.
- [ ] L entreprise voit seulement son parc.
- [ ] Ajouter un equipement cree bien le QR code de passeport.
- [ ] Modifier un equipement conserve les photos existantes.
- [ ] Supprimer un equipement le retire de la liste et du passeport.
- [ ] L import IA detecte seulement les donnees presentes dans le fichier.
- [ ] Le scan QR du technicien ouvre le bon passeport.
- [ ] Les documents attaches sont telechargeables.

## Etape 7 - Interventions
- [ ] L admin peut creer une intervention avec entreprise, equipements et techniciens.
- [ ] La creation notifie les techniciens et l entreprise.
- [ ] Le technicien peut demarrer une mission.
- [ ] Le technicien peut saisir un rapport et ajouter des photos.
- [ ] La cloture passe bien en `en_attente_validation`.
- [ ] L entreprise peut saisir le code et signer.
- [ ] Le PDF est genere, enregistre et telechargeable.
- [ ] Une annulation admin se voit dans les listes et notifie les acteurs.

## Etape 8 - Messagerie
- [ ] Les bons contacts s affichent selon le role.
- [ ] Un message apparait en temps reel sans refresh.
- [ ] La reponse a un message fonctionne.
- [ ] Le fil de discussion reste coherent sur mobile.

## Etape 9 - Contrats, audit, vitrine
- [ ] L admin peut creer un contrat pour une entreprise sans contrat actif.
- [ ] Les quotas du contrat sont affiches dans le dashboard entreprise.
- [ ] La vitrine publique charge bien la config `app_settings`.
- [ ] Le public fallback local fonctionne si la table est absente.
- [ ] L historique global affiche les logs d actions.
- [ ] Les actions create/update/delete ecrivent bien dans `audit_logs`.

## Etape 10 - Sudo
- [ ] Le sudo voit toutes les entreprises et tous les equipements.
- [ ] Le sudo voit tous les incidents globaux.
- [ ] Le sudo peut valider, desactiver et supprimer des comptes.
- [ ] Le sudo peut creer un administrateur.
- [ ] Le sudo peut modifier la vitrine et le pricing.

## Etape 11 - Verification finale
- [ ] Parcourir un cycle complet: inscription -> validation -> connexion -> parc -> panne -> intervention -> signature -> PDF.
- [ ] Verifier le cycle inverse: annulation, desactivation, suppression.
- [ ] Verifier les permissions avec 4 comptes reels: sudo, admin, technicien, entreprise.
- [ ] Verifier les routes directes par URL avec refresh.
- [ ] Verifier que les notifications disparaissent apres lecture.
- [ ] Verifier que les fichiers Storage sont toujours accessibles via URL publique.

## Critere de passage a la suite
- Si une etape echoue, on corrige avant de continuer.
- Si la route fonctionne mais la RLS bloque, ce n est pas valide.
- Si l interface est bonne mais le backend ne persiste pas correctement, ce n est pas valide.
