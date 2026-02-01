# Architecture du Projet : Payslip Analyzer AI
## Prompt Engineering pour Claude Code - Version Autonome

**Objectif :** Créer une application Next.js 15 complète pour uploader, analyser via IA (Gemini 2.5 Flash), stocker et visualiser des bulletins de paie avec tests automatisés et déploiement prêt.

---

## 1. Stack Technique & Versions Exactes

```json
{
  "framework": "Next.js 15.1.11",
  "runtime": "Node.js 19",
  "packageManager": "pnpm 9.0.0",
  "database": "PostgreSQL 15",
  "orm": "Prisma 6.0.0",
  "storage": "Vercel Blob Storage",
  "ai": "Google Generative AI (@google/generative-ai ^0.21.0)",
  "aiModel": "gemini-2.5-flash",
  "validation": "Zod ^3.23.0",
  "ui": {
    "styling": "Tailwind CSS 3.4",
    "icons": "lucide-react ^0.451.0",
    "toasts": "sonner ^1.7.0",
    "charts": "recharts ^2.12.0"
  },
  "export": "jspdf ^2.5.2 + jspdf-autotable ^3.8.3",
  "testing": {
    "unit": "Vitest ^2.0.0",
    "e2e": "Playwright ^1.48.0",
    "integration": "@testing-library/react ^16.0.0"
  },
  "linting": {
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "typescript": "^5.6.0"
  }
}
```

---

## 2. Configuration Environnement

### Variables d'Environnement Requises (`.env.example`)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/payslip_analyzer?schema=public"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXX"

# Google Generative AI
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Optional: Rate Limiting
RATE_LIMIT_MAX_REQUESTS="10"
RATE_LIMIT_WINDOW_MS="60000"
```

### Fichier `.env.local` (à créer)
Claude Code doit demander à l'utilisateur de créer ce fichier avec les vraies clés API.

---

## 3. Schéma Prisma Complet (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Payslip {
  id            String   @id @default(cuid())
  fileName      String
  fileUrl       String
  fileSize      Int      // en bytes
  mimeType      String
  
  // Données extraites
  employeeName  String?
  employerName  String?
  periodMonth   Int?     @db.SmallInt // 1-12
  periodYear    Int?     @db.SmallInt // ex: 2024
  
  // Montants
  netToPay      Float    @db.DoublePrecision
  grossSalary   Float    @db.DoublePrecision
  taxAmount     Float    @db.DoublePrecision
  hoursWorked   Float    @db.DoublePrecision
  
  // JSON brut de l'extraction
  extractedJson Json
  
  // Métadonnées
  processingStatus String  @default("completed") // completed | failed | processing
  errorMessage     String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([periodYear, periodMonth])
  @@index([createdAt])
  @@index([processingStatus])
}
```

**Commande de migration :**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## 4. Schémas de Validation Zod (`lib/validations.ts`)

```typescript
import { z } from 'zod';

// Validation fichier upload
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'Le fichier doit faire moins de 10MB')
    .refine(
      (file) => ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type),
      'Format accepté : PDF, JPEG, PNG'
    ),
});

// Validation données extraites par IA
export const aiExtractedDataSchema = z.object({
  employeeName: z.string().min(1).max(255).optional(),
  employerName: z.string().min(1).max(255).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  periodYear: z.number().int().min(2000).max(2100).optional(),
  netToPay: z.number().nonnegative(),
  grossSalary: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  hoursWorked: z.number().nonnegative().max(744), // max heures/mois
});

export type AIExtractedData = z.infer<typeof aiExtractedDataSchema>;

// Validation création Payslip
export const createPayslipSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
  ...aiExtractedDataSchema.shape,
  extractedJson: z.record(z.any()),
});
```

---

## 5. Service IA avec Gestion Erreurs Robuste (`lib/ai-service.ts`)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiExtractedDataSchema, type AIExtractedData } from './validations';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

