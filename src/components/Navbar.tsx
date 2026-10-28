import React, { useState } from 'react';
import { User, SectorType, ALL_SECTORS } from '../types';
import { storage } from '../storage';
import { getSectorColor, isLocalEnvironment } from '../utils';
import { 
  Building2, 
  LogOut, 
  UserCheck, 
  ShieldCheck, 
  ChevronDown, 
  RefreshCw, 
  RotateCcw,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
  GitBranch,
  KeyRound,
  Lock
} from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchUser: (user: User) => void;
  masterViewMode?: 'console' | 'compras' | 'setor' | 'aprovadores';
  onSelectMasterViewMode?: (mode: 'console' | 'compras' | 'setor' | 'aprovadores') => void;
  simulatedSector?: SectorType;
  onSelectSimulatedSector?: (sector: SectorType) => void;
  activeAppArea?: 'setor' | 'compras' | 'aprovadores';
  onSelectAppArea?: (area: 'setor' | 'compras' | 'aprovadores') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentUser, 
  onLogout, 
  onSwitchUser,
  masterViewMode = 'console',
  onSelectMasterViewMode,
  simulatedSector = 'Produção',
  onSelectSimulatedSector,
  activeAppArea,
  onSelectAppArea,
}) => {
  const [showSwitchDropdown, setShowSwitchDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const isLocal = isLocalEnvironment();
  const users = storage.getUsers();
  const isMaster = currentUser.role === 'master';
  const displaySector = isMaster && masterViewMode === 'setor' ? simulatedSector : currentUser.sector;
  const sectorColor = getSectorColor(displaySector);

  const handleResetData = () => {
    if (confirm('Deseja restaurar os dados originais de demonstração com pedidos e setores de exemplo?')) {
      storage.resetData();
      window.location.reload();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[76px] sm:min-h-[84px] md:min-h-[88px] py-2 sm:py-2.5 gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3.5 sm:gap-4.5 shrink-0">
            <img
              src="/ctdi-logo.png"
              alt="Logo CTDI"
              className="h-8 sm:h-10 md:h-11 lg:h-[48px] w-auto object-contain shrink-0"
            />
            <div className="h-10 sm:h-12 md:h-13 w-[1.5px] bg-slate-200 rounded-full hidden sm:block shrink-0" />
            <div className="flex items-center gap-2.5">
              <img
                src="/nexus-logo.png"
                alt="Nexus - Procurement & Supply Chain Hub"
                className="h-13 sm:h-15 md:h-[68px] lg:h-[72px] w-auto object-contain shrink-0 drop-shadow-2xs"
              />
              {isMaster && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                  MASTER / DEV
                </span>
              )}
            </div>
          </div>

          {/* Master View Mode Switcher (When logged as Master) */}
          {isMaster && onSelectMasterViewMode && (
            <div className="hidden md:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => onSelectMasterViewMode('console')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  masterViewMode === 'console'
                    ? 'bg-slate-900 text-amber-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Console Master</span>
              </button>

              <button
                onClick={() => onSelectMasterViewMode('compras')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  masterViewMode === 'compras'
                    ? 'bg-cyan-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Central Compras</span>
              </button>

              <button
                onClick={() => onSelectMasterViewMode('aprovadores')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  masterViewMode === 'aprovadores'
                    ? 'bg-purple-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                <span>Aprovadores</span>
              </button>

              <div className="flex items-center pl-1 border-l border-slate-300">
                <button
                  onClick={() => onSelectMasterViewMode('setor')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    masterViewMode === 'setor'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Setor:</span>
                </button>
                {masterViewMode === 'setor' && onSelectSimulatedSector && (
                  <select
                    value={simulatedSector}
                    onChange={(e) => onSelectSimulatedSector(e.target.value as SectorType)}
                    className="ml-1 bg-white text-slate-900 font-bold border border-slate-300 rounded px-2 py-1 text-xs outline-hidden"
                  >
                    {ALL_SECTORS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Non-Master Navigation: Setor / Compras / Aprovadores */}
          {!isMaster && onSelectAppArea && (
            <div className="hidden sm:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs shrink-0">
              <button
                onClick={() => onSelectAppArea(currentUser.role === 'compras' ? 'compras' : 'setor')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeAppArea !== 'aprovadores'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{currentUser.role === 'compras' ? 'Central Compras' : `Meu Setor (${currentUser.sector})`}</span>
              </button>

              <button
                onClick={() => onSelectAppArea('aprovadores')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeAppArea === 'aprovadores'
                    ? 'bg-purple-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Área Aprovadores</span>
              </button>
            </div>
          )}

          {/* Current User & Actions */}
          <div className="flex items-center gap-3 shrink-0">
            
            {/* Quick User Switcher Dropdown - Visível apenas em ambiente local para testes */}
            {isLocal && (
              <div className="relative">
                <button
                id="quick-user-switch-button"
                onClick={() => setShowSwitchDropdown(!showSwitchDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium transition-colors"
                title="Trocar usuário rapidamente para teste"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Trocar Perfil</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showSwitchDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowSwitchDropdown(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Simular Acesso de Usuário
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Alterne entre master, compras, gestores e colaboradores
                      </p>
                    </div>

                    {/* Master Group */}
                    <div className="p-2 border-b border-slate-100">
                      <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider px-2 py-1 bg-amber-50 rounded mb-1 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-600" /> Nível Master (Controle Total)
                      </div>
                      {users
                        .filter(u => u.role === 'master')
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u);
                              setShowSwitchDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-amber-50 transition-colors ${
                              currentUser.id === u.id ? 'bg-amber-100 font-black text-amber-950' : 'text-slate-800'
                            }`}
                          >
                            <div>
                              <div className="font-bold">{u.name}</div>
                              <div className="text-[11px] text-slate-500">{u.position}</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded-full">
                              MASTER
                            </span>
                          </button>
                        ))}
                    </div>

                    {/* Setor de Compras */}
                    <div className="px-3 py-2">
                      <div className="text-[11px] font-semibold text-cyan-800 uppercase tracking-wider px-2 py-1 bg-cyan-50 rounded mb-1">
                        Central de Compras (Acesso Geral)
                      </div>
                      {users
                        .filter(u => u.role === 'compras')
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u);
                              setShowSwitchDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-cyan-50 transition-colors ${
                              currentUser.id === u.id ? 'bg-cyan-50 font-semibold text-cyan-900' : 'text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-[11px] text-slate-500">{u.position}</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-full">
                              Compras
                            </span>
                          </button>
                        ))}
                    </div>

                    {/* Alçada Executiva de Aprovadores (Fernando -> Eduardo -> Luiz) */}
                    <div className="px-3 py-2 border-t border-slate-100 bg-purple-50/50">
                      <div className="text-[11px] font-bold text-purple-950 uppercase tracking-wider px-2 py-1 bg-purple-100 rounded mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                          Alçada de Aprovadores
                        </span>
                        <span className="text-[9px] bg-purple-700 text-white font-bold px-1.5 py-0.2 rounded">
                          Fernando ➔ Eduardo ➔ Luiz
                        </span>
                      </div>
                      {users
                        .filter(u => u.role === 'aprovador' || u.id.startsWith('user-aprovador-'))
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u);
                              setShowSwitchDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-purple-100 transition-colors cursor-pointer ${
                              currentUser.id === u.id ? 'bg-purple-100 font-bold text-purple-950' : 'text-slate-800'
                            }`}
                          >
                            <div>
                              <div className="font-bold">{u.name}</div>
                              <div className="text-[11px] text-purple-800">{u.position}</div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-200 text-purple-900 font-bold rounded">
                              Aprovador
                            </span>
                          </button>
                        ))}
                    </div>

                    {/* Gestores de Setor */}
                    <div className="px-3 py-2 border-t border-slate-100">
                      <div className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider px-2 py-1 bg-indigo-50 rounded mb-1">
                        Gestores de Área (Aprovações & Usuários)
                      </div>
                      {users
                        .filter(u => u.role === 'gestor')
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u);
                              setShowSwitchDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                              currentUser.id === u.id ? 'bg-indigo-50 font-semibold text-indigo-900' : 'text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-[11px] text-slate-500">{u.sector}</div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                              Gestor
                            </span>
                          </button>
                        ))}
                    </div>

                    {/* Colaboradores Solicitantes */}
                    <div className="px-3 py-2 border-t border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider px-2 py-1 bg-slate-100 rounded mb-1">
                        Colaboradores (Solicitantes)
                      </div>
                      {users
                        .filter(u => u.role === 'colaborador')
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onSwitchUser(u);
                              setShowSwitchDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                              currentUser.id === u.id ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-[11px] text-slate-500">{u.sector} • {u.position}</div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                              Usuário
                            </span>
                          </button>
                        ))}
                    </div>

                    {/* Revisores de Versão e Homologação */}
                    <div className="px-3 py-2 border-t border-slate-100 bg-amber-50/40">
                      <div className="text-[11px] font-bold text-amber-950 uppercase tracking-wider px-2 py-1 bg-amber-100 rounded mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-700" />
                          Revisores de Versão & QA
                        </span>
                        <span className="text-[9px] bg-amber-600 text-white font-bold px-1.5 py-0.2 rounded">
                          Aprovadores
                        </span>
                      </div>
                      {storage.getReviewers().map(rev => {
                        // Create a temporary User adapter so the reviewer can be tested in session
                        const revAsUser: User = {
                          id: rev.id,
                          name: rev.name,
                          email: rev.email,
                          role: 'master', // Gives access to Master console and version control
                          sector: rev.sector,
                          position: rev.position,
                          createdAt: '2026-01-01T00:00:00Z',
                        };
                        return (
                          <button
                            key={rev.id}
                            onClick={() => {
                              onSwitchUser(revAsUser);
                              setShowSwitchDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-amber-100 transition-colors ${
                              currentUser.id === rev.id ? 'bg-amber-100 font-bold text-amber-950' : 'text-slate-800'
                            }`}
                          >
                            <div>
                              <div className="font-bold">{rev.name}</div>
                              <div className="text-[11px] text-amber-800">{rev.position}</div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 text-amber-900 font-bold rounded">
                              Revisor
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="px-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={handleResetData}
                        className="w-full text-center text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 py-1.5 rounded flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restaurar dados de exemplo
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            )}

            {/* Current User Profile Menu & Actions */}
            <div className="relative flex items-center gap-2 pl-2 sm:pl-3 sm:border-l border-slate-200">
              
              {/* Profile Card Trigger Button */}
              <button
                id="user-profile-menu-button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 sm:gap-3 p-1.5 -m-1.5 rounded-xl hover:bg-slate-100/80 transition-colors text-left cursor-pointer group"
                title="Opções do seu perfil e alterar senha"
              >
                <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-semibold flex items-center justify-center text-sm shadow-xs group-hover:ring-2 group-hover:ring-indigo-500/30 transition-all shrink-0">
                  {currentUser.name
                    .split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>

                <div className="hidden lg:block text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                      {currentUser.name}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sectorColor.badge}`}>
                      {currentUser.sector}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    {currentUser.role === 'master' ? (
                      <span className="flex items-center gap-1 text-amber-700 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Desenvolvedor Master (Total)
                      </span>
                    ) : currentUser.role === 'compras' ? (
                      <span className="flex items-center gap-1 text-cyan-700 font-medium">
                        <Sparkles className="w-3 h-3" /> Central de Compras
                      </span>
                    ) : currentUser.role === 'gestor' ? (
                      <span className="flex items-center gap-1 text-indigo-700 font-medium">
                        <ShieldCheck className="w-3 h-3" /> Gestor Responsável
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-600">
                        <UserCheck className="w-3 h-3" /> Colaborador
                      </span>
                    )}
                    <span>• {currentUser.position}</span>
                  </div>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Direct Quick Action: Alterar Senha */}
              <button
                id="navbar-change-password-btn"
                onClick={() => setShowPasswordModal(true)}
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                title="Alterar minha senha"
              >
                <KeyRound className="w-5 h-5" />
              </button>

              {/* Logout Button */}
              <button
                id="logout-button"
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Sair do sistema"
              >
                <LogOut className="w-5 h-5" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {currentUser.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {currentUser.email}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sectorColor.badge}`}>
                          {currentUser.sector}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500">
                          {currentUser.position}
                        </span>
                      </div>
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowPasswordModal(true);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <div>Alterar Minha Senha</div>
                          <div className="text-[10px] font-normal text-slate-400">Trocar senha de acesso</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer mt-0.5"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <div>
                          <div>Sair do Sistema</div>
                          <div className="text-[10px] font-normal text-rose-400">Encerrar sessão atual</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>

          </div>

        </div>
      </div>

      {/* Modal de Alteração de Senha Pessoal */}
      <ChangePasswordModal
        currentUser={currentUser}
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </header>
  );
};
