# 🔑 Configuration Requise - Payslip Analyzer AI

## Informations à Renseigner AVANT de Commencer

### 1. API Keys et Tokens Obligatoires

#### A. Google Generative AI (Gemini)
- **Nom de la variable :** `GOOGLE_GENERATIVE_AI_API_KEY`
- **Où l'obtenir :** https://makersuite.google.com/app/apikey
- **Format :** `AIzaSy...` (39 caractères)
- **Coût :** Gratuit jusqu'à 60 requêtes/minute
- **Documentation :** https://ai.google.dev/gemini-api/docs/api-key

**Étapes :**
1. Aller sur https://makersuite.google.com/app/apikey
2. Cliquer sur "Create API Key"
3. Sélectionner un projet Google Cloud (ou en créer un)
4. Copier la clé générée

---

#### B. Vercel Blob Storage
- **Nom de la variable :** `BLOB_READ_WRITE_TOKEN`
- **Où l'obtenir :** Vercel Dashboard → Storage → Create Store
- **Format :** `vercel_blob_rw_...`
- **Coût :** 
  - Gratuit : 500MB stockage + 5GB transfert/mois
  - Pro : $0.15/GB stockage + $0.10/GB transfert
- **Documentation :** https://vercel.com/docs/storage/vercel-blob

**Étapes :**
1. Aller sur https://vercel.com/dashboard
2. Sélectionner votre projet (ou en créer un)
3. Onglet "Storage" → "Create Database" → "Blob"
4. Nommer le store (ex: `payslip-files`)
5. Copier le token `BLOB_READ_WRITE_TOKEN`

---

#### C. PostgreSQL Database
- **Nom de la variable :** `DATABASE_URL`
- **Format :** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`
- **Options d'hébergement :**

**Option 1 : Vercel Postgres (Recommandé)**
- Gratuit : 256MB stockage + 60h compute/mois
- https://vercel.com/docs/storage/vercel-postgres
- Étapes :
  1. Vercel Dashboard → Storage → Create Database → Postgres
  2. Copier `POSTGRES_URL` ou `POSTGRES_PRISMA_URL`

**Option 2 : Supabase (Gratuit)**
- https://supabase.com/
- Étapes :
  1. Créer un projet sur https://app.supabase.com/
  2. Settings → Database → Connection string → URI
  3. Exemple : `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

**Option 3 : Railway (Gratuit 500h/mois)**
- https://railway.app/
- Étapes :
  1. Créer un projet → Add Service → PostgreSQL
  2. Variables → `DATABASE_URL`

**Option 4 : Local (Développement)**
```bash
# Installer PostgreSQL
brew install postgresql@15  # macOS
sudo apt install postgresql  # Ubuntu

# Démarrer le service
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Ubuntu

# Créer la base
createdb payslip_analyzer

# URL locale
postgresql://localhost:5432/payslip_analyzer
```

---

### 2. Variables d'Environnement Optionnelles

#### A. Configuration Next.js
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # URL publique de l'app
NODE_ENV="development"  # development | production | test
```

#### B. Rate Limiting (Optionnel)
```env
RATE_LIMIT_MAX_REQUESTS="10"     # Max requêtes par fenêtre
RATE_LIMIT_WINDOW_MS="60000"     # Fenêtre en millisecondes (60s)
```

---

### 3. Fichier `.env.local` Complet (Template)

Créer ce fichier à la racine du projet :

```env
# ==========================================
# PAYSLIP ANALYZER AI - Configuration
# ==========================================

# Base de données PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# Vercel Blob Storage (Stockage fichiers)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXXXXXXXXXXXXXXXX"

# Google Generative AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Rate Limiting (Optionnel)
RATE_LIMIT_MAX_REQUESTS="10"
RATE_LIMIT_WINDOW_MS="60000"
```

---

### 4. Validation de la Configuration

Créer un script de test `scripts/validate-env.js` :

```javascript
#!/usr/bin/env node

const required = [
  'DATABASE_URL',
  'BLOB_READ_WRITE_TOKEN',
  'GOOGLE_GENERATIVE_AI_API_KEY'
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:');
  missing.forEach(key => console.error(`   - ${key}`));
  process.exit(1);
}

