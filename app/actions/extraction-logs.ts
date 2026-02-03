'use server';

import { ExtractionLogger } from '@/lib/extraction-logger';
import { revalidatePath } from 'next/cache';

export async function getExtractionLogsAction(params?: {
    skip?: number;
    take?: number;
    success?: boolean;
    errorType?: string;
    extractionMethod?: string;
    since?: Date;
}) {
    try {
        return await ExtractionLogger.getAllLogs(params);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des logs:', error);
        throw new Error('Impossible de charger les logs d\'extraction');
    }
}

export async function getErrorStatsAction(since?: Date) {
    try {
        return await ExtractionLogger.getErrorStats(since);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des stats:', error);
        throw new Error('Impossible de charger les statistiques d\'erreur');
    }
}

export async function getLogDetailsAction(id: string) {
    try {
        return await ExtractionLogger.getLogById(id);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération du détail du log:', error);
        throw new Error('Impossible de charger les détails du log');
    }
}

export async function revalidateLogsAction() {
    revalidatePath('/admin/extraction-logs');
}
