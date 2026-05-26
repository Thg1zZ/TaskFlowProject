"use client";

import { useState, useEffect } from "react";
import { usersApi } from "@/lib/api/users";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Lock, ShieldCheck, Loader2, Camera, Eye, EyeOff, Trash2, X } from "lucide-react";
import Image from "next/image";
import AvatarCropModal from "@/components/profile/AvatarCropModal";
import api from "@/lib/axios";

export default function ProfilePage() {
  const { user, login, logout } = useAuth();
  
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [receiveNotifications, setReceiveNotifications] = useState(user?.receiveNotifications ?? true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState({ text: "", type: "" });
  
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Crop states
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      if (user.profileImage) {
        setAvatarPreview(user.profileImage);
      }
      setReceiveNotifications(user.receiveNotifications ?? true);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage("");
    try {
      const res = await usersApi.updateProfile({ name, email, receiveNotifications });
      login({ ...user!, name, email, receiveNotifications, profileImage: avatarPreview || user?.profileImage });
      setProfileMessage("Perfil atualizado com sucesso!");
    } catch (err: any) {
      setProfileMessage(err.response?.data?.message || "Erro ao atualizar perfil.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/jpeg" && file.type !== "image/jpg" && file.type !== "image/png" && file.type !== "image/webp") {
      setProfileMessage("Por favor, selecione uma imagem válida (JPG, PNG ou WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // Increase initial limit since we will compress it anyway
      setProfileMessage("A imagem não pode ultrapassar 10MB.");
      return;
    }

    // Convert file to temporary URL for the cropper
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setIsCropOpen(true);
    
    // Reset input so the same file can be selected again if needed
    e.target.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsCropOpen(false);
    setAvatarLoading(true);
    setProfileMessage("");

    // Create a File object from the Blob
    const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });

    try {
      const updatedProfile = await usersApi.uploadAvatar(file);
      setAvatarPreview(updatedProfile.profileImage);
      setProfileMessage("Foto de perfil atualizada com sucesso! A alteração será visível globalmente no próximo login ou recarregamento.");
    } catch (err: any) {
      setProfileMessage(err.response?.data?.message || "Erro ao fazer upload da imagem.");
    } finally {
      setAvatarLoading(false);
      // Clean up the temporary URL
      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
        setSelectedImageSrc(null);
      }
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
      pwdLoading; // Keep it referenced
      setPwdLoading(false);
    }
  };

  const DeleteAccountModal = () => {
    const [confirmPassword, setConfirmPassword] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    const handleConfirmDelete = async (e: React.FormEvent) => {
      e.preventDefault();
      setDeleteLoading(true);
      setDeleteError("");

      try {
        await api.delete("/users/me", { data: { password: confirmPassword } });
        logout();
        window.location.href = "/login";
      } catch (err: any) {
        setDeleteError(err.response?.data?.message || "Erro ao excluir conta. Verifique sua senha atual.");
      } finally {
        setDeleteLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}>
        <div className="bg-[var(--bg)] w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] flex flex-col shadow-lg" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] text-[var(--red)]">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Excluir Conta
            </h3>
            <button onClick={() => setIsDeleteModalOpen(false)} className="p-1 rounded-full hover:bg-[var(--bg-3)]">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleConfirmDelete} className="p-6 space-y-4 text-left">
            <p className="text-sm text-[var(--text-2)] leading-relaxed">
              Esta ação é **irreversível**. Para prosseguir com a exclusão de todos os seus dados e tarefas, por favor, insira sua **senha atual** para confirmação:
            </p>

            {deleteError && (
              <div className="p-3 text-xs text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-[var(--radius)]">
                {deleteError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Sua Senha Atual</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  type={showDeletePassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--red)] focus:border-transparent"
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--text)] transition-colors focus:outline-none"
                  aria-label={showDeletePassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium hover:bg-[var(--bg-3)] rounded-[var(--radius)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--red)] text-white hover:opacity-90 disabled:opacity-50 rounded-[var(--radius)] transition-opacity shadow-sm"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Exclusão"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
            <div className={`p-3 mb-4 text-sm rounded-[var(--radius)] ${profileMessage.includes("Erro") || profileMessage.includes("Por favor") || profileMessage.includes("não pode") ? "bg-[var(--red)]/10 text-[var(--red)]" : "bg-[var(--green)]/10 text-[var(--green)]"}`}>
              {profileMessage}
            </div>
          )}

          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--bg-3)] border-2 border-[var(--color-border)] flex items-center justify-center text-[var(--text-3)] text-3xl font-bold">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0).toUpperCase()
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-full cursor-pointer hover:opacity-90 transition-opacity shadow-md">
                {avatarLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={avatarLoading} />
              </label>
            </div>
            <p className="text-xs text-[var(--text-3)] mt-2">Permitido: JPG/PNG/WebP (Max 10MB)</p>
          </div>

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

            <div className="flex items-center justify-between p-3 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--bg)]">
              <div>
                <label className="text-sm font-medium">Notificações da Plataforma</label>
                <p className="text-xs text-[var(--text-3)] mt-0.5">Receba alertas importantes e avisos.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={receiveNotifications}
                  onChange={(e) => setReceiveNotifications(e.target.checked)}
                />
                <div className="w-11 h-6 bg-[var(--bg-3)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
              </label>
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
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--text)] transition-colors focus:outline-none"
                  aria-label={showCurrentPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nova Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-[var(--bg)] border border-[var(--color-border)] rounded-[var(--radius)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  required
                  placeholder="Mínimo 10 caracteres, letras e números"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--text)] transition-colors focus:outline-none"
                  aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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

      {/* Danger Zone (Exclusão de Conta) */}
      <div className="glass p-6 rounded-[var(--radius-lg)] border border-[var(--red)]/20 bg-[var(--red)]/5 shadow-sm mt-6">
        <div className="flex items-center gap-2 mb-4 text-[var(--red)] font-semibold">
          <Trash2 className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Zona de Perigo</h2>
        </div>
        <p className="text-sm text-[var(--text-2)] mb-6 leading-relaxed text-left">
          Ao excluir sua conta, todas as suas tarefas, categorias e informações pessoais serão **permanentemente removidas**. Esta ação é irreversível e seu e-mail será adicionado à nossa blacklist, impedindo novos cadastros com o mesmo endereço.
        </p>
        <div className="flex">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[var(--red)] text-white hover:bg-[var(--red)]/90 rounded-[var(--radius)] transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Minha Conta
          </button>
        </div>
      </div>

      <AvatarCropModal
        isOpen={isCropOpen}
        onClose={() => {
          setIsCropOpen(false);
          if (selectedImageSrc) URL.revokeObjectURL(selectedImageSrc);
        }}
        imageSrc={selectedImageSrc}
        onComplete={handleCropComplete}
      />

      {isDeleteModalOpen && <DeleteAccountModal />}
    </div>
  );
}
