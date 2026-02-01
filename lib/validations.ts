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
