"use client";

import { useState, useEffect } from "react";
import { usersApi } from "@/lib/api/users";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Lock, ShieldCheck, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, login } = useAuth();
  
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage("");
    try {
      const res = await usersApi.updateProfile({ name, email });
      // Update local storage context token with new data (the backend usually returns the updated user inside a token payload if needed, or we just rely on next login. The backend UserController returns the Map.)
      // Assuming it returns updated fields, we update AuthContext if necessary, or just show success.
      setProfileMessage("Perfil atualizado com sucesso!");
    } catch (err: any) {
      setProfileMessage(err.response?.data?.message || "Erro ao atualizar perfil.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdMessage({ text: "", type: "" });
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      setPwdMessage({ text: "Senha alterada com sucesso!", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      let msg = err.response?.data?.message || "Erro ao alterar senha.";
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        msg = err.response.data.errors[0].defaultMessage;
      }
      setPwdMessage({ text: msg, type: "error" });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Perfil e Segurança</h1>
        <p className="text-[var(--text-2)] text-sm mt-1">Gerencie suas informações e credenciais de acesso.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Basic Info Form */}
        <div className="glass p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Dados Básicos</h2>
          </div>

          {profileMessage && (
            <div className={`p-3 mb-4 text-sm rounded-[var(--radius)] ${profileMessage.includes("Erro") ? "bg-[var(--red)]/10 text-[var(--red)]" : "bg-[var(--green)]/10 text-[var(--green)]"}`}>
              {profileMessage}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome Completo</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--bg-3)] hover:bg-[var(--color-border)] text-[var(--text)] rounded-[var(--radius)] transition-colors"
            >
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}
            </button>
          </form>
        </div>

        {/* Security Form */}
        <div className="glass p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold">Segurança</h2>
          </div>

          {pwdMessage.text && (
            <div className={`p-3 mb-4 text-sm rounded-[var(--radius)] ${pwdMessage.type === "error" ? "bg-[var(--red)]/10 text-[var(--red)]" : "bg-[var(--green)]/10 text-[var(--green)]"}`}>
              {pwdMessage.text}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Senha Atual</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nova Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  required
                  placeholder="Mínimo 10 caracteres, letras e números"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 rounded-[var(--radius)] transition-opacity"
            >
              {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar Senha"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
