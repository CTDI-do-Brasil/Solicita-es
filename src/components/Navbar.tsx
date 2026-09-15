import React, { useState } from 'react';
import { User, SectorType, ALL_SECTORS } from '../types';
import { storage } from '../storage';
import { getSectorColor } from '../utils';
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
  GitBranch
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchUser: (user: User) => void;
  masterViewMode?: 'console' | 'compras' | 'setor';
  onSelectMasterViewMode?: (mode: 'console' | 'compras' | 'setor') => void;
  simulatedSector?: SectorType;
  onSelectSimulatedSector?: (sector: SectorType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentUser, 
  onLogout, 
  onSwitchUser,
  masterViewMode = 'console',
  onSelectMasterViewMode,
  simulatedSector = 'Produção',
  onSelectSimulatedSector,
}) => {
  const [showSwitchDropdown, setShowSwitchDropdown] = useState(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  Portal de Suprimentos
                </span>
                {isMaster ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    MASTER / DEV
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                    Corporativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Gestão de Compras & Solicitações por Setor
              </p>
            </div>
          </div>

          {/* Master View Mode Switcher (When logged as Master) */}
          {isMaster && onSelectMasterViewMode && (
            <div className="hidden md:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => onSelectMasterViewMode('console')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
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
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  masterViewMode === 'compras'
                    ? 'bg-cyan-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Central Compras</span>
              </button>

              <div className="flex items-center pl-1 border-l border-slate-300">
                <button
                  onClick={() => onSelectMasterViewMode('setor')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
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

          {/* Current User & Actions */}
          <div className="flex items-center gap-3">
            
            {/* Quick User Switcher Dropdown */}
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

            {/* Current User Badge Card */}
            <div className="flex items-center gap-3 pl-2 sm:pl-3 sm:border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-semibold flex items-center justify-center text-sm shadow-xs">
                {currentUser.name
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>

              <div className="hidden lg:block text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 leading-tight">
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

              {/* Logout Button */}
              <button
                id="logout-button"
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sair do sistema"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
