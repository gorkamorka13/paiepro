---
trigger: always_on
---

# Payslip Analyzer AI - Directives Modèle (gemini.md)

Ce document établit les règles critiques et les protocoles de sécurité pour l'interaction entre l'utilisateur et l'assistant IA au sein de l'environnement Payslip Analyzer.

## 🤖 Contraintes du Modèle IA

> [!IMPORTANT]
> **Le modèle Gemini 2.5 (gemini-2.5-flash) est l'unique standard opérationnel pour ce projet.**
> - Les modèles Gemini 1.5 (Pro/Flash) et Gemini 2.0 (Flash) sont strictement obsolètes ou restreints.
> - Toute extraction de données ou logique de traitement doit être conçue exclusivement pour la version 2.5.

## 💻 Environnement et Commandes Windows

Le système d'exploitation hôte est **Windows**. Par conséquent, les protocoles de ligne de commande doivent s'adapter aux limitations du shell (PowerShell/CMD) :

- **Éviter les opérateurs d'enchaînement** : N'utilisez jamais d'opérateurs tels que `&&` ou `||` pour chaîner des commandes. 
- **Commandes Atomiques** : Exécutez chaque commande de manière isolée pour garantir la compatibilité et la capture correcte des retours.

## 🛡️ Sécurité et Confidentialité

La protection des informations sensibles est une priorité absolue. 

- **Fichiers `.env`** : Ne jamais afficher, journaliser ou transmettre le contenu intégral des fichiers d'environnement.
- **Clés API et Secrets** : Toute manipulation de clés API (Gemini, Vercel Blob) ou de secrets d'authentification (`AUTH_SECRET`) doit être traitée avec une discrétion maximale.
- **Données Sensibles dans le Code** : Ne jamais coder en dur des identifiants ou des informations personnelles. Utilisez systématiquement les variables d'environnement validées par les schémas Zod.
- **Fuites Accidentelles** : Soyez vigilant lors de la création de rapports de débogage ou de logs pour ne pas inclure de fragments de données sensibles.

## 🎨 Design & Expérience Utilisateur (UX)

- **Esthétique "Premium"** : Toute nouvelle interface doit respecter les principes de design moderne : glassmorphisme, ombres subtiles, et micro-animations (transitions de 200-300ms).
- **Feedback Visuel** : Utiliser exclusivement `lucide-react`. Chaque action critique doit être accompagnée d'un toast (`sonner`).

## 🏗️ Standards de Développement

- **Validation Zod** : Aucune donnée provenant de l'utilisateur ou de l'IA ne doit être traitée sans validation par les schémas définis dans `lib/validations.ts`.
- **Mutations** : Utiliser exclusivement les *Server Actions* pour les mutations de données (organisées dans `app/actions/`).
- **Typage** : Bannir l'utilisation de `any`. Privilégier des interfaces strictes dans le dossier `types/`.

## 🌍 Langue et Cohérence

- **Interface & Erreurs** : L'UI et les messages d'erreurs destinés à l'utilisateur doivent être en **Français**.
- **Code & Logic** : Les noms de variables, fonctions, commentaires techniques et prompts IA internes doivent être en **Anglais**.

## 🧪 Qualité et Audit

- **Audit des Extractions** : Utiliser `ExtractionLogger` pour chaque appel IA afin de suivre la latence, les coûts et la précision.
- **Base de Données** : En phase de développement, utiliser `npx prisma db push` pour les changements rapides, mais documenter les migrations critiques pour la production.
- **Tests** : Encourager l'ajout de tests unitaires (Vitest) pour la logique métier et de tests E2E (Playwright) pour les flux critiques.

---
*Dernière mise à jour : 2026-02-04*
