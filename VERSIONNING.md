# Stratégie de Versionning

Ce document décrit les mécanismes de versionning utilisés dans le projet **PaiePro**.

## 1. Versionning de l'Application

Le versionning de l'application est **automatisé** et suit le format [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH), bien que l'automatisation actuelle se concentre principalement sur le **PATCH**.

### Fonctionnement
- **Source de vérité** : La version est stockée dans le fichier `package.json` (champ `"version"`).
- **Automatisation** : Un script personnalisé (`scripts/update-version.js`) est exécuté automatiquement avant chaque build de production via la commande `npm run build`.
- **Logique** :
    1. Le script lit la version actuelle dans `package.json`.
    2. Il incrémente le dernier chiffre (PATCH).
    3. Il met à jour `package.json` avec la nouvelle version.
    4. La compilation (`next build`) se lance ensuite avec cette nouvelle version.

### Commandes
- **Build & Incrément** :
  ```bash
  npm run build
  ```
  *(Cette commande déclenche `node scripts/update-version.js` && `prisma generate` && `next build`)*

## 2. Versionning du Code Source

Le projet utilise **Git** pour le contrôle de version du code source.

- **Dossier** : `.git/` à la racine.
- **Ignorés** : Les fichiers compilés, dépendances (`node_modules`), et fichiers d'environnement (`.env`) sont exclus via `.gitignore`.

## 3. Versionning de la Base de Données (Prisma)

La gestion du schéma de base de données est assurée par **Prisma ORM**.

### État Actuel : Prototypage
Actuellement, le projet utilise principalement le mode "Push" pour appliquer les changements de schéma, ce qui est adapté aux phases de développement rapide mais ne conserve pas d'historique de migration.

- **Commande utilisée** :
  ```bash
  npm run db:push
  # ou
  npx prisma db push
  ```
  *Cette commande synchronise directement l'état du fichier `schema.prisma` avec la base de données.*

### Recommandation pour la Production
Pour passer à une gestion stable en production, il est conseillé de basculer vers les **Migrations Prisma** :

- **Créer une migration** (crée un fichier SQL dans `prisma/migrations/`) :
  ```bash
  npm run db:migrate --name nom_de_la_modification
  # ou
  npx prisma migrate dev --name init
  ```
- **Avantages** : Historique traçable, rollback possible, sécurité des données en production.

---

## 4. Bonnes Pratiques

1. **Commit** : Faire des commits atomiques et descriptifs.
2. **Environment** : Ne jamais versionner les fichiers `.env` contenant des secrets.
3. **Tags** : Utiliser les tags Git (`git tag v1.0.XX`) pour marquer les versions livrées en production correspondantes au `package.json`.
