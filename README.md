# Payslip Analyzer AI

Une application Next.js 15 full-stack pour automatiser l'analyse, le suivi et la visualisation des bulletins de paie français (modèle 2024 inclus) grâce à l'intelligence artificielle.

## 🚀 Fonctionnalités

- **Extraction Hybride OCR/IA** :
  - **Traditionnelle** : Extraction ultra-rapide par Regex pour les formats standards (Gratuit).
  - **IA (Gemini 2.5 Flash)** : Analyse intelligente et vision multimodale pour les scans et formats complexes.
- **Dashboard Avancé** :
  - **Visualisation Dynamique** : Graphiques de répartition par client (Recharts) et évolution des revenus.
  - **Statistiques Clés** : Calcul automatique du brut, net, impôts, et taux horaire moyen.
  - **Filtrage & Recherche** : Filtres par année, mois et recherche textuelle multi-champs.
- **Gestion des Documents** :
  - **Bulk Actions** : Suppression et sélection multiple.
  - **Export Multi-format** : Export des données en PDF (jsPDF) et Excel (XLSX).
  - **Stockage Cloud** : Intégration Vercel Blob pour une gestion sécurisée des fichiers.
- **Sécurité** :
  - **Authentification** : Système complet avec NextAuth v5 (Auth.js) et Prisma Adapter.
  - **Validation Stricte** : Schémas Zod pour garantir l'intégrité des données extraites.

## 📋 Prérequis

- **Node.js 20+**
- **PostgreSQL** (Neon, Supabase ou local)
- **Clés API** :
  - `GEMINI_API_KEY` (Google AI Studio)
  - `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
  - `DATABASE_URL` (PostgreSQL)
  - `AUTH_SECRET` (Généré via `npx auth secret`)

## 🔧 Installation

1. **Cloner le projet**
   ```bash
   git clone <votre-repo>
   cd paiepro
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration**
   - Copier `.env.example` vers `.env.local`
   - Remplir les variables d'environnement nécessaires.

4. **Base de données**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Lancer le serveur**
   ```bash
   npm run dev
   ```

## 📁 Structure du Projet

```
paiepro/
├── app/
│   ├── (auth)/             # Routes d'authentification
│   ├── actions/            # Server Actions (CRUD, Analyse, Upload)
│   ├── admin/              # Module d'administration
│   ├── dashboard/          # Vue principale utilisateur
│   └── globals.css         # Design System (Tailwind)
├── components/
│   ├── auth/               # Composants Login/Register
│   ├── Dashboard.tsx       # Cœur de l'application
│   ├── ClientChart.tsx     # Graphiques Recharts
│   └── UploadZone.tsx      # Gestion Dropzone & Compression
├── lib/
│   ├── ai-service.ts       # Service Gemini 2.5 Flash
│   ├── extraction-service.ts # OCR Traditionnel & Regex
│   ├── prisma.ts           # Client Database
│   └── validations.ts      # Schémas Zod (Single source of truth)
├── prisma/
│   └── schema.prisma       # Modèle de données (Payslip, User, ExtractionLog)
└── scripts/                # Utilitaires (Maintenance, Audit)
```

## 🛠️ Stack Technique

- **Framework** : Next.js 15.1 (App Router, Turbopack)
- **Database** : PostgreSQL & Prisma 6
- **IA/OCR** : Google Generative AI (Gemini 2.5 Flash), pdf-parse
- **Auth** : NextAuth v5 (Beta)
- **UI** : Tailwind CSS, Lucide Icons, Sonner (Toasts)
- **Charts** : Recharts
- **Export** : jsPDF-autotable, XLSX (SheetJS)

## 📊 Scripts Disponibles

- `npm run dev` - Développement avec Turbopack
- `npm run build` - Build de production (incrémente la version)
- `npm run db:studio` - Interface visuelle Prisma
- `npm run lint` - Analyse statique du code
- `npm run type-check` - Vérification Typescript

## 📝 Licence

Distributed under the MIT License. See `LICENSE` for more information.

## 🤝 Contribution

1. Fork the Project
2. Create your Feature Branch
3. Commit your Changes
4. Push to the Branch
5. Open a Pull Request