console.log('✅ Toutes les variables d\'environnement sont configurées');

// Test de connexion PostgreSQL
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDB() {
  try {
    await prisma.$connect();
    console.log('✅ Connexion PostgreSQL réussie');
  } catch (error) {
    console.error('❌ Échec de connexion PostgreSQL:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDB();
```

Exécuter avec :
```bash
node scripts/validate-env.js
```

---

### 5. Coûts Estimés

#### Configuration Gratuite (Recommandée pour Développement)
- **Google Gemini :** Gratuit (60 req/min)
- **Vercel Blob :** Gratuit (500MB + 5GB transfert)
- **Vercel Postgres :** Gratuit (256MB + 60h compute)
- **Total :** 0€/mois

#### Configuration Production (Moyenne)
- **Google Gemini :** ~$0.075 / 1000 requêtes (Flash model)
- **Vercel Blob :** ~$2-5/mois (pour 5GB stockage)
- **Vercel Postgres :** $0 si <60h compute, sinon ~$10/mois
- **Total estimé :** $12-20/mois pour ~1000 bulletins/mois

---

### 6. Checklist de Configuration

Avant de lancer Claude Code, vérifier :

- [ ] ✅ Compte Google Cloud créé
- [ ] ✅ API Gemini activée et clé générée
- [ ] ✅ Compte Vercel créé
- [ ] ✅ Vercel Blob Store créé et token copié
- [ ] ✅ Base de données PostgreSQL accessible
- [ ] ✅ Fichier `.env.local` créé avec toutes les variables
- [ ] ✅ PostgreSQL local démarré (si développement local)
- [ ] ✅ Node.js 20+ installé (`node --version`)
- [ ] ✅ pnpm installé (`pnpm --version`)

---

### 7. Commandes de Démarrage Rapide

```bash
# 1. Cloner/créer le projet
npx create-next-app@latest payslip-analyzer --typescript --tailwind --app --use-pnpm
cd payslip-analyzer

# 2. Installer les dépendances
pnpm add @google/generative-ai @prisma/client @vercel/blob zod sonner lucide-react react-dropzone recharts jspdf jspdf-autotable date-fns
pnpm add -D prisma @playwright/test vitest

# 3. Copier les fichiers de configuration
# (Copier .env.local, prisma/schema.prisma, etc.)

# 4. Initialiser Prisma
npx prisma generate
npx prisma db push  # Ou: npx prisma migrate dev

# 5. Valider la configuration
node scripts/validate-env.js

# 6. Lancer le serveur de dev
pnpm dev
```

---

### 8. Dépannage Courant

#### Erreur : "Invalid API key" (Gemini)
- Vérifier que la clé commence par `AIzaSy`
- Vérifier qu'elle est bien dans `.env.local`
- Redémarrer le serveur Next.js après modification

#### Erreur : "Can't reach database server" (Prisma)
- Vérifier que PostgreSQL est démarré
- Tester la connexion : `psql $DATABASE_URL`
- Vérifier les credentials (user/password)

#### Erreur : "Blob upload failed"
- Vérifier que le token Vercel Blob est correct
- Vérifier les quotas dans le Vercel Dashboard
- Vérifier que le fichier fait moins de 10MB

---

### 9. Ressources et Documentation

- **Next.js 15 :** https://nextjs.org/docs
- **Prisma :** https://www.prisma.io/docs
- **Google Gemini API :** https://ai.google.dev/gemini-api/docs
- **Vercel Blob :** https://vercel.com/docs/storage/vercel-blob
- **Vercel Postgres :** https://vercel.com/docs/storage/vercel-postgres
- **Zod :** https://zod.dev/
- **Recharts :** https://recharts.org/

---

### 10. Support et Contact

Si vous rencontrez des problèmes :
1. Vérifier la checklist ci-dessus
2. Consulter les logs : `pnpm dev` (console)
3. Vérifier `prisma/migrations` pour les erreurs de schéma
4. Tester avec `pnpm test` pour identifier les problèmes

**Note :** Claude Code peut effectuer toutes ces vérifications automatiquement si vous lui fournissez ce document lors de la génération du projet.
