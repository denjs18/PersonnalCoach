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
| **Séance** | Exercices par bloc (échauffement / principal / finisher / retour au calme), saisie poids + reps série par série, chrono de repos, consignes du coach, dernière perf et record par exercice |
| **Historique** | Toutes les séances terminées, par mois, avec ressenti, durée et calories |
| **Progression** | Records par exercice, courbes de charge et de volume, détail séance par séance |

Pendant la séance : sauvegarde automatique, pré-remplissage avec l'objectif du
coach ou la dernière perf, rappel de « la dernière fois tu as fait 12 kg × 12 »,
et un écran de félicitations à la fin.

Sous chaque exercice, elle voit **ce qu'elle avait fait la dernière fois** et
**son record** sur ce mouvement — de quoi savoir quoi viser sans ouvrir
l'historique.

**Chaque exercice explique comment on le fait.** Un bouton « Comment faire »
déplie le déroulé du mouvement en 3 ou 4 étapes numérotées, les points de
vigilance, et un lien vers une vidéo de démonstration. C'est visible partout :
pendant la séance, dans la bibliothèque, et surtout au moment où le coach
choisit ses exercices — pratique quand on ne connaît pas encore tout.

### Côté coach

| Écran | Contenu |
|---|---|
| **Planning** | Bandeau des 3 prochaines semaines, brouillons, séances prêtes, séances faites, modèles |
| **Composer** | Titre, date, focus, intensité, mot du coach, puis les exercices : séries, reps, poids indicatif, repos, superset, consigne personnalisée |
| **Bibliothèque** | 119 exercices de départ + les tiens, chacun avec son pas-à-pas. Recherche, filtres par catégorie et matériel, création, modification, archivage |
| **Suivi** | Ce qu'elle a réellement fait, ses retours, sa progression par exercice |
| **Réglages** | Son prénom, objectif hebdo, message de motivation, profil physique pour les calories |

Une séance reste invisible pour elle tant qu'elle est en **brouillon**. Un bouton
« Publier pour elle » la rend visible immédiatement.

---

## ⏱️ Durée et calories : comment c'est calculé

**La durée n'est pas un chronomètre.** Ouvrir la séance en avance ou la laisser
tourner pendant une pause ne change rien : le temps est mesuré entre la
première et la dernière série validée, et les intervalles anormalement longs
(téléphone posé, sortie de la salle) sont plafonnés. Si les séries ont été
cochées d'un bloc à la fin, on retombe sur une estimation calculée à partir
d'elles — durée d'effort, repos prévus, temps de mise en place.

À la fin de la séance, **la durée est proposée et reste modifiable** : c'est
elle qui donne les calories, et personne ne connaît mieux le temps passé que
celle qui vient de s'entraîner.

**Les calories sont une estimation**, calculée avec :

- le **métabolisme de repos**, dérivé de la formule de Mifflin-St Jeor à partir
  du sexe, de la taille, du poids et de l'âge renseignés dans *Réglages*
  (majoré de 15 % : la formule donne le métabolisme basal, mesuré couché, alors
  qu'un MET correspond au repos assis) ;
- le **coût énergétique de l'exercice** en MET, propre à chaque mouvement
  (un swing kettlebell à 9,8 ne coûte pas la même chose qu'un étirement à 2,3) ;
- pour le rameur, le vélo et la course, **l'allure réellement tenue** quand la
  distance et la durée sont notées toutes les deux : 10 minutes tranquilles et
  10 minutes à fond ne comptent pas pareil ;
- la **durée de la séance** : le temps qui n'est pas de l'effort est compté en
  récupération, à 2,8 MET — entre deux séries on ne se repose pas assis, le
  cœur et la respiration redescendent lentement. C'est pour ça qu'une séance
  où l'on prend son temps dépense plus qu'une séance expédiée ;
- une **majoration selon la charge** soulevée, rapportée au poids de corps.

Comme toute estimation de dépense énergétique, l'ordre de grandeur est fiable
mais le chiffre exact ne l'est pas : à prendre comme un repère de progression,
pas comme une mesure. Les estimations tournent volontairement dans la
fourchette basse de ce qu'affichent les machines de salle, qui ne déduisent pas
le métabolisme de base.

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

### 2. Déployer sur Vercel

1. Pousse ce dépôt sur GitHub.
2. Sur **vercel.com** : *Add New → Project*, choisis le dépôt, *Deploy*.
3. Dans *Settings → Environment Variables*, ajoute :

   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | la chaîne de connexion Neon |
   | `COACH_PIN` | ton code (4 à 8 chiffres) |
   | `ATHLETE_PIN` | son code |
   | `AUTH_SECRET` | une longue chaîne aléatoire |

   Pour générer le secret, sur un ordinateur :
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Sans terminal, n'importe quel générateur de mot de passe fait l'affaire :
   il faut simplement une chaîne longue (32 caractères minimum) et aléatoire.

4. Redéploie (*Deployments → ⋯ → Redeploy*) pour que les variables soient prises
   en compte.

### 3. Créer les tables — **sans terminal**

Connecte-toi à l'app avec ton code coach, puis va dans
**Réglages → Base de données → Installer la base**.

Les tables et les 119 exercices de départ sont créés en quelques secondes. Si tu
arrives sur l'app avant d'avoir fait ça, elle t'y emmène toute seule.

Le bouton est **sans risque et rejouable** : il crée ce qui manque, remet à jour
les exercices de la bibliothèque de base, et ne touche jamais aux exercices que
tu as créés ni aux séances déjà enregistrées. Reclique dessus après chaque mise à
jour du projet qui ajoute des exercices.

Depuis un ordinateur, l'équivalent en ligne de commande est :

```bash
npm install
cp .env.example .env.local     # colle ton DATABASE_URL dedans
npm run db:setup
```

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
cp .env.example .env.local    # renseigne DATABASE_URL
npm run db:setup              # ou le bouton dans Réglages → Base de données
npm run dev                   # http://localhost:3000
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
    db/schema.ts            tables, vues par Drizzle
    db/schema-sql.ts        le SQL de création, idempotent (source unique)
    db/index.ts             connexion, Neon en HTTP ou Postgres en TCP
    actions/                Server Actions (séances, séries, exercices, base)
    effort.ts               durée estimée et calories (partagé client/serveur)
    queries.ts              lectures (séances, stats, progression)
    exercise-library.ts     les 119 exercices de départ
```

### Les tables

| Table | Rôle |
|---|---|
| `exercises` | Bibliothèque : description, déroulé pas-à-pas, points de vigilance, coût en MET. `is_custom` distingue tes créations du fonds de départ |
| `workouts` | Une séance : date, statut (`draft` / `published` / `done`), consignes, ressenti |
| `workout_items` | Un exercice dans une séance : bloc, séries, objectifs, repos, note |
| `set_logs` | Une série réalisée : reps, poids, temps, distance. C'est la source de la progression |
| `settings` | Prénom de l'athlète, objectif hebdo, message d'accueil, profil physique |

---

## ✏️ Personnaliser

- **Ajouter des exercices** — depuis l'app (*Bibliothèque → Créer un exercice*,
  avec un champ « Comment on fait » où tu écris une étape par ligne),
  ou en modifiant `src/lib/exercise-library.ts` puis en cliquant
  *Réglages → Base de données → Mettre à jour la bibliothèque*
  (ou `npm run db:seed` en ligne de commande).
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
