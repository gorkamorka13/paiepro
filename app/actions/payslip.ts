'use server';

import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import type { Payslip, UpdatePayslipData } from '@/types/payslip';
import { analyzeDocumentHybrid } from '@/lib/extraction-service';
import { fileUploadSchema, createPayslipSchema, updatePayslipSchema } from '@/lib/validations';

import type { ActionResult } from '@/types/payslip';

export async function processPayslipAction(
    formData: FormData
): Promise<ActionResult<Payslip>> {
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
                    inputTokens: null,
                    outputTokens: null,
                },
            });

            revalidatePath('/dashboard');

            return {
                success: true,
                data: payslip as Payslip,
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

        // 4b. Détection des doublons
        const duplicate = await prisma.payslip.findFirst({
            where: {
                employeeName: payslipData.employeeName,
                employerName: payslipData.employerName,
                periodMonth: payslipData.periodMonth,
                periodYear: payslipData.periodYear,
                netToPay: payslipData.netToPay,
            },
        });

        if (duplicate) {
            console.warn(`⚠️ Doublon détecté pour ${file.name}. Suppression du blob.`);
            await del(blob.url);
            return {
                success: false,
                error: "Ce bulletin a déjà été importé (Doublon détecté).",
            };
        }

        const payslip = await prisma.payslip.create({
            data: {
                ...payslipData,
                processingStatus: 'completed',
                inputTokens: extractedData.inputTokens,
                outputTokens: extractedData.outputTokens,
            },
        });

        console.log(`✅ Bulletin enregistré: ${payslip.id}`);

        // 6. Revalidation du cache Next.js
        revalidatePath('/dashboard');

        return {
            success: true,
            data: payslip as Payslip,
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
export async function getPayslipsAction(): Promise<ActionResult<Payslip[]>> {
    try {
        console.log('🔍 getPayslipsAction: Starting to fetch payslips...');
        console.log('🔍 Database URL exists:', !!process.env.DATABASE_URL);
        console.log('🔍 Environment:', process.env.NODE_ENV);

        const payslips = await prisma.payslip.findMany({
            orderBy: [
                { periodYear: 'desc' },
                { periodMonth: 'desc' },
                { createdAt: 'desc' },
            ],
        });

        console.log(`✅ Successfully fetched ${payslips.length} payslips`);
        return { success: true, data: payslips as Payslip[] };
    } catch (error) {
        console.error('❌ Error in getPayslipsAction:', error);
        console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown');
        console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');

        return {
            success: false,
            error: `Impossible de récupérer les bulletins: ${error instanceof Error ? error.message : String(error)}`,
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

// Action pour récupérer les statistiques d'utilisation
export async function getUsageStatsAction() {
    try {
        const stats = await prisma.payslip.aggregate({
            _sum: {
                fileSize: true,
                inputTokens: true,
                outputTokens: true,
            },
            _count: {
                id: true,
            }
        });

        const totalStorageBytes = stats._sum?.fileSize || 0;
        const totalTokens = (stats._sum?.inputTokens || 0) + (stats._sum?.outputTokens || 0);
        const limitBytes = 250 * 1024 * 1024; // 250MB
        const fileCount = stats._count?.id || 0;

        return {
            success: true,
            data: {
                totalStorageBytes,
                totalTokens,
                limitBytes,
                fileCount
            }
        };
    } catch (error) {
        console.error('❌ Erreur lors du calcul des stats:', error);
        return { success: false, error: 'Impossible de calculer les statistiques' };
    }
}


