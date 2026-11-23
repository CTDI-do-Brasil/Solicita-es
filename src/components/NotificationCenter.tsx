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

// Dispara a Notificação Nativa do Navegador (Toast do Windows 11 / Google Chrome)
export async function sendDesktopNotification(
  title: string, 
  options?: { body?: string; tag?: string; icon?: string }
): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[Desktop Notification] API Notification não suportada pelo navegador.');
    return { ok: false, error: 'Este navegador não oferece suporte a notificações nativas de desktop.' };
  }

  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }

  if (perm !== 'granted') {
    console.warn('[Desktop Notification] Permissão negada ou não concedida:', perm);
    return { ok: false, error: 'Permissão de notificação negada no navegador. Habilite nas permissões do site (ícone ao lado da URL).' };
  }

  const iconUrl = options?.icon || `${window.location.origin}/ctdi-logo.png`;
  const bodyText = options?.body || '';
  const notifTag = options?.tag || `nexus-${Date.now()}`;

  let triggered = false;

  // 1. DISPARO NATIVO DIRETO: new Notification()
  // No Google Chrome Desktop (Windows 10/11), o construtor Notification() dispara
  // INSTANTANEAMENTE o pop-up nativo do Windows no canto inferior direito da tela.
  // IMPORTANTE: NÃO PODE conter a propriedade 'actions' no objeto, pois no Chrome lança TypeError!
  try {
    const directNotif = new Notification(title, {
      body: bodyText,
      icon: iconUrl,
      tag: notifTag,
    });
    directNotif.onclick = () => {
      window.focus();
      try { directNotif.close(); } catch {}
    };
    triggered = true;
    console.log('[Desktop Notification] Sucesso via new Notification() nativo do Chrome.');
  } catch (err: any) {
    console.warn('[Desktop Notification] Falha ao instanciar new Notification():', err);
  }

  // 2. Se houver Service Worker ativo, dispara também via showNotification (persistente)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active && reg.showNotification) {
        await reg.showNotification(title, {
          body: bodyText,
          icon: iconUrl,
          badge: iconUrl,
          tag: notifTag,
        });
        triggered = true;
        console.log('[Desktop Notification] Sucesso via ServiceWorkerRegistration.showNotification().');
      }
    } catch (swErr) {
      console.warn('[Desktop Notification] Falha no Service Worker:', swErr);
    }
  }

  return { ok: triggered, error: triggered ? undefined : 'Não foi possível exibir a notificação nativa.' };
}

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
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

    // 2. Dispara a notificação de desktop nativa do Windows (Toast do Chrome)
    sendDesktopNotification(newNotif.title, {
      body: newNotif.message,
      tag: newNotif.id,
    });
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
                  <h3 className="text-sm font-bold text-slate-900 leading-tight" translate="no">
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
