import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Sparkles, 
  ExternalLink, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  ShoppingBag, 
  FileText, 
  X, 
  Volume2,
  Laptop
} from 'lucide-react';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  read: boolean;
  type: 'request' | 'approval' | 'purchasing' | 'rejected' | 'info';
  requestCode?: string;
}

// Sintetiza um som discreto e agradável de ping/chime corporativo usando Web Audio API
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Acorde agradável D5 -> A5
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.38);
  } catch {
    // Navegador pode bloquear áudio antes de interação do usuário
  }
}

// Dispara a Notificação Nativa do Navegador (Toast do Windows 11 / Chrome via Service Worker)
export async function sendDesktopNotification(
  title: string, 
  options?: NotificationOptions & { actions?: Array<{ action: string; title: string }> }
) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, error: 'Este navegador não suporta notificações de desktop.' };
  }

  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }

  if (perm !== 'granted') {
    return { ok: false, error: 'Permissão de notificação negada no navegador. Habilite nas permissões do site.' };
  }

  const defaultOptions: any = {
    icon: '/nexus-logo.png',
    badge: '/nexus-logo.png',
    requireInteraction: true, // Mantém o balão do Windows 11 fixo até o usuário clicar ou fechar
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: '🔍 Abrir no Nexus' },
      { action: 'close', title: 'Dispensar' },
    ],
    ...options,
  };

  // 1. Tentar via Service Worker (Formato nativo do Windows 11 no Chrome com botões de ação)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return { ok: true };
      }
    } catch (swErr) {
      console.warn('[SW showNotification fallback]', swErr);
    }
  }

  // 2. Fallback direto se o Service Worker não estiver pronto
  try {
    const notif = new Notification(title, defaultOptions);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [activeToast, setActiveToast] = useState<SystemNotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lista inicial de notificações de exemplo
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: 'notif-1',
      title: 'Nova Solicitação Criada',
      message: 'Roberto Albuquerque (TI) enviou a solicitação S00012: Servidor Dell PowerEdge R660xs.',
      time: 'Há 5 min',
      timestamp: Date.now() - 5 * 60 * 1000,
      read: false,
      type: 'request',
      requestCode: 'S00012',
    },
    {
      id: 'notif-2',
      title: 'Aprovado pelo Gestor da Área',
      message: 'Marcelo Santos (TI) aprovou com prioridade alta a solicitação S00012. Aguardando cotação de compras.',
      time: 'Há 25 min',
      timestamp: Date.now() - 25 * 60 * 1000,
      read: false,
      type: 'approval',
      requestCode: 'S00012',
    },
    {
      id: 'notif-3',
      title: 'Proposta Comercial Submetida',
      message: 'Compras formalizou cotação homologada com a Dell no valor de R$ 48.750,00.',
      time: 'Há 1 hora',
      timestamp: Date.now() - 60 * 60 * 1000,
      read: true,
      type: 'purchasing',
      requestCode: 'S00012',
    },
    {
      id: 'notif-4',
      title: 'Pedido 100% Aprovado pela Diretoria',
      message: 'A alçada executiva (Fernando -> Eduardo -> Luiz) aprovou o pedido S00010. Liberado para compra.',
      time: 'Há 3 horas',
      timestamp: Date.now() - 3 * 60 * 60 * 1000,
      read: true,
      type: 'approval',
      requestCode: 'S00010',
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Registrar Service Worker no carregamento para habilitar Toast Nativo do Windows 11
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('[SW Registration Error]', err);
      });
    }
  }, []);

  // Atualizar permissão atual
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, [isOpen]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Função para solicitar permissão de notificações do navegador
  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não oferece suporte a notificações nativas.');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      triggerTestNotification('request');
    }
  };

  // Função para disparar uma notificação de teste completa (Sininho + Toast + Desktop Windows)
  const triggerTestNotification = (type: 'request' | 'approval' | 'purchasing') => {
    playNotificationSound();

    let newNotif: SystemNotification;
    if (type === 'request') {
      newNotif = {
        id: `notif-${Date.now()}`,
        title: '⚡ Nova Solicitação Criada',
        message: 'Roberto Albuquerque cadastrou a solicitação S00012 (Servidor Dell PowerEdge R660xs).',
        time: 'Agora mesmo',
        timestamp: Date.now(),
        read: false,
        type: 'request',
        requestCode: 'S00012',
      };
    } else if (type === 'approval') {
      newNotif = {
        id: `notif-${Date.now()}`,
        title: '✅ Pedido 100% Aprovado!',
        message: 'Diretoria Executiva (CEO) concluiu a aprovação do pedido S00012. Liberado para Compra!',
        time: 'Agora mesmo',
        timestamp: Date.now(),
        read: false,
        type: 'approval',
        requestCode: 'S00012',
      };
    } else {
      newNotif = {
        id: `notif-${Date.now()}`,
        title: '📦 Cotação Pronta em Compras',
        message: 'Alexandre Fontes inseriu 3 orçamentos para análise na solicitação S00012.',
        time: 'Agora mesmo',
        timestamp: Date.now(),
        read: false,
        type: 'purchasing',
        requestCode: 'S00012',
      };
    }

    // 1. Adiciona na lista do sininho
    setNotifications(prev => [newNotif, ...prev]);

    // 2. Mostra toast animado na tela
    setActiveToast(newNotif);
    setTimeout(() => {
      setActiveToast(current => (current?.id === newNotif.id ? null : current));
    }, 6000);

    // 3. Dispara a notificação de desktop nativa do Windows (Toast do Windows 11)
    if (typeof Notification !== 'undefined') {
      sendDesktopNotification(`Nexus CTDI: ${newNotif.title}`, {
        body: newNotif.message,
        tag: newNotif.id,
      });
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const getIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'request':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'approval':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'purchasing':
        return <ShoppingBag className="w-4 h-4 text-amber-600" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <>
      {/* Toast Flutuante no Canto Superior Direito */}
      {activeToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              {getIcon(activeToast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {activeToast.title}
                </h4>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 -m-1 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                {activeToast.message}
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                <span className="flex items-center gap-1 font-medium text-indigo-600">
                  <Volume2 className="w-3 h-3" /> Alerta Nexus
                </span>
                <span>{activeToast.time}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão do Sininho no Navbar */}
      <div className="relative" ref={dropdownRef}>
        <button
          id="navbar-notifications-btn"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            isOpen 
              ? 'bg-indigo-50 text-indigo-600 shadow-xs ring-2 ring-indigo-500/20' 
              : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100/80'
          }`}
          title="Central de Notificações"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5 transition-transform group-hover:scale-105" />
          
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Painel Dropdown das Notificações */}
        {isOpen && (
          <div className="absolute right-0 mt-2.5 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Cabeçalho */}
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Notificações
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
                  </span>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar como lidas
                </button>
              )}
            </div>

            {/* Card de Configuração de Desktop / Navegador */}
            <div className="p-3.5 bg-indigo-50/50 border-b border-indigo-100/70">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <span>Notificações no Windows / Desktop</span>
                      {permission === 'granted' ? (
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full border border-emerald-200">
                          Ativo
                        </span>
                      ) : permission === 'denied' ? (
                        <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full border border-rose-200">
                          Bloqueado
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full border border-amber-200">
                          Pendente
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-indigo-800/80 mt-0.5">
                      {permission === 'granted'
                        ? 'Você receberá avisos sonoros e pop-ups do Windows ao receber solicitações.'
                        : 'Ative para receber pop-ups no Windows mesmo com outra tela aberta.'}
                    </p>
                  </div>
                </div>

                {permission !== 'granted' && (
                  <button
                    onClick={handleRequestPermission}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    Ativar
                  </button>
                )}
              </div>

              {/* Barra de Ações de Teste */}
              <div className="mt-2.5 pt-2 border-t border-indigo-100/80 flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 shrink-0">
                  Testar:
                </span>
                <button
                  onClick={() => triggerTestNotification('request')}
                  className="flex-1 px-2 py-1 bg-white hover:bg-indigo-100/80 border border-indigo-200 rounded text-[11px] font-semibold text-indigo-950 transition-colors cursor-pointer text-center"
                >
                  ⚡ Nova Solicitação
                </button>
                <button
                  onClick={() => triggerTestNotification('approval')}
                  className="flex-1 px-2 py-1 bg-white hover:bg-emerald-100/80 border border-emerald-200 rounded text-[11px] font-semibold text-emerald-950 transition-colors cursor-pointer text-center"
                >
                  ✅ Aprovação 100%
                </button>
              </div>
            </div>

            {/* Lista das Notificações */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhuma notificação no momento.
                </div>
              ) : (
                notifications.map(item => (
                  <div
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 ${
                      !item.read ? 'bg-indigo-50/20' : 'opacity-85'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs ${!item.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {item.title}
                        </span>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Rodapé Informativo */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Alertas em tempo real com som e push de desktop
              </span>
            </div>

          </div>
        )}
      </div>
    </>
  );
};
