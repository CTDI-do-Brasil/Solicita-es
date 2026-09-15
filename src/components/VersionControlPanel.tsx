import React, { useState } from 'react';
import { AppVersionRelease, VersionReviewer, User } from '../types';
import { storage } from '../storage';
import { 
  GitBranch, 
  CheckCircle2, 
  Clock, 
  Send, 
  ShieldCheck, 
  AlertTriangle, 
  Tag, 
  UserCheck, 
  FileCode2, 
  Radio, 
  ExternalLink,
  Sparkles,
  Info,
  Check,
  XCircle,
  Plus
} from 'lucide-react';

interface VersionControlPanelProps {
  currentUser: User;
  onVersionUpdated?: () => void;
}

export const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
  currentUser,
  onVersionUpdated
}) => {
  const [versions, setVersions] = useState<AppVersionRelease[]>(() => storage.getVersions());
  const reviewers = storage.getReviewers();
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>(reviewers[0]?.id || '');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);

  const isMaster = currentUser.role === 'master';

  const refreshVersions = () => {
    const updated = storage.getVersions();
    setVersions(updated);
    if (onVersionUpdated) onVersionUpdated();
  };

  const showToast = (type: 'success' | 'warning' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Revisor action: Approving a version
  const handleReviewerApprove = (version: AppVersionRelease) => {
    const reviewer = reviewers.find(r => r.id === selectedReviewerId) || reviewers[0];
    if (!reviewer) {
      showToast('warning', 'Selecione um revisor credenciado.');
      return;
    }

    const success = storage.approveVersionByReviewer(
      version.id, 
      reviewer, 
      approvalNotes || `Aprovado por ${reviewer.name} após verificação e testes de homologação.`
    );

    if (success) {
      refreshVersions();
      setApprovalNotes('');
      showToast('success', `Versão ${version.version} foi APROVADA com sucesso pelo revisor ${reviewer.name}! Agora ela está pronta para divulgação.`);
    }
  };

  // Broadcast / Publish action (Divulgar Aprovação)
  const handlePublishRelease = (version: AppVersionRelease) => {
    if (version.status !== 'aprovado') {
      showToast('warning', 'Apenas versões aprovadas por um Revisor credenciado podem ser divulgadas.');
      return;
    }

    const publisher = isMaster ? currentUser.name : `${currentUser.name} (${currentUser.position})`;
    const success = storage.publishVersion(version.id, publisher);

    if (success) {
      refreshVersions();
      showToast('success', `Versão ${version.version} DIVULGADA com sucesso para toda a organização!`);
    }
  };

  const pendingRevisions = versions.filter(v => v.status === 'em_revisao');
  const approvedReleases = versions.filter(v => v.status === 'aprovado');
  const publishedReleases = versions.filter(v => v.status === 'divulgado');

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : toastMessage.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-indigo-50 border-indigo-300 text-indigo-900'
        }`}>
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-5 h-5 text-indigo-600 shrink-0" />}
            <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                Governança & Controle de Versões
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Somente Revisores Aprovam
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Aprovação & Divulgação de Releases
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Ambiente de auditoria e liberação de software. Por conformidade de governança, 
              <strong> somente os revisores técnicos credenciados</strong> têm autoridade para aprovar as versões antes de sua divulgação formal para as áreas operacionais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10 text-right">
              <span className="text-[10px] uppercase font-bold text-indigo-200 block">Status da Release Atual</span>
              <span className="text-sm font-black text-amber-300 flex items-center justify-end gap-1.5 mt-0.5">
                <Tag className="w-3.5 h-3.5" />
                {versions[0]?.version ? `${versions[0].version} (${versions[0].title.split(' - ')[1] || 'Ativa'})` : 'v1.5.0 (Solicitação em Atraso 48h)'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Em Revisão Técnica
            </span>
            <span className="text-2xl font-black text-amber-400 mt-0.5 block">
              {pendingRevisions.length}
            </span>
            <span className="text-[11px] text-slate-400">
              Aguardando parecer de revisores
            </span>
          </div>

          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Aprovadas pelos Revisores
            </span>
            <span className="text-2xl font-black text-indigo-400 mt-0.5 block">
              {approvedReleases.length}
            </span>
            <span className="text-[11px] text-indigo-300">
              Prontas para divulgação geral
            </span>
          </div>

          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Divulgadas & em Produção
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-0.5 block">
              {publishedReleases.length}
            </span>
            <span className="text-[11px] text-slate-400">
              Disponíveis para todos os setores
            </span>
          </div>
        </div>
      </div>

      {/* Reviewer Credential Box (Regra: Somente os Revisores Aprovam) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Comitê de Homologação: Revisores Credenciados
              </h2>
              <p className="text-xs text-slate-500">
                Selecione a identidade do revisor responsável para emitir a aprovação técnica formal
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Regra Ativa: Somente Revisores Aprovam
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reviewers.map(rev => {
            const isSelected = selectedReviewerId === rev.id;
            return (
              <div
                key={rev.id}
                onClick={() => setSelectedReviewerId(rev.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200 shadow-2xs' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {rev.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{rev.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded">
                        REVISOR
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{rev.position}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{rev.email}</p>
                  </div>
                </div>

                <div className="mt-1">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* List of Releases & Approval Actions */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-indigo-600" />
          <span>Fila de Versões & Status de Homologação</span>
        </h2>

        {versions.map(ver => {
          const isPending = ver.status === 'em_revisao';
          const isApproved = ver.status === 'aprovado';
          const isPublished = ver.status === 'divulgado';

          return (
            <div 
              key={ver.id}
              className={`bg-white rounded-2xl border transition-all p-5 shadow-xs space-y-4 ${
                isPublished 
                  ? 'border-emerald-200 ring-1 ring-emerald-100' 
                  : isApproved
                    ? 'border-indigo-300 ring-2 ring-indigo-100'
                    : 'border-amber-300 ring-2 ring-amber-100'
              }`}
            >
              {/* Release Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-slate-900 text-white text-xs font-black rounded-lg font-mono tracking-wide">
                    {ver.version}
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {ver.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Criada por <strong>{ver.createdBy}</strong> em {new Date(ver.createdAt).toLocaleDateString('pt-BR')} às {new Date(ver.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  {isPending && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5 animate-pulse">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Aguardando Aprovação do Revisor
                    </span>
                  )}
                  {isApproved && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                      Aprovado por Revisor • Pronto para Divulgar
                    </span>
                  )}
                  {isPublished && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-600" />
                      Versão Divulgada & Oficializada
                    </span>
                  )}
                </div>
              </div>

              {/* Description & Changelog */}
              <div className="space-y-2.5">
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {ver.description}
                </p>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Alterações Inclusas no Release (Changelog):
                  </span>
                  <ul className="space-y-1.5">
                    {ver.changelog.map((item, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Audit Trail: Who approved & when */}
              {ver.approvedByReviewerName && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-indigo-950">
                    <ShieldCheck className="w-4 h-4 text-indigo-700" />
                    <span>Aprovação Emitida por Revisor Credenciado:</span>
                  </div>
                  <p className="text-indigo-900">
                    <strong>{ver.approvedByReviewerName}</strong> em {new Date(ver.approvedAt || '').toLocaleString('pt-BR')}
                  </p>
                  {ver.reviewerNotes && (
                    <p className="text-[11px] text-indigo-800 italic mt-0.5">
                      &quot;{ver.reviewerNotes}&quot;
                    </p>
                  )}
                </div>
              )}

              {/* Publication details */}
              {ver.publishedAt && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Divulgação oficial realizada por <strong>{ver.publishedBy}</strong> em {new Date(ver.publishedAt).toLocaleString('pt-BR')}.
                  </span>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Left side notes or status */}
                <div className="text-xs text-slate-500">
                  {isPending && (
                    <span className="text-amber-800 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Apenas o revisor selecionado pode aprovar esta versão.
                    </span>
                  )}
                  {isApproved && (
                    <span className="text-indigo-800 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      Aprovada pelo Revisor. Clique em &quot;Divulgar Aprovação&quot; para publicar.
                    </span>
                  )}
                  {isPublished && (
                    <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Status final: Versão ativa e homologada.
                    </span>
                  )}
                </div>

                {/* Right side Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Step 1: SOMENTE OS REVISORES APROVAM */}
                  {isPending && (
                    <button
                      onClick={() => handleReviewerApprove(ver)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-950" />
                      <span>Aprovar como Revisor ({reviewers.find(r => r.id === selectedReviewerId)?.name.split(' ')[0] || 'Revisor'})</span>
                    </button>
                  )}

                  {/* Step 2: DIVULGUE A APROVAÇÃO */}
                  {isApproved && (
                    <button
                      onClick={() => handlePublishRelease(ver)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 animate-bounce hover:animate-none"
                    >
                      <Radio className="w-4 h-4" />
                      <span>Divulgar a Aprovação da Versão</span>
                    </button>
                  )}

                  {/* If already published, offer option to view details */}
                  {isPublished && (
                    <div className="px-3 py-1.5 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Aprovação Divulgada</span>
                    </div>
                  )}

                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