const SYSTEM_PROMPT = `Tu es un expert en extraction de données de bulletins de paie français.
Analyse le document fourni et extrais UNIQUEMENT les informations suivantes au format JSON strict :

{
  "employeeName": "Nom complet de l'employé",
  "employerName": "Nom de l'entreprise employeur",
  "periodMonth": 1-12 (numéro du mois),
  "periodYear": 2024 (année en YYYY),
  "netToPay": 2345.67 (net à payer en euros),
  "grossSalary": 3200.00 (salaire brut en euros),
  "taxAmount": 450.33 (total des cotisations et impôts),
  "hoursWorked": 151.67 (heures travaillées)
}

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec du JSON valide, aucun texte explicatif
- Pas de markdown, pas de \`\`\`json
- Utilise null pour les valeurs manquantes
- Les montants doivent être des nombres décimaux, pas des strings
- Si une donnée est absente ou illisible, mets null`;

export async function analyzeDocument(fileUrl: string): Promise<AIExtractedData> {
  try {
    // 1. Télécharger le fichier
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Échec du téléchargement du fichier: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'application/pdf';

    // 2. Préparer le contenu pour Gemini
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1, // Faible pour cohérence
        maxOutputTokens: 1024,
      },
    });

    // 3. Générer l'extraction
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const text = result.response.text();
    
    // 4. Nettoyer et parser le JSON
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON invalide reçu de l\'IA:', cleanedText);
      throw new Error('L\'IA a retourné un format JSON invalide');
    }

    // 5. Valider avec Zod
    const validated = aiExtractedDataSchema.parse(parsedData);

    return validated;

  } catch (error) {
    if (error instanceof Error) {
      console.error('Erreur lors de l\'analyse IA:', error.message);
      throw new Error(`Échec de l'analyse IA: ${error.message}`);
    }
    throw new Error('Erreur inconnue lors de l\'analyse IA');
  }
}

// Fonction utilitaire pour retry avec backoff exponentiel
export async function analyzeDocumentWithRetry(
  fileUrl: string,
  maxRetries = 3
): Promise<AIExtractedData> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeDocument(fileUrl);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Tentative ${attempt}/${maxRetries} échouée:`, lastError.message);
      
      if (attempt < maxRetries) {
        // Backoff exponentiel: 2^attempt secondes
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError || new Error('Échec après plusieurs tentatives');
}
```

---

## 6. Server Actions avec Gestion Complète (`app/actions/payslip.ts`)

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { analyzeDocumentWithRetry } from '@/lib/ai-service';
import { fileUploadSchema, createPayslipSchema } from '@/lib/validations';

type ActionResult = 
  | { success: true; data: { id: string; fileName: string } }
  | { success: false; error: string };

export async function processPayslipAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. Validation du fichier
    const file = formData.get('file') as File;
    
    const validationResult = fileUploadSchema.safeParse({ file });
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0].message,
      };
    }

    // 2. Upload vers Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    console.log(`✅ Fichier uploadé: ${blob.url}`);

    // 3. Analyse IA avec retry
    let extractedData;
    try {
      extractedData = await analyzeDocumentWithRetry(blob.url);
    } catch (aiError) {
      // Sauvegarder quand même avec statut "failed"
      await prisma.payslip.create({
        data: {
          fileName: file.name,
          fileUrl: blob.url,
          fileSize: file.size,
          mimeType: file.type,
          processingStatus: 'failed',
          errorMessage: aiError instanceof Error ? aiError.message : 'Erreur inconnue',
          netToPay: 0,
          grossSalary: 0,
          taxAmount: 0,
          hoursWorked: 0,
          extractedJson: {},
        },
      });

      return {
        success: false,
        error: `Analyse IA échouée: ${aiError instanceof Error ? aiError.message : 'Erreur inconnue'}`,
      };
    }

    // 4. Validation des données extraites
    const payslipData = createPayslipSchema.parse({
      fileName: file.name,
      fileUrl: blob.url,
      fileSize: file.size,
      mimeType: file.type,
      ...extractedData,
      extractedJson: extractedData,
    });

    // 5. Sauvegarde en base de données
    const payslip = await prisma.payslip.create({
      data: {
        ...payslipData,
        processingStatus: 'completed',
      },
    });

    console.log(`✅ Bulletin enregistré: ${payslip.id}`);

    // 6. Revalidation du cache Next.js
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        id: payslip.id,
        fileName: payslip.fileName,
      },
    };

  } catch (error) {
    console.error('❌ Erreur dans processPayslipAction:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur inconnue',
    };
  }
}

