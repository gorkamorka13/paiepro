'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import type { Payslip } from '@prisma/client';
import { analyzeDocumentHybrid } from '@/lib/extraction-service';
import { fileUploadSchema, createPayslipSchema, updatePayslipSchema, type UpdatePayslipData } from '@/lib/validations';

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

        console.log(`✅ Fichier uploadé: ${blob.url} (Mode Automatique)`);

        // 3. Analyse IA (Automatique)
        let extractedData;
        try {
            // Utilise l'analyse intelligente (hybride : Classique -> IA si besoin)
            extractedData = await analyzeDocumentHybrid(blob.url);
        } catch (aiError) {
            console.warn(`⚠️ Analyse IA échouée pour ${file.name}:`, aiError);

            // Sauvegarder quand même avec statut "failed"
            const payslip = await prisma.payslip.create({
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

            revalidatePath('/dashboard');

            return {
                success: true,
                data: payslip as any,
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
            data: payslip as any,
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

// Action pour mettre à jour un bulletin
export async function updatePayslipAction(
    id: string,
    data: UpdatePayslipData
): Promise<ActionResult> {
    try {
        const validatedData = updatePayslipSchema.parse(data);

        await prisma.payslip.update({
            where: { id },
            data: validatedData,
        });

        revalidatePath('/dashboard');

        return { success: true, data: { id, fileName: '' } };
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
        };
    }
}
