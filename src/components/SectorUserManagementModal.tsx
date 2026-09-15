import React, { useState } from 'react';
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
  ShieldCheck
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
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const sectorColor = getSectorColor(manager.sector);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

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
      const newUser = storage.createUserByManager(manager, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        position: position.trim(),
      });

      setUsers(prev => [...prev, newUser]);
      setName('');
      setEmail('');
      setPosition('');
      setSuccessMsg(`Usuário "${newUser.name}" cadastrado com sucesso no setor de ${manager.sector}!`);
      onUserCreated(newUser);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao cadastrar usuário.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions banner */}
        <div className="px-6 py-3 bg-indigo-50/60 border-b border-indigo-100 text-xs text-indigo-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Como gestor da área, você pode adicionar novos colaboradores. Os novos membros poderão realizar solicitações de compra que serão direcionadas à sua aprovação.
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

              <div className="flex items-end">
                <button
                  id="submit-create-user-button"
                  type="submit"
                  className="w-full py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Criar Colaborador
                </button>
              </div>
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

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center">
                      {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {u.name}
                        {u.role === 'gestor' && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-medium">
                            Gestor
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{u.position} • {u.email}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ativo
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
