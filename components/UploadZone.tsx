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
