'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react';
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

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles: FileStatus[] = acceptedFiles.map(file => ({
            file,
            status: 'pending',
            progress: 0,
        }));
        setFiles(prev => [...prev, ...newFiles]);
    }, []);

    const startProcessing = async () => {
        if (isProcessing) return;

        const filesToProcess = files.filter(f => f.status === 'pending');
        if (filesToProcess.length === 0) {
            toast.error('Aucun fichier à analyser');
            return;
        }

        setIsProcessing(true);

        for (const fileStatus of filesToProcess) {
            const index = files.findIndex(f => f === fileStatus);

            try {
                setFiles(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], status: 'uploading', progress: 50 };
                    return updated;
                });

                const formData = new FormData();
                formData.append('file', fileStatus.file);

                const result = await processPayslipAction(formData);

                if (result.success) {
                    setFiles(prev => {
                        const updated = [...prev];
                        updated[index] = {
                            ...updated[index],
                            status: 'success',
                            progress: 100,
                            id: result.data?.id,
                        };
                        return updated;
                    });

                    toast.success(`${fileStatus.file.name} analysé`);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erreur';
                setFiles(prev => {
                    const updated = [...prev];
                    updated[index] = { ...updated[index], status: 'error', error: errorMessage };
                    return updated;
                });
                toast.error(`${fileStatus.file.name}: ${errorMessage}`);
            }
        }
        setIsProcessing(false);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
        },
        maxSize: 10 * 1024 * 1024,
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
          border-2 border-dashed rounded-lg p-6 md:p-12 text-center cursor-pointer
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
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-semibold">
                                Fichiers ({files.length})
                            </h3>
                            {files.some(f => f.status === 'pending') && (
                                <button
                                    onClick={startProcessing}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Analyse en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            Lancer l&apos;Analyse
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {files.some(f => f.status === 'success') && (
                                <button
                                    onClick={clearCompleted}
                                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    Effacer les réussis
                                </button>
                            )}
                            <button
                                onClick={() => setFiles([])}
                                className="text-sm text-red-500 hover:text-red-600"
                            >
                                Tout Effacer
                            </button>
                        </div>
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
