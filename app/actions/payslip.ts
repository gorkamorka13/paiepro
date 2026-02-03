'use server';

import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import type { Payslip, UpdatePayslipData } from '@/types/payslip';
import { analyzeDocumentHybrid, extractDataTraditional } from '@/lib/extraction-service';
import { analyzeDocument } from '@/lib/ai-service';
import { fileUploadSchema, createPayslipSchema, updatePayslipSchema, type AIExtractedData } from '@/lib/validations';

import type { ActionResult } from '@/types/payslip';

export async function processPayslipAction(
    formData: FormData
): Promise<ActionResult<Payslip>> {
    let blobUrl: string | null = null;
    let successfullySaved = false;

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

        // 1b. [STRICT] Vérification Pré-Upload (Doublon de nom de fichier)
        const existingFile = await prisma.payslip.findFirst({
            where: { fileName: file.name }
        });

        if (existingFile) {
            console.warn(`🛑 Rejet pré-upload : Le fichier "${file.name}" existe déjà.`);
            return {
                success: false,
                error: `Le fichier "${file.name}" a déjà été importé.`,
            };
        }

        // 2. Upload vers Vercel Blob
        const blob = await put(file.name, file, {
            access: 'public',
            addRandomSuffix: true,
        });
        blobUrl = blob.url;

        // 3. Analyse IA (Automatique)
        let extractedData;
        try {
            // Utilise l'analyse intelligente (hybride : Classique -> IA si besoin)
            const fileMetadata = {
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
            };
            extractedData = await analyzeDocumentHybrid(blobUrl, fileMetadata);
        } catch (aiError) {
            console.warn(`⚠️ Analyse IA échouée pour ${file.name}:`, aiError);

            // Sauvegarder quand même avec statut "failed"
            const payslip = await prisma.payslip.create({
                data: {
                    fileName: file.name,
                    fileUrl: blobUrl,
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

            successfullySaved = true;
            revalidatePath('/dashboard');

            return {
                success: true,
                data: (payslip as unknown) as Payslip,
            };
        }

        // 4. Validation des données extraites
        let payslipData;
        try {
            payslipData = createPayslipSchema.parse({
                fileName: file.name,
                fileUrl: blobUrl,
                fileSize: file.size,
                mimeType: file.type,
                ...extractedData,
                extractedJson: extractedData,
            });
        } catch (validationErr) {
            console.error(`❌ Validation des données extraites échouée pour ${file.name}:`, validationErr);
            throw new Error(`Données extraites invalides : ${validationErr instanceof Error ? validationErr.message : 'Détails inconnus'}`);
        }

        // 4b. Détection des doublons (Post-Analyse)
        // Vérifie si un bulletin existe déjà pour le même employé, le même employeur et la même période.
        // Cela empêche d'avoir deux fichiers différents (PDF scanné vs PDF natif) pour la même paie.
        const duplicate = await prisma.payslip.findFirst({
            where: {
                employeeName: payslipData.employeeName,
                employerName: payslipData.employerName,
                periodMonth: payslipData.periodMonth,
                periodYear: payslipData.periodYear,
                // On pourrait ajouter netToPay ici aussi, mais employé+employeur+date devrait suffire pour l'unicité
            },
        });

        if (duplicate) {
            console.warn(`⚠️ Doublon détecté après analyse pour ${file.name} (correspond à ID: ${duplicate.id}).`);

            // CRITIQUE: Suppression immédiate du blob car c'est un doublon confirmé
            if (blobUrl) {
                await del(blobUrl);
                blobUrl = null; // Pour éviter une double tentative de suppression dans le catch
            }

            return {
                success: false,
                error: `Ce bulletin existe déjà pour ${payslipData.employeeName} (${payslipData.periodMonth}/${payslipData.periodYear}).`,
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

        successfullySaved = true;
        revalidatePath('/dashboard');

        return {
            success: true,
            data: (payslip as unknown) as Payslip,
        };

    } catch (error) {
        console.error('❌ Erreur dans processPayslipAction:', error);

        // Si on a un blob mais qu'on n'a pas réussi à sauvegarder en base, on nettoie
        if (blobUrl && !successfullySaved) {
            console.log(`🧹 Nettoyage du blob orphelin : ${blobUrl}`);
            try {
                await del(blobUrl);
            } catch (delError) {
                console.error('❌ Échec du nettoyage du blob orphelin:', delError);
            }
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Erreur serveur inconnue',
        };
    }
}

// Action pour récupérer tous les bulletins
export async function getPayslipsAction(): Promise<ActionResult<Payslip[]>> {
    try {
        const payslips = await prisma.payslip.findMany({
            orderBy: [
                { periodYear: 'desc' },
                { periodMonth: 'desc' },
                { createdAt: 'desc' },
            ],
        });

        return { success: true, data: (payslips as unknown) as Payslip[] };
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
        // 1. Trouver le bulletin pour avoir l'URL du fichier
        const payslip = await prisma.payslip.findUnique({
            where: { id },
            select: { fileUrl: true, fileName: true }
        });

        if (!payslip) {
            return { success: false, error: 'Bulletin non trouvé' };
        }

        // 2. Supprimer du storage si l'URL existe
        if (payslip.fileUrl) {
            try {
                await del(payslip.fileUrl);
            } catch (blobError) {
                console.error(`⚠️ Erreur suppression blob (${payslip.fileName}):`, blobError);
                // On continue la suppression en DB même si le blob échoue (pour ne pas bloquer l'utilisateur)
            }
        }

        // 3. Supprimer de la DB
        await prisma.payslip.delete({
            where: { id },
        });

        revalidatePath('/dashboard');

        return { success: true, data: { id, fileName: payslip.fileName } };
    } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Impossible de supprimer le bulletin'
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
        const [payslipStats, logStats] = await Promise.all([
            prisma.payslip.aggregate({
                _sum: {
                    fileSize: true,
                    inputTokens: true,
                    outputTokens: true,
                },
                _count: {
                    id: true,
                }
            }),
            prisma.extractionLog.aggregate({
                _sum: {
                    inputTokens: true,
                    outputTokens: true,
                }
            })
        ]);

        const totalStorageBytes = payslipStats._sum?.fileSize || 0;

        // Les logs d'extraction sont la source de vérité pour le coût total IA
        // car ils incluent les succès ET les échecs (contrairement à la table Payslip)
        const totalTokens =
            (logStats._sum?.inputTokens || 0) +
            (logStats._sum?.outputTokens || 0);

        const limitBytes = 250 * 1024 * 1024; // 250MB
        const fileCount = payslipStats._count?.id || 0;

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

// Action pour supprimer plusieurs bulletins
export async function deleteMultiplePayslipsAction(ids: string[]): Promise<ActionResult<{ count: number }>> {
    try {
        // 1. Trouver les bulletins pour avoir les URLs des fichiers
        const payslips = await prisma.payslip.findMany({
            where: { id: { in: ids } },
            select: { fileUrl: true, fileName: true }
        });

        if (payslips.length === 0) {
            return { success: false, error: 'Aucun bulletin trouvé' };
        }

        // 2. Supprimer du storage les fichiers dont l'URL existe
        const urlsToDelete = payslips
            .map(p => p.fileUrl)
            .filter((url): url is string => !!url);

        if (urlsToDelete.length > 0) {
            try {
                // del() accepte un tableau d'URLs
                await del(urlsToDelete);
            } catch (blobError) {
                console.error(`⚠️ Erreur suppression groupée blobs:`, blobError);
            }
        }

        // 3. Supprimer de la DB
        await prisma.payslip.deleteMany({
            where: { id: { in: ids } },
        });

        revalidatePath('/dashboard');

        return { success: true, data: { count: ids.length } };
    } catch (error) {
        console.error('❌ Erreur lors de la suppression groupée:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Impossible de supprimer les bulletins'
        };
    }
}

// Action pour relancer l'analyse d'un bulletin existant
export async function reanalyzePayslipAction(
    id: string,
    method: 'ai' | 'traditional'
): Promise<ActionResult<Payslip>> {
    try {
        // 1. Récupérer le bulletin existant
        const existingPayslip = await prisma.payslip.findUnique({
            where: { id }
        });

        if (!existingPayslip) {
            return { success: false, error: 'Bulletin non trouvé' };
        }

        const fileMetadata = {
            fileName: existingPayslip.fileName,
            fileSize: existingPayslip.fileSize,
            mimeType: existingPayslip.mimeType,
        };

        const context = { payslipId: id };

        // 2. Relancer l'analyse selon la méthode choisie
        interface FullExtractionResult extends AIExtractedData {
            aiModel?: string | null;
            inputTokens?: number | null;
            outputTokens?: number | null;
        }

        let extractedData: FullExtractionResult;
        if (method === 'ai') {
            extractedData = await analyzeDocument(existingPayslip.fileUrl, fileMetadata, context);
        } else {
            const result = await extractDataTraditional(existingPayslip.fileUrl, fileMetadata, context);
            if (!result) {
                const errorMessage = 'L\'extraction traditionnelle a échoué (données insuffisantes). Consultez les logs pour plus de détails.';
                await prisma.payslip.update({
                    where: { id },
                    data: {
                        processingStatus: 'failed',
                        errorMessage,
                    }
                });
                revalidatePath('/dashboard');
                return { success: false, error: errorMessage };
            }
            extractedData = result;
        }

        // 3. Valider et mettre à jour
        const payslipData = updatePayslipSchema.parse({
            ...extractedData,
            extractedJson: extractedData,
        });

        const updatedPayslip = await prisma.payslip.update({
            where: { id },
            data: {
                ...payslipData,
                processingStatus: 'completed',
                errorMessage: null,
                aiModel: extractedData.aiModel || null,
                inputTokens: extractedData.inputTokens || null,
                outputTokens: extractedData.outputTokens || null,
            },
        });

        revalidatePath('/dashboard');
        revalidatePath('/admin/extraction-logs');

        return {
            success: true,
            data: (updatedPayslip as unknown) as Payslip,
        };

    } catch (error) {
        console.error('❌ Erreur dans reanalyzePayslipAction:', error);

        // Mettre à jour le statut en cas d'erreur
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la ré-analyse';
        await prisma.payslip.update({
            where: { id },
            data: {
                processingStatus: 'failed',
                errorMessage,
            }
        });
        revalidatePath('/dashboard');

        return {
            success: false,
            error: errorMessage,
        };
    }
}