// Action pour récupérer tous les bulletins
export async function getPayslipsAction() {
  try {
    const payslips = await prisma.payslip.findMany({
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
        { createdAt: 'desc' },
      ],
      where: {
        processingStatus: 'completed',
      },
    });

    return { success: true, data: payslips };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error);
    return { 
      success: false, 
      error: 'Impossible de récupérer les bulletins',
      data: [] 
    };
  }
}

// Action pour supprimer un bulletin
export async function deletePayslipAction(id: string): Promise<ActionResult> {
  try {
    await prisma.payslip.delete({
      where: { id },
    });

    revalidatePath('/dashboard');

    return { success: true, data: { id, fileName: '' } };
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    return { 
      success: false, 
      error: 'Impossible de supprimer le bulletin' 
    };
  }
}
```

---

## 7. Composants Frontend Modernes

### `components/UploadZone.tsx`

```typescript
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { processPayslipAction } from '@/app/actions/payslip';

type FileStatus = {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  id?: string;
};

export function UploadZone() {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Initialiser les fichiers avec statut "pending"
    const newFiles: FileStatus[] = acceptedFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(true);

    // Traiter chaque fichier séquentiellement
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileIndex = files.length + i;

      try {
        // Mise à jour: uploading
        setFiles(prev => {
          const updated = [...prev];
          updated[fileIndex] = { ...updated[fileIndex], status: 'uploading', progress: 50 };
          return updated;
        });

        const formData = new FormData();
        formData.append('file', file);

        const result = await processPayslipAction(formData);

        if (result.success) {
          setFiles(prev => {
            const updated = [...prev];
            updated[fileIndex] = {
              ...updated[fileIndex],
              status: 'success',
              progress: 100,
              id: result.data.id,
            };
            return updated;
          });

          toast.success(`✅ ${file.name} analysé avec succès`);
        } else {
          throw new Error(result.error);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        
        setFiles(prev => {
          const updated = [...prev];
          updated[fileIndex] = {
            ...updated[fileIndex],
            status: 'error',
            progress: 0,
            error: errorMessage,
          };
          return updated;
        });

        toast.error(`❌ ${file.name}: ${errorMessage}`);
      }
    }

    setIsProcessing(false);
  }, [files.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isProcessing,
  });

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Zone de Drop */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-700'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        
        {isDragActive ? (
          <p className="text-lg font-medium text-blue-600">
            Déposez vos fichiers ici...
          </p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Glissez-déposez vos bulletins de paie ici
            </p>
            <p className="text-sm text-gray-500">
              ou cliquez pour sélectionner (PDF, JPEG, PNG - max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Fichiers ({files.length})
            </h3>
            {files.some(f => f.status === 'success') && (
              <button
                onClick={clearCompleted}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Effacer les réussis
              </button>
            )}
          </div>

          <div className="space-y-2">
            {files.map((fileStatus, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <FileText className="w-8 h-8 text-gray-400 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{fileStatus.file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  
                  {fileStatus.status === 'uploading' && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${fileStatus.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {fileStatus.error && (
                    <p className="text-sm text-red-600 mt-1">{fileStatus.error}</p>
                  )}
                </div>

                {/* Icône de statut */}
                {fileStatus.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                {fileStatus.status === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {fileStatus.status === 'error' && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### `components/Dashboard.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getPayslipsAction, deletePayslipAction } from '@/app/actions/payslip';
import { Trash2, ExternalLink, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import type { Payslip } from '@prisma/client';

export function Dashboard() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayslips();
  }, []);

  const loadPayslips = async () => {
    setIsLoading(true);
    const result = await getPayslipsAction();
    if (result.success) {
      setPayslips(result.data);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce bulletin ?')) return;

    const result = await deletePayslipAction(id);
    if (result.success) {
      toast.success('Bulletin supprimé');
      loadPayslips();
    } else {
      toast.error(result.error);
    }
  };

  // Préparer les données pour le graphique
  const chartData = payslips
    .filter(p => p.periodYear && p.periodMonth)
    .map(p => ({
      date: `${p.periodMonth}/${p.periodYear}`,
      netToPay: p.netToPay,
      grossSalary: p.grossSalary,
    }))
    .reverse(); // Chronologique

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-1">Total Bulletins</p>
          <p className="text-3xl font-bold">{payslips.length}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-1">Net Moyen</p>
          <p className="text-3xl font-bold">
            {payslips.length > 0
              ? (payslips.reduce((sum, p) => sum + p.netToPay, 0) / payslips.length).toFixed(2)
              : '0.00'
            } €
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-1">Dernier Net à Payer</p>
          <p className="text-3xl font-bold">
            {payslips[0]?.netToPay.toFixed(2) || '0.00'} €
          </p>
        </div>
      </div>

      {/* Graphique d'évolution */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Évolution des Salaires</h2>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(2)} €`}
                labelStyle={{ color: '#000' }}
              />
              <Line 
                type="monotone" 
                dataKey="netToPay" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Net à payer"
              />
              <Line 
                type="monotone" 
                dataKey="grossSalary" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Salaire brut"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tableau des bulletins */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net à Payer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salaire Brut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heures
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {payslips.map((payslip) => (
                <tr key={payslip.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payslip.periodMonth && payslip.periodYear
                      ? `${String(payslip.periodMonth).padStart(2, '0')}/${payslip.periodYear}`
                      : 'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payslip.employeeName || 'Non renseigné'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    {payslip.netToPay.toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payslip.grossSalary.toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payslip.hoursWorked.toFixed(2)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={payslip.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(payslip.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payslips.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun bulletin de paie pour le moment
          </div>
        )}
      </div>
    </div>
  );
}
```

### `components/ExportButton.tsx`

```typescript
'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Payslip } from '@prisma/client';

interface ExportButtonProps {
  payslips: Payslip[];
}

export function ExportButton({ payslips }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (payslips.length === 0) {
      toast.error('Aucun bulletin à exporter');
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF();
      
      // Titre
      doc.setFontSize(18);
      doc.text('Récapitulatif des Bulletins de Paie', 14, 20);
      
      doc.setFontSize(10);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);

      // Tableau
      autoTable(doc, {
        startY: 35,
        head: [['Période', 'Employé', 'Net à Payer', 'Salaire Brut', 'Cotisations', 'Heures']],
        body: payslips.map(p => [
          p.periodMonth && p.periodYear 
            ? `${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}` 
            : 'N/A',
          p.employeeName || 'N/A',
          `${p.netToPay.toFixed(2)} €`,
          `${p.grossSalary.toFixed(2)} €`,
          `${p.taxAmount.toFixed(2)} €`,
          `${p.hoursWorked.toFixed(2)}h`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
      });

      // Statistiques
      const totalNet = payslips.reduce((sum, p) => sum + p.netToPay, 0);
      const avgNet = totalNet / payslips.length;
      
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Total bulletins: ${payslips.length}`, 14, finalY);
      doc.text(`Net moyen: ${avgNet.toFixed(2)} €`, 14, finalY + 6);
      doc.text(`Net total: ${totalNet.toFixed(2)} €`, 14, finalY + 12);

      // Téléchargement
      doc.save(`bulletins-paie-${new Date().toISOString().slice(0, 10)}.pdf`);
      
      toast.success('PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast.error('Échec de l\'export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || payslips.length === 0}
      className="
        inline-flex items-center gap-2 px-4 py-2 
        bg-blue-600 text-white rounded-lg
        hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
      "
    >
      <FileDown className="w-4 h-4" />
      {isExporting ? 'Export en cours...' : 'Exporter en PDF'}
    </button>
  );
}
```

---

## 8. Structure de Tests Automatisés

### Tests Unitaires (`__tests__/unit/ai-service.test.ts`)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { analyzeDocument } from '@/lib/ai-service';

// Mock de l'API Google
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn(async () => ({
        response: {
          text: () => JSON.stringify({
            employeeName: 'Jean Dupont',
            employerName: 'Acme Corp',
            periodMonth: 12,
            periodYear: 2024,
            netToPay: 2500.50,
            grossSalary: 3200.00,
            taxAmount: 700.50,
            hoursWorked: 151.67,
          }),
        },
      })),
    })),
  })),
}));

describe('AI Service', () => {
  it('devrait extraire correctement les données d\'un bulletin', async () => {
    const mockUrl = 'https://example.com/payslip.pdf';
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: new Headers({ 'content-type': 'application/pdf' }),
      } as Response)
    );

    const result = await analyzeDocument(mockUrl);

    expect(result.employeeName).toBe('Jean Dupont');
    expect(result.netToPay).toBe(2500.50);
    expect(result.periodMonth).toBe(12);
  });

  it('devrait lancer une erreur si le fichier est inaccessible', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Not Found',
      } as Response)
    );

    await expect(analyzeDocument('https://invalid.com/file.pdf'))
      .rejects.toThrow('Échec du téléchargement du fichier');
  });
});
```

### Tests d'Intégration (`__tests__/integration/payslip-action.test.ts`)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { processPayslipAction } from '@/app/actions/payslip';
import { prisma } from '@/lib/prisma';

describe('Payslip Actions', () => {
  beforeAll(async () => {
    // Nettoyer la base de test
    await prisma.payslip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('devrait traiter un fichier valide de bout en bout', async () => {
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', file);

    // Note: nécessite des mocks pour Vercel Blob et Gemini
    const result = await processPayslipAction(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBeDefined();
    }
  });
});
```

### Tests E2E avec Playwright (`e2e/upload-workflow.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Upload Workflow', () => {
  test('devrait permettre d\'uploader et visualiser un bulletin', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Upload d'un fichier de test
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./e2e/fixtures/sample-payslip.pdf');

    // Attendre le traitement
    await expect(page.locator('text=analysé avec succès')).toBeVisible({ timeout: 30000 });

    // Naviguer vers le dashboard
    await page.click('text=Dashboard');

    // Vérifier l'affichage
    await expect(page.locator('table tbody tr')).toHaveCount(1);
  });
});
```

---

## 9. Configuration Package.json Complète

```json
{
  "name": "payslip-analyzer-ai",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "@prisma/client": "^6.0.0",
    "@vercel/blob": "^0.24.0",
    "date-fns": "^4.1.0",
    "jspdf": "^2.5.2",
    "jspdf-autotable": "^3.8.3",
    "lucide-react": "^0.451.0",
    "next": "15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-dropzone": "^14.3.5",
    "recharts": "^2.12.7",
    "sonner": "^1.7.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@testing-library/react": "^16.0.1",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.0.0",
    "eslint-config-next": "15.1.0",
    "postcss": "^8.4.49",
    "prettier": "^3.3.3",
    "prisma": "^6.0.0",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.6.3",
    "vitest": "^2.0.0"
  }
}
```

---

## 10. Workflow de Génération pour Claude Code

### Étape 1 : Initialisation du Projet

```bash
# Créer le projet Next.js
npx create-next-app@latest payslip-analyzer --typescript --tailwind --app --use-pnpm

cd payslip-analyzer

# Installer les dépendances
pnpm add @google/generative-ai @prisma/client @vercel/blob zod sonner lucide-react react-dropzone recharts jspdf jspdf-autotable date-fns

pnpm add -D prisma @types/node typescript @playwright/test vitest @vitejs/plugin-react @testing-library/react
```

### Étape 2 : Configuration Prisma

```bash
# Initialiser Prisma
npx prisma init

# Copier le schéma fourni dans prisma/schema.prisma

# Créer la migration
npx prisma migrate dev --name init
```

### Étape 3 : Création de l'Architecture

1. Créer `lib/prisma.ts` (client Prisma singleton)
2. Créer `lib/validations.ts` (schémas Zod)
3. Créer `lib/ai-service.ts` (service Gemini)
4. Créer `app/actions/payslip.ts` (Server Actions)

### Étape 4 : Composants UI

1. Créer `components/UploadZone.tsx`
2. Créer `components/Dashboard.tsx`
3. Créer `components/ExportButton.tsx`
4. Créer `app/page.tsx` (page d'accueil)
5. Créer `app/dashboard/page.tsx`

### Étape 5 : Tests

1. Créer `__tests__/unit/ai-service.test.ts`
2. Créer `__tests__/integration/payslip-action.test.ts`
3. Créer `e2e/upload-workflow.spec.ts`
4. Créer `vitest.config.ts` et `playwright.config.ts`

### Étape 6 : Validation et Déploiement

```bash
# Tests unitaires
pnpm test

# Tests E2E
pnpm test:e2e

# Build de production
pnpm build

# Linter
pnpm lint

# Type-check
pnpm type-check
```

---

## 11. Checklist de Validation Finale

Claude Code doit vérifier :

- [ ] ✅ Toutes les variables d'environnement sont configurées
- [ ] ✅ La base de données PostgreSQL est accessible
- [ ] ✅ Les migrations Prisma sont appliquées
- [ ] ✅ L'API Gemini répond correctement (test avec un fichier)
- [ ] ✅ Vercel Blob Storage fonctionne
- [ ] ✅ Les tests unitaires passent (>80% couverture)
- [ ] ✅ Les tests E2E passent
- [ ] ✅ Pas d'erreurs TypeScript
- [ ] ✅ Le build de production réussit
- [ ] ✅ L'UI est responsive
- [ ] ✅ Les toasts d'erreur s'affichent correctement
- [ ] ✅ Le graphique Recharts se génère
- [ ] ✅ L'export PDF fonctionne

---

## 12. Guide de Dépannage

### Problème : "Invalid API Key" (Gemini)
**Solution :** Vérifier que `GOOGLE_GENERATIVE_AI_API_KEY` est bien définie dans `.env.local`

### Problème : "Failed to connect to database"
**Solution :** Vérifier `DATABASE_URL` et que PostgreSQL est démarré

### Problème : "Blob upload failed"
**Solution :** Vérifier `BLOB_READ_WRITE_TOKEN` dans Vercel Dashboard

### Problème : JSON invalide de l'IA
**Solution :** Augmenter la température à 0.2 ou améliorer le prompt système

---

## 13. Améliorations Futures (Optionnelles)

- [ ] Authentification (NextAuth.js)
- [ ] Multi-utilisateurs avec isolation des données
- [ ] OCR avancé avec Tesseract.js pour PDF scannés
- [ ] Export Excel (XLSX)
- [ ] Notifications par email
- [ ] Détection de doublons
- [ ] Recherche full-text
- [ ] Pagination côté serveur
- [ ] Cache Redis pour les extractions
- [ ] Webhooks pour notifications externes

---

**Fin du Prompt Amélioré**
