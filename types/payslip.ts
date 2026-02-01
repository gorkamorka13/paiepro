export interface Payslip {
    id: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    periodMonth: number | null;
    periodYear: number | null;
    employeeName: string | null;
    employeeAddress: string | null;
    employerName: string | null;
    siretNumber: string | null;
    urssafNumber: string | null;
    netToPay: number;
    netBeforeTax: number;
    netTaxable: number;
    grossSalary: number;
    taxAmount: number;
    hoursWorked: number;
    hourlyNetTaxable: number;
    extractedJson: any;
    processingStatus: string;
    errorMessage: string | null;
    aiModel: string | null;
    companyId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ExtractedPayslipData {
    employeeName: string | null;
    employeeAddress: string | null;
    employerName: string | null;
    siretNumber: string | null;
    urssafNumber: string | null;
    periodMonth: number | null;
    periodYear: number | null;
    grossSalary: number;
    netToPay: number;
    netTaxable: number;
    netBeforeTax: number;
    taxAmount: number;
    hoursWorked: number;
    hourlyNetTaxable: number;
}

export type UpdatePayslipData = Partial<ExtractedPayslipData> & {
    processingStatus?: string;
};

export interface ActionResult<T = { id: string; fileName: string }> {
    success: boolean;
    data?: T;
    error?: string;
}
