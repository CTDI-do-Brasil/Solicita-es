import React, { useState, useMemo } from 'react';
import { User, PurchaseRequest, SectorType, UserRole, ALL_SECTORS, ProjectType, ALL_PROJECTS } from '../types';
import { storage } from '../storage';
import { 
  formatCurrency, 
  formatDate, 
  getPurchaseStatusInfo, 
  getManagerApprovalInfo, 
  getSectorColor,
  getProjectColor,
  getLatestRequestStatusInfo
} from '../utils';
import { 
  ShieldAlert, 
  Users, 
  Building2, 
  ShoppingBag, 
  DollarSign, 
  UserPlus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  LogIn, 
  CheckCircle2, 
  Clock, 
  Download, 
  RotateCcw, 
  FileText, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Plus,
  GitBranch,
  Radio,
  BarChart3,
  KeyRound,
  Mail,
  Send
} from 'lucide-react';
import { VersionControlPanel } from './VersionControlPanel';
import { ApproversView } from './ApproversView';
import { SmtpConfigModal } from './SmtpConfigModal';

interface MasterDeveloperViewProps {
  currentUser: User;
  onImpersonateUser: (user: User) => void;
  onOpenManageOrder: (req: PurchaseRequest) => void;
  onSelectRequest: (req: PurchaseRequest) => void;
  onOpenNewRequest: () => void;
  requestsVersion: number;
}

