# 🚀 Propositions d'Améliorations - PaiePro

Ce document détaille les pistes d'amélioration pour le code et les fonctionnalités de l'application afin de la rendre plus robuste, évolutive et performante.

## 🛠️ Améliorations de l'Architecture & Code

### 1. Typage Strict & Synchronisation Prisma
> [!IMPORTANT]
> Plusieurs erreurs de linting persistent concernant des champs comme `employeeAddress`, `siretNumber`, et `urssafNumber` qui ne sont pas reconnus par TypeScript bien qu'ils existent dans la base.
- **Action** : Forcer une synchronisation complète avec `npx prisma generate` et vérifier que les types générés dans `node_modules/.prisma/client` sont à jour.
- **Refactoring** : Centraliser les types de données extraites dans un fichier `types/payslip.ts` commun au frontend et au backend.

### 2. Gestion des États & Cache (SWR/React Query)
- **Problème** : Les données du Dashboard sont rechargées via `useEffect`.
- **Amélioration** : Utiliser `SWR` ou `TanStack Query` pour bénéficier du cache, du rechargement en arrière-plan et d'une gestion plus fine des états "loading" et "error".

### 3. API Route vs Server Actions
- **Simplification** : Actuellement, le traitement des fichiers utilise des Server Actions. Pour des uploads de gros fichiers ou des temps de réponse longs de l'IA, passer par une API Route avec support de streaming pourrait améliorer la réactivité de l'UI.

---

## ✨ Nouvelles Fonctionnalités

### 1. 📂 Gestion Multi-Dossiers / Clients
- Permettre de regrouper les bulletins par "Employeur" ou par "Projet" dans la sidebar.
- Ajouter un filtre global par entreprise sur le Dashboard.

### 2. 📈 Analyses Avancées & Comparaisons
- **Comparaison N-1** : Comparer le net à payer et le brut avec le même mois de l'année précédente.
- **Détection d'anomalies** : Alerte automatique si le salaire brut varie de plus de X% sans changement d'heures.

### 3. 📄 OCR Multi-Pages & OCR Local
- **Multi-pages** : Support complet des fichiers PDF de plusieurs pages (certains bulletins détaillés).
- **Fallback OCR** : Intégrer `Tesseract.js` pour une première lecture locale avant l'envoi à Gemini afin d'accélérer le processus si le texte est déjà lisible numériquement.

### 4. 🔐 Sécurité & Authentification
- Intégrer **NextAuth.js** pour sécuriser les données.
- Chiffrement des fichiers au repos sur Vercel Blob (si disponible via leur API).

---

## 🎨 Expérience Utilisateur (UX)

### 1. 🌙 Mode Sombre Natif & Thèmes
- Améliorer le contraste du mode sombre sur les graphiques Recharts.
- Ajouter des squelettes de chargement (Skeletons) plus élégants pendant l'analyse AI.

### 2. ⚡ Analyse en Lot (Bulk Processing)
- Permettre de glisser-déposer 10 fichiers d'un coup et voir une barre de progression globale avec une liste de traitement.

---

## 👨‍💻 Maintenance & CI/CD
- **Tests Unitaires** : Ajouter des tests pour les utilitaires de calcul (`netToPay / hoursWorked`).
- **Storybook** : Documenter les composants UI (StatCards, UploadZone) pour faciliter l'évolution du design.

---

> [!TIP]
> Priorité suggérée : **Typage Prisma (Stabilité)** -> **Amélioration UX/Analyse en Lot (Productivité)** -> **Multi-Clients (Scalabilité)**.
