import React, { useState, useEffect } from 'react';
import { 
  Server, 
  X, 
  Send, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  EyeOff, 
  Mail,
  HelpCircle
} from 'lucide-react';

interface SmtpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmtpConfigModal: React.FC<SmtpConfigModalProps> = ({ isOpen, onClose }) => {
  const [enabled, setEnabled] = useState(true);
  const [host, setHost] = useState('mail.ctdibrasil.com.br');
  const [port, setPort] = useState(587);
  const [user, setUser] = useState('nexus@ctdibrasil.com.br');
  const [pass, setPass] = useState('');
  const [from, setFrom] = useState('Nexus CTDI <nexus@ctdibrasil.com.br>');
  const [testRecipient, setTestRecipient] = useState('apongeluppi@ctdi.com');
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; details?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoadingConfig(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/smtp-config');
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled !== false);
        if (data.host) setHost(data.host);
        if (data.port) setPort(data.port);
        if (data.user) setUser(data.user);
        if (data.from) setFrom(data.from);
        if (data.testRecipient) setTestRecipient(data.testRecipient);
        setHasStoredPassword(Boolean(data.hasPassword));
      }
    } catch (err: any) {
      console.warn('Não foi possível carregar configurações do SMTP do backend:', err.message);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload: any = {
        enabled,
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        user,
        from,
        testRecipient,
      };

      if (pass.trim()) {
        payload.pass = pass.trim();
      }

      const res = await fetch('/api/smtp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: data.message || 'Configurações SMTP salvas com sucesso no banco de dados!',
        });
        if (pass.trim()) {
          setHasStoredPassword(true);
          setPass('');
        }
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Erro ao salvar configurações.',
          details: data.details,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Falha de comunicação ao salvar: ' + err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const payload: any = {
        enabled,
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        user,
        from,
        testRecipient,
      };

      if (pass.trim()) {
        payload.pass = pass.trim();
      }

      const res = await fetch('/api/smtp-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || 'Conexão estabelecida e e-mail de teste enviado com sucesso!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Falha no teste do servidor SMTP.',
          details: data.details ? (typeof data.details === 'object' ? JSON.stringify(data.details, null, 2) : String(data.details)) : undefined,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Erro ao executar teste de conexão: ' + err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Superior Azul Marinho */}
        <div className="px-5 py-4 bg-[#002d5b] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl text-cyan-400 border border-white/10">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Configuração do Servidor de E-mail (SMTP)
              </h3>
              <p className="text-xs text-blue-200">
                Parâmetros de conexão para envio automático das notificações de solicitações
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {loadingConfig ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Carregando configurações ativas...</span>
            </div>
          ) : (
            <>
              {/* Card 1: Habilitar Disparo */}
              <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Habilitar Disparo Externo via Servidor SMTP
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quando ativo, envia as notificações diretamente para a caixa de entrada dos destinatários
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    enabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Card 2: Guia Rápido CapRover / Poste.io */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Guia Rápido CapRover / Poste.io (<span className="text-blue-700 underline">mail.ctdibrasil.com.br</span>):</span>
                </div>
                <p className="text-slate-600">
                  • <strong>Host SMTP:</strong> Use <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px] border border-slate-300">mail.ctdibrasil.com.br</code> (ou o nome interno do container no CapRover, ex: <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px] border border-slate-300">srv-captain--mailserver</code> ou <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px] border border-slate-300">srv-captain--mail</code>).
                </p>
                <p className="text-slate-600">
                  • <strong>Porta:</strong> <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px] border border-slate-300">587</code> (STARTTLS) ou <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px] border border-slate-300">25</code> (comunicação interna entre containers no CapRover).
                </p>
              </div>

              {/* Linha 1: Host e Porta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Host / Servidor SMTP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="mail.ctdibrasil.com.br"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Porta SMTP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    placeholder="587"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                    required
                  />
                </div>
              </div>

              {/* Linha 2: Usuário e Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuário / E-mail da Conta (Poste.io)
                  </label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="nexus@ctdibrasil.com.br"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Senha da Conta de E-mail
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      placeholder={hasStoredPassword ? '•••••••• (senha mantida)' : 'Senha criada no painel do Poste.io'}
                      className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title={showPassword ? 'Ocultar' : 'Exibir'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Linha 3: Remetente From */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome e E-mail do Remetente (From)
                </label>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="Nexus CTDI <nexus@ctdibrasil.com.br>"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              {/* Card 3: Destinatário de Teste / Override (Box Ciano) */}
              <div className="border-2 border-cyan-400 bg-cyan-50/20 rounded-xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-cyan-950">
                  E-mail Destinatário (Para qual e-mail enviar o teste e os alertas) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="apongeluppi@ctdi.com"
                  className="w-full px-3 py-2 border border-cyan-400 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-cyan-500 outline-hidden"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  O e-mail de teste e as notificações serão enviados para este endereço.
                </p>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div className={`p-3 rounded-xl border text-xs leading-relaxed animate-in fade-in ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  <div className="flex items-start gap-2">
                    {feedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-semibold">{feedback.message}</p>
                      {feedback.details && (
                        <pre className="mt-1 p-2 bg-white/70 rounded text-[11px] font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
                          {feedback.details}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Rodapé com Ações */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || saving || loadingConfig}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Testando & Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Testar Conexão & Enviar E-mail</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || testing}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || testing || loadingConfig}
              className="px-4 py-2 bg-[#002d5b] hover:bg-[#002040] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Configurações SMTP</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
