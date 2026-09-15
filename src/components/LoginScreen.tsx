import React, { useState } from 'react';
import { User, SectorType } from '../types';
import { storage } from '../storage';
import { getSectorColor } from '../utils';
import { 
  Building2, 
  Lock, 
  Mail, 
  LogIn, 
  ShieldCheck, 
  ShoppingBag, 
  Users, 
  ArrowRight,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const users = storage.getUsers();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'master' | 'gestores' | 'compras' | 'colaboradores'>('master');

  const masterUser = users.find(u => u.role === 'master') || {
    id: 'user-master-dev',
    name: 'Desenvolvedor Master',
    email: 'dev@empresa.com',
    role: 'master',
    sector: 'TI',
    position: 'Desenvolvedor & Administrador Geral do Sistema',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail corporativo.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'dev@empresa.com' || cleanEmail === 'dev' || cleanEmail === 'master') {
      onLogin(masterUser);
      return;
    }

    const found = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      setErrorMessage('Usuário não encontrado com este e-mail. Utilize um dos botões de acesso rápido abaixo para testar.');
      return;
    }

    onLogin(found);
  };

  const handleQuickLogin = (user: User) => {
    onLogin(user);
  };

  const comprasUsers = users.filter(u => u.role === 'compras');
  const gestoresUsers = users.filter(u => u.role === 'gestor');
  const colaboradoresUsers = users.filter(u => u.role === 'colaborador');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Portal de Compras & Suprimentos
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Gestão descentralizada por setor com controle centralizado de compras
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        
        {/* Master Developer Quick Access Banner */}
        <div className="mb-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Acesso Nível Master (Desenvolvedor)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                  dev@empresa.com
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Controle total sobre todas as áreas, setores e colaboradores.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleQuickLogin(masterUser)}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0"
          >
            <span>Entrar como Master</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white py-8 px-6 sm:px-10 shadow-lg rounded-2xl border border-slate-200">
          
          {/* Direct Login Form */}
          <form onSubmit={handleFormLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                E-mail Corporativo
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: lucas.ti@empresa.com ou alexandre.compras@empresa.com"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Senha de Acesso
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <button
              id="submit-login-button"
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <LogIn className="w-4 h-4" />
              Entrar no Sistema
            </button>
          </form>

          {/* Quick Access Divider */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Acesso Rápido para Demonstração
                </span>
                <p className="text-[11px] text-slate-500">
                  Clique diretamente em qualquer perfil para testar as permissões e o fluxo
                </p>
              </div>
            </div>

            {/* Quick Access Category Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('master')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'master'
                    ? 'bg-slate-900 text-amber-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Nível Master</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('compras')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'compras'
                    ? 'bg-white text-cyan-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Compras</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gestores')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'gestores'
                    ? 'bg-white text-indigo-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>9 Gestores</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('colaboradores')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'colaboradores'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Colaboradores</span>
              </button>
            </div>

            {/* Tab 0: Master Dev */}
            {activeTab === 'master' && (
              <div className="space-y-2.5">
                <div className="p-3.5 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Controle Total de Desenvolvedor:
                  </div>
                  <p className="text-slate-300">
                    Acesso a todos os 10 setores, criação e exclusão de colaboradores de qualquer área, aprovação imediata de solicitações, definição de preços e backup do banco de dados local.
                  </p>
                </div>
                <button
                  onClick={() => handleQuickLogin(masterUser)}
                  className="w-full p-3.5 text-left rounded-xl border-2 border-amber-500/40 bg-slate-900 hover:border-amber-400 hover:bg-slate-800 text-white transition-all flex items-center justify-between group shadow-sm"
                >
                  <div>
                    <div className="text-xs font-black text-amber-300 flex items-center gap-2">
                      {masterUser.name}
                      <span className="text-[10px] px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded font-bold border border-amber-400/30">
                        SUPER ADMIN
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {masterUser.email} • {masterUser.position}
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Acessar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            )}

            {/* Tab 1: Compras */}
            {activeTab === 'compras' && (
              <div className="space-y-2.5">
                <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl text-xs text-cyan-950">
                  <strong>Tela do Setor de Compras:</strong> Recebe todas as solicitações de todos os setores, emite pedidos, define preços/valores, atualiza status e controla o dashboard global de gastos.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {comprasUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleQuickLogin(user)}
                      className="p-3 text-left rounded-xl border border-cyan-200 bg-white hover:border-cyan-400 hover:bg-cyan-50/50 hover:shadow-xs transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-cyan-800 flex items-center gap-1.5">
                          {user.name}
                          <span className="text-[10px] px-1.5 py-0.2 bg-cyan-100 text-cyan-800 rounded font-normal">
                            Compras
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{user.position}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Gestores das 9 Áreas */}
            {activeTab === 'gestores' && (
              <div className="space-y-2.5">
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950">
                  <strong>Gestores de Setor:</strong> Cada gestor aprova compras da sua área, cria novos usuários do setor e acompanha gastos departamentais (não vê outros setores).
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {gestoresUsers.map(user => {
                    const sectorColor = getSectorColor(user.sector);
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleQuickLogin(user)}
                        className="p-2.5 text-left rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-xs transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sectorColor.badge}`}>
                            {user.sector}
                          </span>
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {user.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {user.position}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Colaboradores */}
            {activeTab === 'colaboradores' && (
              <div className="space-y-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <strong>Colaboradores (Usuários criados pelos gestores):</strong> Podem criar solicitações com descrição, motivo, link e quantidade. Acompanham aprovação e o valor refletido por Compras.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {colaboradoresUsers.map(user => {
                    const sectorColor = getSectorColor(user.sector);
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleQuickLogin(user)}
                        className="p-3 text-left rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 hover:shadow-xs transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-slate-800">
                              {user.name}
                            </span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${sectorColor.badge}`}>
                              {user.sector}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">{user.position}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* System Highlights */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 9 Setores Isolados
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aprovação do Gestor
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Central de Compras
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Valor Refletido
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
