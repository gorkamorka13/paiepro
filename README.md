# Payslip Analyzer AI

Une application Next.js 15 pour analyser automatiquement vos bulletins de paie avec l'intelligence artificielle (Gemini 2.5 Flash).

## 🚀 Fonctionnalités

- **Upload de fichiers** : Glissez-déposez vos bulletins (PDF, JPEG, PNG)
- **Analyse IA** : Extraction automatique des données (salaire, cotisations, heures, période)
- **Visualisation** : Graphiques d'évolution et statistiques
- **Export PDF** : Génération de rapports récapitulatifs
- **Mode sombre** : Interface adaptative

## 📋 Prérequis

- Node.js 20+
- npm ou pnpm
- PostgreSQL (local ou cloud)
- Clés API :
  - Google Generative AI API Key
  - Vercel Blob Storage Token (optionnel pour développement)
  - PostgreSQL Database URL

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

3. **Configurer les variables d'environnement**

Créer un fichier `.env.local` à la racine :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# Google Generative AI (Obligatoire)
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSy..."

# Vercel Blob Storage (Optionnel pour dev)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

Voir `.env.example` pour plus de détails.

4. **Initialiser la base de données**
```bash
npx prisma generate
npx prisma db push
```

5. **Lancer le serveur de développement**
```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## 📁 Structure du Projet

```
paiepro/
├── app/
│   ├── actions/
│   │   └── payslip.ts          # Server Actions
│   ├── dashboard/
│   │   └── page.tsx            # Page Dashboard
│   ├── layout.tsx              # Layout racine
│   ├── page.tsx                # Page d'accueil
│   └── globals.css             # Styles globaux
├── components/
│   ├── Dashboard.tsx           # Composant Dashboard
│   ├── ExportButton.tsx        # Bouton export PDF
│   └── UploadZone.tsx          # Zone d'upload
├── lib/
│   ├── ai-service.ts           # Service Gemini AI
│   ├── prisma.ts               # Client Prisma
│   └── validations.ts          # Schémas Zod
├── prisma/
│   └── schema.prisma           # Schéma de base de données
├── .env.example                # Template variables d'environnement
├── package.json
└── README.md
```

## 🔑 Obtenir les Clés API

### Google Generative AI (Obligatoire)

1. Aller sur [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Cliquer sur "Create API Key"
3. Copier la clé (format: `AIzaSy...`)

### Vercel Blob Storage (Optionnel)

1. Aller sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Storage → Create Database → Blob
3. Copier le token `BLOB_READ_WRITE_TOKEN`

### PostgreSQL Database

**Option 1 : Vercel Postgres (Recommandé)**
- Vercel Dashboard → Storage → Postgres
- Gratuit : 256MB

**Option 2 : Supabase**
- [supabase.com](https://supabase.com/)
- Gratuit avec 500MB

**Option 3 : Local**
```bash
# Installer PostgreSQL
brew install postgresql@15  # macOS
sudo apt install postgresql  # Ubuntu

# Créer la base
createdb payslip_analyzer

# URL locale
DATABASE_URL="postgresql://localhost:5432/payslip_analyzer"
```

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests E2E
npm run test:e2e

# Couverture
npm run test:coverage
```

## 🏗️ Build Production

```bash
npm run build
npm start
```

## 📊 Scripts Disponibles

- `npm run dev` - Serveur de développement
- `npm run build` - Build de production
- `npm start` - Serveur de production
- `npm run lint` - Linter ESLint
- `npm run type-check` - Vérification TypeScript
- `npm run db:generate` - Générer le client Prisma
- `npm run db:push` - Pousser le schéma vers la DB
- `npm run db:migrate` - Créer une migration
- `npm run db:studio` - Ouvrir Prisma Studio

## 🛠️ Technologies

- **Framework** : Next.js 15.1.0
- **Runtime** : React 19
- **Database** : PostgreSQL + Prisma 6
- **AI** : Google Generative AI (Gemini 2.5 Flash)
- **Storage** : Vercel Blob
- **Validation** : Zod
- **UI** : Tailwind CSS, Lucide Icons, Sonner
- **Charts** : Recharts
- **Export** : jsPDF

## 📝 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📧 Support

Pour toute question, consultez la documentation dans `setup-configuration.md` ou ouvrez une issue.
