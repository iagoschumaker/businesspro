import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { meService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Profile: React.FC = () => {
  const { refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const passwordSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingProfile(true);
      setError(null);
      try {
        const me = await meService.get();
        setName(me.name || '');
        setEmail(me.email || '');
        setAvatarUrl((me as any).avatarUrl || '');
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'Falha ao carregar seu perfil');
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, []);

  // Scroll para a seção de senha se a URL contiver #password
  useEffect(() => {
    if (location.hash === '#password' && passwordSectionRef.current) {
      passwordSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    setError(null);
    try {
      await meService.update({ name, avatarUrl });
      setMessage('Perfil atualizado com sucesso.');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Falha ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não confere');
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    setChangingPassword(true);
    setMessage(null);
    setError(null);
    try {
      await meService.changePassword({ currentPassword, newPassword });
      setMessage('Senha alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Falha ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="p-6 no-uppercase-scope">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Minha Conta</h1>

      {message && (
        <div className="mb-4 rounded-md bg-green-50 p-4 text-green-700 border border-green-200">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700 border border-red-200">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Perfil */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Perfil</h2>
          {loadingProfile ? (
            <div className="text-gray-500">Carregando...</div>
          ) : (
            <form onSubmit={onSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 normal-case">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 normal-case no-uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 normal-case">E-mail</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-300 cursor-not-allowed normal-case"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 normal-case">Avatar</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={async (e) => {
                    const inputEl = e.currentTarget as HTMLInputElement;
                    const file = inputEl.files?.[0];
                    if (!file) return;
                    setUploadingAvatar(true);
                    setMessage(null);
                    setError(null);
                    try {
                      const res = await meService.uploadAvatar(file);
                      setAvatarUrl(res.avatarUrl);
                      setMessage('Avatar atualizado com sucesso.');
                      // Atualiza usuário global para refletir avatar no header
                      try { await refreshUser(); } catch {}
                    } catch (err: any) {
                      setError(err?.response?.data?.error || err?.message || 'Falha ao enviar avatar');
                    } finally {
                      setUploadingAvatar(false);
                      // limpa input para permitir reenviar o mesmo arquivo se desejar
                      if (inputEl) inputEl.value = '';
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 normal-case file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingAvatar && (
                  <p className="text-sm text-gray-500 mt-2">Enviando avatar...</p>
                )}
                {avatarUrl && (
                  <img src={avatarUrl} alt="avatar" className="mt-3 h-16 w-16 rounded-full object-cover border" />
                )}
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Senha */}
        <div id="password" ref={passwordSectionRef} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 normal-case">Alterar Senha</h2>
          <form onSubmit={onChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 normal-case">Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 normal-case"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 normal-case">Nova senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 normal-case"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 normal-case">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 normal-case"
                />
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {changingPassword ? 'Alterando...' : 'Alterar senha'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
