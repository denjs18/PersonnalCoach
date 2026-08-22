# 💪 Coach — appli d'entraînement perso

Une app web (installable sur téléphone) pour préparer des séances de sport et les
suivre. Deux profils :

- **Coach** — compose les séances jour par jour, pioche dans une bibliothèque de
  119 exercices ou crée les siens, puis publie.
- **Athlète** — voit les séances prêtes, les déroule exercice par exercice, note
  (si elle veut) le poids et les répétitions, et suit sa progression.

Pensée pour du **poids libre, médecine ball / slam ball, mouvement fonctionnel et
exercices à deux**, avec du rameur / vélo à l'échauffement. Peu de muscu isolée.

---

## 📱 Ce qu'on y trouve

### Côté athlète

| Écran | Contenu |
|---|---|
| **Accueil** | La prochaine séance en grand, objectif de la semaine, série de semaines, séances à rattraper |
| **Séance** | Exercices par bloc (échauffement / principal / finisher / retour au calme), saisie poids + reps série par série, chrono de repos, consignes du coach, « comment faire » |
| **Historique** | Toutes les séances terminées, par mois, avec ressenti et durée |
| **Progression** | Records par exercice, courbes de charge et de volume, détail séance par séance |

Pendant la séance : sauvegarde automatique, pré-remplissage avec l'objectif du
coach ou la dernière perf, rappel de « la dernière fois tu as fait 12 kg × 12 »,
et un écran de félicitations à la fin.

### Côté coach

| Écran | Contenu |
|---|---|
| **Planning** | Bandeau des 3 prochaines semaines, brouillons, séances prêtes, séances faites, modèles |
| **Composer** | Titre, date, focus, intensité, mot du coach, puis les exercices : séries, reps, poids indicatif, repos, superset, consigne personnalisée |
| **Bibliothèque** | 119 exercices de départ + les tiens. Recherche, filtres par catégorie et matériel, création, modification, archivage |
| **Suivi** | Ce qu'elle a réellement fait, ses retours, sa progression par exercice |
| **Réglages** | Son prénom, objectif hebdo, message de motivation |

Une séance reste invisible pour elle tant qu'elle est en **brouillon**. Un bouton
« Publier pour elle » la rend visible immédiatement.

---

## 🗄️ Quel hébergement pour les données ?

L'app parle **Postgres standard** — elle n'est attachée à aucun fournisseur. Tu
peux changer d'hébergeur plus tard en changeant juste `DATABASE_URL`.

| Solution | Gratuit ? | Le point important |
|---|---|---|
| **Neon** ✅ *recommandé* | Oui | Plusieurs projets sur le plan gratuit, la base ne se supprime pas si tu ne t'en sers pas. Elle se met en veille après quelques minutes d'inactivité et se réveille en moins d'une seconde. Intégration native avec Vercel. |
| Prisma Postgres / Railway / Render | Oui, selon les offres | Marchent aussi, il suffit de coller l'URL. Vérifie s'ils suspendent les bases inactives. |
| Supabase | Oui | Ce que tu veux éviter : nombre de projets limité et mise en pause après une période d'inactivité. |
| MongoDB Atlas | Oui | Pas du Postgres — l'app ne fonctionnerait pas sans réécrire la couche de données. |

**Recommandation : Neon.** Le volume de données ici est minuscule (deux
personnes, quelques milliers de lignes par an) : tu resteras très loin des
limites du plan gratuit, et rien ne s'auto-détruit si vous ne vous entraînez pas
pendant deux semaines.

> Les offres gratuites bougent régulièrement — jette un œil à la page tarifs
> avant de créer le compte.

---

## 🚀 Mise en ligne (≈ 15 minutes)

### 1. La base de données

1. Crée un compte sur **neon.com**, puis un projet (région Europe, `Frankfurt` ou
   `Paris` si proposée).
