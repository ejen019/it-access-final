# 00 — READ ME FIRST

## Objectif
Reproduire **à l’identique** IT-Access V2 (frontend + backend Supabase) en binôme, en pratiquant réellement chaque module.

## Stratégie recommandée (ordre d’attaque)
Approche **par module vertical** (front + back ensemble), pas front seul puis back seul.

1. Initialisation projet + socle technique
2. Auth + profils + rôles + garde de routes
3. Dashboards par rôle
4. Utilisateurs/entreprises/techniciens + affectations
5. Équipements (CRUD + QR + passeport)
6. Interventions (cycle complet + signature + PDF)
7. Messagerie + notifications + audit
8. Contrats + paramètres publics
9. Espace sudo + finalisation UI + validations

Pourquoi ce choix: vous voyez immédiatement le lien entre UI, types, requêtes Supabase, RLS et flux métier.

## Répartition de travail
- Binôme A: prend en priorité le squelette app, routing, auth state, pages “gestion” (users/contracts/sudo), audit.
- Binôme B: prend en priorité les composants métier lourds (equipment/interventions/messaging), hooks data, QR/PDF/files.
- Chaque module doit inclure une part front **et** back pour A et B.

## Méthode de reproduction
Pour chaque fichier: 
1. Le recréer de zéro dans votre nouveau repo.
2. Retaper la logique (pas copier-coller aveugle).
3. Brancher immédiatement sur Supabase.
4. Tester le scénario métier associé avant de passer au fichier suivant.

## Durée estimée totale
- Cadence apprentissage sérieuse: **14 à 20 jours ouvrés**.
- Charge estimée: **90 à 130 heures** (45–65 h par personne).

Répartition indicative:
- Socle + auth: 12–16 h
- Users/roles/assignments: 10–14 h
- Équipements: 16–24 h
- Interventions: 24–36 h
- Messagerie/notifications/audit: 10–16 h
- Contrats/public/sudo/QA final: 12–18 h

## Règles de collaboration
- 1 branche fonctionnelle = 1 domaine clair.
- PR courtes (max ~500 lignes utiles).
- Commit atomique: “un comportement = un commit”.
- Validation obligatoire en local avant merge: `npm run typecheck`, `npm run lint`, test manuel métier.
