'use client';

import { useState } from 'react';
import { X, Save, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { updateUserAction } from '@/app/actions/user';
import { useSession } from 'next-auth/react';

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const { data: session, update: updateSession } = useSession();
    const [name, setName] = useState(session?.user?.name || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password && password !== confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        setIsSaving(true);
        const result = await updateUserAction({
            name,
            password: password || undefined
        });

        if (result.success) {
            toast.success('Profil mis à jour');
            await updateSession({ name });
            onClose();
        } else {
            toast.error(result.error);
        }
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Paramètres</h3>
                        <p className="text-sm text-gray-500">Modifier votre profil</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Nom d'affichage
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Votre nom"
                            required
                        />
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 my-4 pt-4">
                        <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wider">Sécurité</p>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    Nouveau mot de passe
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Laisser vide pour ne pas changer"
                                />
                            </div>

                            {password && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Confirmer le mot de passe
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-900 focus:ring-2 outline-none transition-all ${
                                            confirmPassword && password !== confirmPassword
                                                ? 'border-red-500 focus:ring-red-500'
                                                : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
                                        }`}
                                        placeholder="Répétez le mot de passe"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || (!!password && password !== confirmPassword)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
