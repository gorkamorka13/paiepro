"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { User, Lock, Loader2, LogIn, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function LoginDialog() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Identifiants incorrects. Veuillez réessayer.");
        toast.error("Échec de la connexion");
      } else {
        toast.success("Connexion réussie !");
        // Optionnel: rafraîchir ou rediriger
        window.location.reload();
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      toast.error("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md overflow-hidden bg-white/10 border border-white/20 shadow-2xl rounded-2xl backdrop-blur-md animate-in zoom-in-95 duration-300">
        <div className="relative p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 mb-4 bg-blue-500/20 rounded-full ring-8 ring-blue-500/5">
              <LogIn className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center">Connexion</h2>
            <p className="text-sm text-gray-400 mt-2 text-center">
              Accédez à votre assistant d'analyse de fiches de paie
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300 ml-1">Nom d'utilisateur</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300 ml-1">Mot de passe</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-white/10 pt-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Payslip Analyzer Pro
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
