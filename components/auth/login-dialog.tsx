"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { User, Lock, Loader2, LogIn, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function LoginDialog() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    console.log("🚀 [Login] Attempting with:", { username });

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        console.log("❌ [Login] Failed:", result.error);
        setError("Identifiants incorrects. Veuillez réessayer.");
        toast.error("Échec de la connexion");
      } else {
        console.log("✅ [Login] Success!");
        toast.success("Connexion réussie !");
        window.location.reload();
      }
    } catch (err) {
      console.error("🔥 [Login] Error:", err);
      setError("Une erreur est survenue. Veuillez réessayer.");
      toast.error("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  // SVGs for better reliability
  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
  );

  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88 12 12m2.12 2.12L17 17m-6.41-6.41-5.71-5.71m0 0 16.24 16.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61m-6.41-6.41-2.12-2.12"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-500">
      <div className="w-full max-w-[420px] overflow-hidden bg-slate-900/80 border border-white/10 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] rounded-[2rem] backdrop-blur-xl animate-in zoom-in-95 duration-500">
        <div className="relative p-10">
          {/* Header Branding */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative p-1 mb-6 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/20 ring-4 ring-white/5">
              <div className="bg-slate-900 rounded-[1.4rem] p-3 overflow-hidden">
                <Image
                  src="/paiepro.png"
                  alt="PaiePro Logo"
                  width={64}
                  height={64}
                  className="w-14 h-14 object-contain brightness-110"
                />
              </div>
            </div>
            <h2 className="text-3xl font-black text-white text-center tracking-tight mb-2">
              Connexion
            </h2>
            <p className="text-sm text-slate-400 text-center max-w-[260px] leading-relaxed font-medium">
              Votre assistant intelligent d&apos;analyse de fiches de paie
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Utilisateur</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-white/5 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-slate-800/80 transition-all font-medium"
                  placeholder="Ex: admin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Mot de passe</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-14 py-4 bg-slate-800/50 border border-white/5 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-slate-800/80 transition-all font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-blue-400 active:scale-90 transition-all focus:outline-none"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 animate-in slide-in-from-top-2 duration-300 font-medium">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-4 px-6 rounded-2xl text-white font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none group"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <span className="flex items-center">
                  Se connecter
                  <LogIn className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6"></div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">
              PaiePro Analyzer • Sécurisé par NextAuth
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
