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
    employeeName: z.string().min(1).max(255),
    employerName: z.string().min(1).max(255),
    periodMonth: z.number().int().min(1).max(12),
    periodYear: z.number().int().min(2000).max(2100),
    netToPay: z.number().nonnegative(), // Net à payer (après impôts)
    netBeforeTax: z.number().nonnegative(), // Net à payer avant impôts
    netTaxable: z.number().nonnegative(), // Net imposable
    grossSalary: z.number().nonnegative(), // Salaire brut
    taxAmount: z.number().nonnegative(), // Montant des impôts
    hoursWorked: z.number().nonnegative().max(744), // Heures travaillées
    hourlyNetTaxable: z.number().nonnegative(), // Salaire horaire net imposable
    employeeAddress: z.string().optional().nullable(),
    siretNumber: z.string().optional().nullable(),
    urssafNumber: z.string().optional().nullable(),
    cesuNumber: z.string().optional().nullable(),
    isCesu: z.boolean().optional().nullable(),
    aiModel: z.string().optional().nullable(),
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
    inputTokens: z.number().int().optional().nullable(),
    outputTokens: z.number().int().optional().nullable(),
});

// Validation mise à jour Payslip (coercion pour les formulaires)
export const updatePayslipSchema = z.object({
    employeeName: z.string().min(1).max(255).optional().nullable(),
    employerName: z.string().min(1).max(255).optional().nullable(),
    periodMonth: z.coerce.number().int().min(1).max(12).optional().nullable(),
    periodYear: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
    netToPay: z.coerce.number().nonnegative(),
    netBeforeTax: z.coerce.number().nonnegative().optional(),
    netTaxable: z.coerce.number().nonnegative().optional(),
    grossSalary: z.coerce.number().nonnegative(),
    taxAmount: z.coerce.number().nonnegative().optional(),
    hoursWorked: z.coerce.number().nonnegative().max(744).optional(),
    hourlyNetTaxable: z.coerce.number().nonnegative().optional(),
    employeeAddress: z.string().optional().nullable(),
    siretNumber: z.string().optional().nullable(),
    urssafNumber: z.string().optional().nullable(),
    cesuNumber: z.string().optional().nullable(),
    processingStatus: z.string().optional(),
});

export type UpdatePayslipData = z.infer<typeof updatePayslipSchema>;
