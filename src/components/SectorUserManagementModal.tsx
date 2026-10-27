import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storage } from '../storage';
import { getSectorColor } from '../utils';
import { 
  X, 
  UserPlus, 
  Users, 
  Mail, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';

interface SectorUserManagementModalProps {
  manager: User;
  onClose: () => void;
  onUserCreated: (newUser: User) => void;
}

export const SectorUserManagementModal: React.FC<SectorUserManagementModalProps> = ({
  manager,
  onClose,
  onUserCreated,
}) => {
  const [users, setUsers] = useState<User[]>(() => {
    return storage.getUsers().filter(u => u.sector === manager.sector);
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password reset state
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetModalError, setResetModalError] = useState('');
  const [lastResetInfo, setLastResetInfo] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setUsers(storage.getUsers().filter(u => u.sector === manager.sector));
    };
    window.addEventListener('storage-users-updated', handleStorageUpdate);
    return () => window.removeEventListener('storage-users-updated', handleStorageUpdate);
  }, [manager.sector]);

  const sectorColor = getSectorColor(manager.sector);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLastResetInfo(null);

    if (!name.trim() || !email.trim() || !position.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Check if email already in use
    const allUsers = storage.getUsers();
    if (allUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setErrorMsg('Este e-mail já está cadastrado no sistema.');
      return;
    }

    try {
      const chosenPassword = initialPassword.trim() || '123456';
      const newUser = storage.createUserByManager(manager, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        position: position.trim(),
        password: chosenPassword,
      });

      setUsers(prev => [...prev, newUser]);
      setName('');
      setEmail('');
      setPosition('');
      setInitialPassword('');
      setSuccessMsg(`Usuário "${newUser.name}" cadastrado com sucesso! Senha inicial: "${chosenPassword}".`);
      onUserCreated(newUser);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao cadastrar usuário.');
    }
  };

  const handleOpenResetPassword = (user: User) => {
    setResetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setResetModalError('');
  };

  const handleGenerateRandomPassword = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const pass = `Nexus@${randomNum}`;
    setNewPassword(pass);
    setConfirmPassword(pass);
    setShowNewPassword(true);
  };

  const handleSetDefaultPassword = () => {
    setNewPassword('123456');
    setConfirmPassword('123456');
    setShowNewPassword(true);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetModalError('');

    if (!newPassword || newPassword.length < 4) {
      setResetModalError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetModalError('A confirmação da senha não confere com a nova senha digitada.');
      return;
    }

    if (!resetUser) return;

    try {
      storage.updateUserPassword(resetUser.id, newPassword);
      setUsers(prev => prev.map(u => u.id === resetUser.id ? { ...u, password: newPassword } : u));
      setLastResetInfo({ name: resetUser.name, password: newPassword });
      setSuccessMsg(`Senha do colaborador "${resetUser.name}" redefinida com sucesso!`);
      setErrorMsg('');
      setResetUser(null);
    } catch (err) {
      console.error(err);
      setResetModalError('Erro ao redefinir a senha do colaborador.');
    }
  };

  const handleCopyPassword = () => {
    if (lastResetInfo) {
      navigator.clipboard.writeText(lastResetInfo.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Gerenciar Equipe do Setor
                </h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sectorColor.badge}`}>
                  {manager.sector}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gestor responsável: {manager.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions banner */}
        <div className="px-6 py-3 bg-indigo-50/60 border-b border-indigo-100 text-xs text-indigo-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Como gestor da área, você pode adicionar novos colaboradores e redefinir suas senhas de acesso. Os novos membros poderão realizar solicitações de compra que serão direcionadas à sua aprovação.
          </span>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Create User Form */}
          <form onSubmit={handleCreate} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Cadastrar Novo Colaborador no Setor
            </h3>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {lastResetInfo && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span>Nova senha de acesso de <strong>{lastResetInfo.name}</strong>:</span>
                    <code className="px-2 py-0.5 bg-white border border-indigo-200 rounded font-mono font-bold text-indigo-700 ml-1.5">
                      {lastResetInfo.password}
                    </code>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Senha</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome Completo
                </label>
                <input
                  id="new-user-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Marcelo Souza"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="new-user-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marcelo@empresa.com"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cargo / Função
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="new-user-position"
                    type="text"
                    required
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="ex: Analista de Processos, Operador Líder"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Senha Inicial (Opcional - Padrão: 123456)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="new-user-password"
                    type="text"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                id="submit-create-user-button"
                type="submit"
                className="w-full sm:w-auto py-1.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Criar Colaborador
              </button>
            </div>
          </form>

          {/* Current Sector Users List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Membros Atuais ({users.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                Acesso restrito exclusivamente ao setor {manager.sector}
              </span>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between transition-colors gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0">
                      {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                        <span className="truncate">{u.name}</span>
                        {u.role === 'gestor' && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-medium shrink-0">
                            Gestor
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{u.position} • {u.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-emerald-600 font-medium hidden sm:flex items-center gap-1 mr-1">
                      <CheckCircle2 className="w-3 h-3" /> Ativo
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenResetPassword(u)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title={`Redefinir senha de acesso de ${u.name}`}
                    >
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Redefinir Senha</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* Sub-Modal: Redefinir Senha do Usuário */}
      {resetUser && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Redefinir Senha do Colaborador
                  </h3>
                  <p className="text-xs text-slate-500">
                    Setor {manager.sector}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-6 space-y-4">
              
              {/* User Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Colaborador:</span>
                  <strong className="text-slate-900">{resetUser.name}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">E-mail Corporativo:</span>
                  <span className="text-slate-700 font-mono">{resetUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Cargo:</span>
                  <span className="text-slate-700">{resetUser.position}</span>
                </div>
              </div>

              {resetModalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetModalError}</span>
                </div>
              )}

              {/* Quick Helper Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetDefaultPassword}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                >
                  Usar Padrão: 123456
                </button>
                <button
                  type="button"
                  onClick={handleGenerateRandomPassword}
                  className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                >
                  Gerar Sugestão
                </button>
              </div>

              {/* New Password Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nova Senha de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha para confirmação"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Após salvar, o colaborador já poderá acessar a plataforma com a nova senha definida.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Salvar Nova Senha</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
