import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export type ExtractionMethod = 'traditional' | 'ai' | 'hybrid';
export type ErrorType = 'api_error' | 'validation_error' | 'parsing_error' | 'network_error' | 'unknown_error';

interface LogExtractionParams {
    // Contexte du fichier
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;

    // Méthode d'extraction
    extractionMethod: ExtractionMethod;
    aiModel?: string;

    // Résultat
    success: boolean;
    error?: Error;
    errorType?: ErrorType;
    errorMessage?: string;

    // Données pour debug
    rawResponse?: string;
    extractedData?: unknown;
    validationErrors?: unknown;

    // Métriques
    processingTimeMs?: number;
    inputTokens?: number;
    outputTokens?: number;

    // Relation
    payslipId?: string;
}

export class ExtractionLogger {
    /**
     * Log une tentative d'extraction (succès ou échec)
     */
    static async log(params: LogExtractionParams): Promise<void> {
        try {
            await prisma.extractionLog.create({
                data: {
                    fileUrl: params.fileUrl,
                    fileName: params.fileName,
                    fileSize: params.fileSize,
                    mimeType: params.mimeType,
                    extractionMethod: params.extractionMethod,
                    aiModel: params.aiModel,
                    success: params.success,
                    errorType: params.errorType,
                    errorMessage: params.errorMessage || params.error?.message,
                    errorStack: params.error?.stack,
                    rawResponse: params.rawResponse,
                    extractedData: params.extractedData as Prisma.InputJsonValue,
                    validationErrors: params.validationErrors as Prisma.InputJsonValue,
                    processingTimeMs: params.processingTimeMs,
                    inputTokens: params.inputTokens,
                    outputTokens: params.outputTokens,
                    payslipId: params.payslipId,
                },
            });
        } catch (logError) {
            // Ne pas faire échouer l'opération principale si le logging échoue
            console.error('❌ Échec du logging d\'extraction:', logError);
        }
    }

    /**
     * Détermine le type d'erreur à partir d'une exception
     */
    static categorizeError(error: Error): ErrorType {
        const message = error.message.toLowerCase();

        if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
            return 'network_error';
        }

        if (message.includes('json') || message.includes('parse')) {
            return 'parsing_error';
        }

        if (message.includes('validation') || message.includes('zod')) {
            return 'validation_error';
        }

        if (message.includes('api') || message.includes('quota') || message.includes('rate limit')) {
            return 'api_error';
        }

        return 'unknown_error';
    }

    /**
     * Récupère les logs d'erreurs récents
     */
    static async getRecentErrors(limit = 50) {
        return await prisma.extractionLog.findMany({
            where: { success: false },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                payslip: {
                    select: {
                        id: true,
                        fileName: true,
                        processingStatus: true,
                    },
                },
            },
        });
    }

    /**
     * Statistiques d'erreurs par type
     */
    static async getErrorStats(since?: Date) {
        const where = {
            success: false,
            ...(since && { createdAt: { gte: since } }),
        };

        const [total, byType, byMethod] = await Promise.all([
            prisma.extractionLog.count({ where }),
            prisma.extractionLog.groupBy({
                by: ['errorType'],
                where,
                _count: true,
            }),
            prisma.extractionLog.groupBy({
                by: ['extractionMethod'],
                where,
                _count: true,
            }),
        ]);

        return { total, byType, byMethod };
    }

    /**
     * Récupère un log spécifique avec tous ses détails
     */
    static async getLogById(id: string) {
        return await prisma.extractionLog.findUnique({
            where: { id },
            include: {
                payslip: true,
            },
        });
    }

    /**
     * Récupère tous les logs (succès et échecs) avec pagination
     */
    /**
     * Supprime tous les logs d'extraction
     */
    static async deleteAllLogs() {
        return await prisma.extractionLog.deleteMany({});
    }

    static async getAllLogs(params?: {
        skip?: number;
        take?: number;
        success?: boolean;
        errorType?: string;
        extractionMethod?: string;
        since?: Date;
    }) {
        const where: Prisma.ExtractionLogWhereInput = {
            ...(params?.success !== undefined && { success: params.success }),
            ...(params?.errorType && { errorType: params.errorType }),
            ...(params?.extractionMethod && { extractionMethod: params.extractionMethod }),
            ...(params?.since && { createdAt: { gte: params.since } }),
        };

        const [logs, total] = await Promise.all([
            prisma.extractionLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: params?.skip || 0,
                take: params?.take || 50,
                include: {
                    payslip: {
                        select: {
                            id: true,
                            fileName: true,
                            processingStatus: true,
                        },
                    },
                },
            }),
            prisma.extractionLog.count({ where }),
        ]);

        return { logs, total };
    }
}