2. Copie la chaîne de connexion **pooled** proposée à la création. Elle ressemble à :
   ```
   postgresql://neondb_owner:xxxx@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

### 2. Créer les tables et la bibliothèque d'exercices

Sur ton ordinateur, dans le dossier du projet :

```bash
npm install
cp .env.example .env.local     # puis colle ton DATABASE_URL dedans
npm run db:setup
```

La commande crée les tables et installe les 119 exercices. Elle est
**ré-exécutable sans risque** : elle ne casse rien et ne touche pas aux exercices
que tu as créés toi-même.

### 3. Déployer sur Vercel

1. Pousse ce dépôt sur GitHub.
2. Sur **vercel.com** : *Add New → Project*, choisis le dépôt, *Deploy*.
3. Dans *Settings → Environment Variables*, ajoute :

   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | la chaîne de connexion Neon |
   | `COACH_PIN` | ton code (4 à 8 chiffres) |
   | `ATHLETE_PIN` | son code |
   | `AUTH_SECRET` | une longue chaîne aléatoire (voir ci-dessous) |

   Pour générer le secret :
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Redéploie (*Deployments → ⋯ → Redeploy*) pour que les variables soient prises
   en compte.

### 4. L'installer sur le téléphone

Ouvre l'URL Vercel sur le téléphone, puis :

- **iPhone** — Safari → bouton *Partager* → *Sur l'écran d'accueil*
- **Android** — Chrome → menu ⋮ → *Ajouter à l'écran d'accueil*

L'app s'ouvre alors en plein écran, sans barre de navigateur, avec sa propre
icône. La connexion est mémorisée un an : pas de code à retaper à chaque fois.

---

## 🛠️ En local

```bash
npm install
npm run db:setup      # une seule fois
npm run dev           # http://localhost:3000
```

Sans `COACH_PIN` / `ATHLETE_PIN` dans l'environnement, les codes de développement
sont `1234` (coach) et `0000` (athlète). **En production, les deux variables sont
obligatoires** : sans elles, aucune connexion n'est possible.

Scripts disponibles :

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run db:setup` | Crée les tables + synchronise la bibliothèque |
| `npm run db:seed` | Synchronise la bibliothèque seulement |
| `npm run db:reset` | ⚠️ Supprime tout et recrée |

---

## 🧱 Comment c'est fait

- **Next.js 15** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — thème sombre, pensé mobile d'abord
- **Drizzle ORM** sur **Postgres** — driver HTTP chez Neon, TCP ailleurs
- **jose** — session signée dans un cookie `httpOnly`, un code par profil
- PWA : manifeste, icônes, mode plein écran. Pas de service worker : l'app a
  besoin du réseau pour lire et écrire les séances.

### Organisation

```
src/
  app/
    login/                  écran de connexion (pavé numérique)
    app/                    espace athlète (accueil, historique, progression)
    seance/[id]/            le déroulé d'une séance, plein écran
    coach/(shell)/          planning, bibliothèque, suivi, réglages
    coach/seance/[id]/      composition d'une séance
    installation/           guide affiché si la base n'est pas branchée
  components/
    player/                 déroulé de séance + chrono de repos
    coach/                  composition, sélecteur et fiche d'exercice
  lib/
    db/                     schéma Drizzle et connexion
    actions/                Server Actions (séances, séries, exercices…)
    queries.ts              lectures (séances, stats, progression)
    exercise-library.ts     les 119 exercices de départ
db/schema.sql               le schéma SQL, idempotent
```

### Les tables

| Table | Rôle |
|---|---|
| `exercises` | Bibliothèque. `is_custom` distingue tes créations du fonds de départ |
| `workouts` | Une séance : date, statut (`draft` / `published` / `done`), consignes, ressenti |
| `workout_items` | Un exercice dans une séance : bloc, séries, objectifs, repos, note |
| `set_logs` | Une série réalisée : reps, poids, temps, distance. C'est la source de la progression |
| `settings` | Prénom de l'athlète, objectif hebdo, message d'accueil |

---

## ✏️ Personnaliser

- **Ajouter des exercices** — depuis l'app (*Bibliothèque → Créer un exercice*),
  ou en modifiant `src/lib/exercise-library.ts` puis `npm run db:seed`.
- **Changer les couleurs** — les variables de thème sont en haut de
  `src/app/globals.css` (`--color-brand`, `--color-energy`…).
- **Changer les blocs de séance** (échauffement, principal…) — `SECTIONS` dans
  `src/lib/constants.ts`.
- **Changer le nom de l'app sur le téléphone** — `src/app/manifest.ts`.

---

## 🔐 À savoir sur la sécurité

L'app est prévue pour deux personnes qui se font confiance : l'accès repose sur
un code par profil, pas sur de vrais comptes. Concrètement :

- choisis des codes que vous êtes les seuls à connaître ;
- ne partage pas l'URL publiquement ;
- `AUTH_SECRET` doit être long et aléatoire, et ne jamais être committé.

Ce n'est pas un système d'authentification pour du multi-utilisateur — c'est
volontaire, ça garde l'app simple et agréable à ouvrir.