export const MasterDeveloperView: React.FC<MasterDeveloperViewProps> = ({
  currentUser,
  onImpersonateUser,
  onOpenManageOrder,
  onSelectRequest,
  onOpenNewRequest,
  requestsVersion,
}) => {
  const [activeTab, setActiveTab] = useState<'aprovadores' | 'usuarios' | 'solicitacoes' | 'setores' | 'versoes' | 'devtools'>('aprovadores');
  
  // User Management State
  const [userSearch, setUserSearch] = useState('');
  const [userSectorFilter, setUserSectorFilter] = useState<string>('todos');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('todos');
  
  // Modal for Master creating/editing user
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSector, setFormSector] = useState<SectorType>('Produção');
  const [formRole, setFormRole] = useState<UserRole>('colaborador');
  const [formPosition, setFormPosition] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formProjects, setFormProjects] = useState<ProjectType[]>(['Manutenção/Engenharia']);
  const [userFormError, setUserFormError] = useState('');

  // Request Management State
  const [reqSearch, setReqSearch] = useState('');
  const [reqSectorFilter, setReqSectorFilter] = useState<string>('todos');
  const [reqStatusFilter, setReqStatusFilter] = useState<string>('todos');

  // Email test states
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestFeedback, setEmailTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTriggerTestEmails = async () => {
    setEmailTestLoading(true);
    setEmailTestFeedback(null);
    try {
      const res = await fetch('/api/mail/test-full-flow', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setEmailTestFeedback({
          type: 'success',
          message: data.message || 'E-mails de teste disparados com sucesso!',
        });
      } else {
        setEmailTestFeedback({
          type: 'error',
          message: data.details ? `${data.error} — Detalhes: ${data.details}` : data.error || 'Falha ao disparar e-mails.',
        });
      }
    } catch (err: any) {
      setEmailTestFeedback({
        type: 'error',
        message: 'Erro ao conectar com a API de e-mails: ' + err.message,
      });
    } finally {
      setEmailTestLoading(false);
    }
  };

  // Load all users and all requests
  const users = useMemo(() => {
    return storage.getUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestsVersion]);

  const allRequests = useMemo(() => {
    return storage.getAllRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestsVersion]);

  // Metrics
  const totalGlobalSpent = useMemo(() => {
    return allRequests.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
  }, [allRequests]);

  const pendingApprovalsCount = useMemo(() => {
    return allRequests.filter(r => r.managerApprovalStatus === 'pendente').length;
  }, [allRequests]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSector = userSectorFilter === 'todos' || u.sector === userSectorFilter;
      const matchRole = userRoleFilter === 'todos' || u.role === userRoleFilter;
      const matchSearch = !userSearch.trim() || 
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.position.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.sector.toLowerCase().includes(userSearch.toLowerCase());
      return matchSector && matchRole && matchSearch;
    });
  }, [users, userSectorFilter, userRoleFilter, userSearch]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return allRequests.filter(r => {
      const matchSector = reqSectorFilter === 'todos' || r.sector === reqSectorFilter;
      const matchStatus = reqStatusFilter === 'todos' || r.purchaseStatus === reqStatusFilter || (reqStatusFilter === 'pendente_gestor' && r.managerApprovalStatus === 'pendente');
      const matchSearch = !reqSearch.trim() ||
        r.title.toLowerCase().includes(reqSearch.toLowerCase()) ||
        r.code.toLowerCase().includes(reqSearch.toLowerCase()) ||
        r.sector.toLowerCase().includes(reqSearch.toLowerCase()) ||
        r.requesterName.toLowerCase().includes(reqSearch.toLowerCase());
      return matchSector && matchStatus && matchSearch;
    });
  }, [allRequests, reqSectorFilter, reqStatusFilter, reqSearch]);

  // Open Create User Modal
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormSector('Produção');
    setFormRole('colaborador');
    setFormPosition('');
    setFormPassword('');
    setFormProjects(['Manutenção/Engenharia']);
    setUserFormError('');
    setShowUserModal(true);
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormSector(user.sector);
    setFormRole(user.role);
    setFormPosition(user.position);
    setFormPassword('');
    setFormProjects(user.allowedProjects && user.allowedProjects.length > 0 ? user.allowedProjects : ['Manutenção/Engenharia']);
    setUserFormError('');
    setShowUserModal(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');

    if (!formName.trim() || !formEmail.trim() || !formPosition.trim()) {
      setUserFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (formProjects.length === 0) {
      setUserFormError('Selecione pelo menos um projeto para o colaborador.');
      return;
    }

    if (editingUser) {
      storage.updateUser(editingUser.id, {
        name: formName.trim(),
        email: formEmail.trim(),
        sector: formSector,
        role: formRole,
        position: formPosition.trim(),
        allowedProjects: formProjects,
        ...(formPassword.trim() ? { password: formPassword.trim() } : {}),
      });
    } else {
      storage.createMasterUser({
        name: formName.trim(),
        email: formEmail.trim(),
        sector: formSector,
        role: formRole,
        position: formPosition.trim(),
        password: formPassword.trim() || '123456',
        allowedProjects: formProjects,
      });
    }

    setShowUserModal(false);
  };

  // Delete User
  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser.id) {
      alert('Você não pode excluir seu próprio usuário Master enquanto estiver logado nele.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o usuário "${user.name}" (${user.sector})?`)) {
      storage.deleteUser(user.id);
    }
  };

  // Delete Request
  const handleDeleteRequest = (req: PurchaseRequest) => {
    if (confirm(`Excluir permanentemente a solicitação ${req.code} ("${req.title}")?`)) {
      storage.deleteRequest(req.id);
    }
  };

  // Limpar todas as solicitações do sistema
  const handleClearAllRequests = async () => {
    if (confirm('ATENÇÃO: Deseja realmente excluir permanentemente TODAS as solicitações do sistema e do banco de dados? Esta ação não pode ser desfeita.')) {
      await storage.clearAllRequests();
    }
  };

  // Export JSON
  const handleExportData = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      users: storage.getUsers(),
      requests: storage.getAllRequests(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-sistema-compras-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Master Developer Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Nível Master / Desenvolvedor
              </span>
              <span className="text-xs text-slate-400">
                Acesso Irrestrito a Todos os Setores e Dados
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Console de Controle Geral do Sistema
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Você possui controle total: crie, edite e gerencie colaboradores de qualquer setor, aprove solicitações como gestor, insira valores de compras e teste qualquer perfil com 1 clique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSmtpModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-xs"
              title="Configuração do Servidor de E-mail (SMTP)"
            >
              <Mail className="w-4 h-4 text-cyan-300" />
              <span>Configuração SMTP</span>
            </button>

            <button
              onClick={() => setActiveTab('aprovadores')}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-xs"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Painel de Aprovadores (Gráficos)</span>
            </button>

            <button
              onClick={handleOpenCreateUser}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Novo Usuário / Colaborador</span>
            </button>

            <button
              onClick={onOpenNewRequest}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Solicitação</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total de Colaboradores
            </span>
            <span className="text-2xl font-black text-white mt-0.5 block">
              {users.length}
            </span>
            <span className="text-[11px] text-slate-400">
              Distribuídos em 10 setores
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Setores Cadastrados
            </span>
            <span className="text-2xl font-black text-white mt-0.5 block">
              10
            </span>
            <span className="text-[11px] text-slate-400">
              9 áreas + Setor de Compras
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total de Solicitações
            </span>
            <span className="text-2xl font-black text-white mt-0.5 block">
              {allRequests.length}
            </span>
            <span className="text-[11px] text-amber-400">
              {pendingApprovalsCount} aguardando gestor
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Gasto Faturado Global
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-0.5 block">
              {formatCurrency(totalGlobalSpent)}
            </span>
            <span className="text-[11px] text-slate-400">
              Total consolidado de compras
            </span>
          </div>

        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          id="tab-aprovadores-dashboard"
          onClick={() => setActiveTab('aprovadores')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'aprovadores'
              ? 'border-purple-600 text-purple-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-purple-600" />
          <span>Alçada de Aprovadores (Gráficos & Esteira)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
            Dashboard
          </span>
        </button>

        <button
          onClick={() => setActiveTab('usuarios')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'usuarios'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Controle de Colaboradores & Usuários</span>
          <span className="text-xs px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('solicitacoes')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'solicitacoes'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Todas as Solicitações (Supervisão Geral)</span>
          <span className="text-xs px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono">
            {allRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('setores')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'setores'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Visão por Setores</span>
        </button>

        <button
          id="tab-controle-versoes"
          onClick={() => setActiveTab('versoes')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'versoes'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Controle de Versões & Homologação</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
            Revisores
          </span>
        </button>

        <button
          onClick={() => setActiveTab('devtools')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'devtools'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Ferramentas Desenvolvedor</span>
        </button>
      </div>

      {/* TAB 0: APPROVERS DASHBOARD & CHARTS */}
      {activeTab === 'aprovadores' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-purple-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs border border-purple-800/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Dashboard Executivo & Esteira de Aprovações
                </h2>
                <p className="text-xs text-purple-200">
                  Ordem de Aprovação: <strong>1º Fernando Silva ➔ 2º Eduardo Costa ➔ 3º Luiz Carlos Martins</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-200 bg-white/10 px-2.5 py-1 rounded-lg border border-purple-300/30 font-medium">
                Console Master Integrado
              </span>
            </div>
          </div>

          <ApproversView
            currentUser={currentUser}
            onSelectRequest={onSelectRequest}
            requestsVersion={requestsVersion}
          />
        </div>
      )}

      {/* TAB 1: USERS & COLLABORATORS */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          
          {/* Filters & Actions */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por nome, email ou cargo..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            {/* Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              
              {/* Sector Filter */}
              <select
                value={userSectorFilter}
                onChange={(e) => setUserSectorFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="todos">Todos os Setores</option>
                <option value="Compras">Compras</option>
                {ALL_SECTORS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="todos">Todos os Papéis</option>
                <option value="gestor">Gestores de Área</option>
                <option value="colaborador">Colaboradores</option>
                <option value="compras">Setor de Compras</option>
                <option value="aprovador">Aprovadores</option>
                <option value="master">Desenvolvedor Master</option>
              </select>

              {/* Add User Button */}
              <button
                onClick={handleOpenCreateUser}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Adicionar Usuário</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Colaborador / E-mail</th>
                    <th className="py-3 px-4">Setor</th>
                    <th className="py-3 px-4">Papel no Sistema</th>
                    <th className="py-3 px-4">Cargo Oficial</th>
                    <th className="py-3 px-4 text-right">Ações Master</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhum colaborador encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const sectorColor = getSectorColor(u.sector);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Name & Email */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              {u.name}
                              {u.role === 'master' && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                                  MASTER
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {u.email}
                            </div>
                            {u.allowedProjects && u.allowedProjects.length > 0 && u.role === 'colaborador' && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {u.allowedProjects.map(p => (
                                  <span key={p} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Sector Badge */}
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sectorColor.badge}`}>
                              {u.sector}
                            </span>
                          </td>

                          {/* Role */}
                          <td className="py-3 px-4">
                            {u.role === 'gestor' && (
                              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold text-[11px] inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Gestor Responsável
                              </span>
                            )}
                            {u.role === 'compras' && (
                              <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-semibold text-[11px] inline-flex items-center gap-1">
                                <ShoppingBag className="w-3 h-3" /> Setor de Compras
                              </span>
                            )}
                            {u.role === 'colaborador' && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                                Colaborador
                              </span>
                            )}
                            {u.role === 'aprovador' && (
                              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold text-[11px] inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Aprovador
                              </span>
                            )}
                            {u.role === 'master' && (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                                Desenvolvedor Master
                              </span>
                            )}
                          </td>

                          {/* Position */}
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {u.position}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              {/* Impersonate */}
                              <button
                                onClick={() => onImpersonateUser(u)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                title="Entrar no sistema com este perfil para testar"
                              >
                                <LogIn className="w-3 h-3 text-indigo-600" />
                                <span>Acessar</span>
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar dados do colaborador"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => {
                                  const newPass = prompt(`Redefinir senha de ${u.name}:`, '123456');
                                  if (newPass && newPass.trim()) {
                                    storage.updateUserPassword(u.id, newPass.trim());
                                    alert(`Senha do colaborador ${u.name} redefinida com sucesso para: "${newPass.trim()}"`);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Redefinir senha de acesso"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              {u.id !== currentUser.id && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Excluir colaborador"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SUPERVISION OF ALL REQUESTS */}
      {activeTab === 'solicitacoes' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={reqSearch}
                onChange={(e) => setReqSearch(e.target.value)}
                placeholder="Buscar solicitação, código ou setor..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Sector */}
              <select
                value={reqSectorFilter}
                onChange={(e) => setReqSectorFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="todos">Todos os Setores</option>
                {ALL_SECTORS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Status */}
              <select
                value={reqStatusFilter}
                onChange={(e) => setReqStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="todos">Todos os Status</option>
                <option value="pendente_gestor">Aguardando Aprovação do Gerente</option>
                <option value="recebido_em_compras">Recebido em Compras</option>
                <option value="em_cotacao">Em Cotação</option>
                <option value="pedido_emitido">Pedido Emitido</option>
                <option value="compra_realizada">Compra Realizada</option>
                <option value="entregue">Entregue no Setor</option>
              </select>

              {allRequests.length > 0 && (
                <button
                  onClick={handleClearAllRequests}
                  className="px-3 py-1.5 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Excluir permanentemente todas as solicitações cadastradas"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Limpar Todas ({allRequests.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* List of Requests */}
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                Nenhuma solicitação encontrada com estes critérios.
              </div>
            ) : (
              filteredRequests.map((req) => {
                const sectorColor = getSectorColor(req.sector);
                const statusInfo = getPurchaseStatusInfo(req.purchaseStatus);
                const approvalInfo = getManagerApprovalInfo(req.managerApprovalStatus);
                const latestStatus = getLatestRequestStatusInfo(req);
                const hasPrice = req.totalPrice !== undefined && req.totalPrice > 0;

                return (
                  <div
                    key={req.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                            {req.code}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${sectorColor.badge}`}>
                            Setor: {req.sector}
                          </span>
                          {req.project && (
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${getProjectColor(req.project).badge}`}>
                              {req.project}
                            </span>
                          )}
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border ${latestStatus.badgeClass}`}>
                            {latestStatus.label}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • Solicitante: <strong>{req.requesterName}</strong> ({formatDate(req.createdAt)})
                          </span>
                        </div>

                        <h3 
                          onClick={() => onSelectRequest(req)}
                          className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {req.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {req.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                          <span>Qtd: <strong className="text-slate-800">{req.quantity} {req.unit}</strong></span>
                          <span>Prioridade: <strong className="text-slate-800 capitalize">{req.priority}</strong></span>
                          {req.supplier && <span>Fornecedor: <strong className="text-slate-800">{req.supplier}</strong></span>}
                        </div>
                      </div>

                      {/* Right: Price & Master Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                            Valor Faturado
                          </span>
                          {hasPrice ? (
                            <span className="text-lg font-extrabold text-emerald-800">
                              {formatCurrency(req.totalPrice)}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Sem valor definido
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* 1-Click Master Approve if Pending */}
                          {req.managerApprovalStatus === 'pendente' && (
                            <button
                              onClick={() => storage.approveRequestByManager(req.id, currentUser)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Aprovar como Master"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Aprovar
                            </button>
                          )}

                          {/* Open Manage Order (Set Price) */}
                          <button
                            onClick={() => onOpenManageOrder(req)}
                            className="px-2.5 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Definir Valor e Status de Compras"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Preço / OC
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => onSelectRequest(req)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          {/* Delete Request */}
                          <button
                            onClick={() => handleDeleteRequest(req)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir solicitação permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* TAB 3: SECTOR BREAKDOWN */}
      {activeTab === 'setores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_SECTORS.map((sec) => {
            const secUsers = users.filter(u => u.sector === sec);
            const secRequests = allRequests.filter(r => r.sector === sec);
            const secSpent = secRequests.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
            const secManager = secUsers.find(u => u.role === 'gestor');
            const secColor = getSectorColor(sec);

            return (
              <div key={sec} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${secColor.badge}`}>
                    {sec}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {secUsers.length} membro(s)
                  </span>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Gestor Responsável:
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {secManager ? secManager.name : 'Nenhum gestor atribuído'}
                  </div>
                  {secManager && (
                    <div className="text-xs text-slate-500">
                      {secManager.email}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Solicitações</span>
                    <span className="text-base font-extrabold text-slate-800">{secRequests.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Gasto Faturado</span>
                    <span className="text-base font-extrabold text-emerald-800">{formatCurrency(secSpent)}</span>
                  </div>
                </div>

                {secManager && (
                  <button
                    onClick={() => onImpersonateUser(secManager)}
                    className="w-full py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Entrar como Gestor de {sec}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: DEVELOPER TOOLS */}
      {activeTab === 'devtools' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Ferramentas de Manutenção & Banco de Dados Local
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Utilitários para backup, restauração de estado e testes rápidos de novas funcionalidades.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Export JSON */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Exportar Dados (Backup JSON)</span>
              </div>
              <p className="text-xs text-slate-600">
                Baixe um arquivo JSON contendo todos os usuários, papéis, solicitações e valores faturados cadastrados.
              </p>
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Arquivo JSON
              </button>
            </div>

            {/* Limpar Todas as Solicitações */}
            <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-950 font-bold text-sm">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Limpar Banco de Solicitações</span>
              </div>
              <p className="text-xs text-rose-800">
                Remove permanentemente todas as solicitações cadastradas no sistema e no banco de dados ({allRequests.length} no total).
              </p>
              <button
                onClick={handleClearAllRequests}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Todas as Solicitações
              </button>
            </div>

            {/* Reset Data */}
            <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-950 font-bold text-sm">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Restaurar Dados de Fábrica</span>
              </div>
              <p className="text-xs text-rose-800">
                Restaura os gestores iniciais dos 9 setores, equipe de compras e solicitações de exemplo pré-configuradas.
              </p>
              <button
                onClick={() => {
                  if (confirm('Deseja restaurar todos os dados para o padrão inicial?')) {
                    storage.resetData();
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Dados Iniciais
              </button>
            </div>

            {/* Teste de E-mails Automáticos */}
            <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 space-y-3 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Disparo de E-mails Automáticos (Teste de Todas as Etapas)</span>
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                  SMTP CapRover
                </span>
              </div>
              <p className="text-xs text-blue-800">
                Dispara em sequência todos os modelos de e-mail (Gestor da Área, Compras e Aprovadores da Diretoria) para verificar a entrega direta no e-mail configurado.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowSmtpModal(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-300" />
                  Configurar Servidor SMTP
                </button>
                <button
                  onClick={handleTriggerTestEmails}
                  disabled={emailTestLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  {emailTestLoading ? 'Disparando E-mails...' : 'Disparar E-mails de Teste para apongeluppi@ctdi.com'}
                </button>
              </div>
              {emailTestFeedback && (
                <div className={`p-2.5 rounded-lg text-xs font-medium ${emailTestFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                  {emailTestFeedback.message}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB 5: CONTROLE DE VERSÕES & REVISORES */}
      {activeTab === 'versoes' && (
        <VersionControlPanel 
          currentUser={currentUser} 
          onVersionUpdated={() => {
            // Can trigger requests or versions updates
          }} 
        />
      )}

      {/* CREATE / EDIT USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            
            <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-300" />
                <h3 className="text-base font-bold">
                  {editingUser ? 'Editar Colaborador' : 'Adicionar Novo Usuário (Master)'}
                </h3>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-indigo-300 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              
              {userFormError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium border border-rose-200">
                  {userFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ex: João Silva"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail Corporativo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="ex: joao.silva@empresa.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Setor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value as SectorType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Compras">Compras</option>
                    {ALL_SECTORS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Papel no Sistema <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium"
                  >
                    <option value="colaborador">Colaborador</option>
                    <option value="gestor">Gestor do Setor</option>
                    <option value="compras">Setor de Compras</option>
                    <option value="aprovador">Aprovador</option>
                    <option value="master">Desenvolvedor Master</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Cargo / Função <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                  placeholder="ex: Engenheiro Mecânico, Analista Fiscal Pleno..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Senha de Acesso {editingUser ? '(deixe em branco para manter atual)' : '(padrão: 123456)'}
                </label>
                <input
                  type="text"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? 'Manter senha atual' : '123456'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Projetos Autorizados para Compra <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {ALL_PROJECTS.map((proj) => {
                    const isChecked = formProjects.includes(proj);
                    return (
                      <button
                        key={proj}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setFormProjects(prev => prev.filter(p => p !== proj));
                          } else {
                            setFormProjects(prev => [...prev, proj]);
                          }
                        }}
                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer text-left ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <span className="truncate">{proj}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {editingUser ? 'Salvar Alterações' : 'Criar Colaborador'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* SMTP CONFIGURATION MODAL */}
      <SmtpConfigModal 
        isOpen={showSmtpModal} 
        onClose={() => setShowSmtpModal(false)} 
      />

    </div>
  );
};
