<<<<<<< HEAD
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, X, AlertCircle, CheckCircle, Info, Clock, Loader2 } from 'lucide-react';
import { notificationsService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface UINotification {
=======
import React, { useState } from 'react';
import { Bell, X, AlertCircle, CheckCircle, Info, Clock } from 'lucide-react';

interface Notification {
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
<<<<<<< HEAD
  time: string; // humanized from createdAt
  read: boolean;
  createdAtTs?: number;
=======
  time: string;
  read: boolean;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
<<<<<<< HEAD
  const [notifications, setNotifications] = useState<UINotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');
  const navigate = useNavigate();

  // Evita estouro de requisições: bloqueia concorrência e aplica intervalo mínimo
  const loadingRef = useRef(false);
  const lastLoadRef = useRef(0);
  const MIN_INTERVAL_MS = 2000; // 2s entre cargas

  const load = async (p = 1) => {
    const now = Date.now();
    if (loadingRef.current) return; // já está carregando
    if (now - lastLoadRef.current < MIN_INTERVAL_MS) return; // respeita intervalo mínimo
    loadingRef.current = true;
    try {
      setLoading(true);
      const params: any = { page: p, limit: 50 };
      if (activeTab === 'unread') params.unread_only = true;
      if (activeTab === 'read') params.read_only = true;
      const { notifications: list, pagination } = await notificationsService.getAll(params);
      const mapped: UINotification[] = (list || []).map((n: any) => ({
        id: String(n._id || n.id),
        type: (n.type || 'info') as any,
        title: n.title || '',
        message: n.message || '',
        read: Boolean(n.read),
        time: formatRelativeTime(n.createdAt || n.created_at),
        createdAtTs: n.createdAt ? new Date(n.createdAt).getTime() : (n.created_at ? new Date(n.created_at).getTime() : undefined),
      }));
      // Filtra: na prática, não filtramos nada aqui para evitar sumiço/reaparecimento.
      // Mostramos exatamente o que a API retorna para a aba ativa.
      const filtered = mapped.filter((_n) => {
        const onUnreadTab = activeTab === 'unread';
        if (!onUnreadTab) return true; // em 'Lidos' não filtra
        // Unread: manter a exibição ampla (já removemos janelas antes), então não filtrar também
        // Caso queira reintroduzir alguma lógica específica para 'Não lidos', faça aqui.
        return true;
      });
      // Deduplica por conteúdo normalizado, preservando código de produto (PRD1234) quando existir
      const extractProductCode = (s: string) => {
        const m = (s || '').match(/\(PRD\d+\)/i);
        return m ? m[0].toUpperCase() : '';
      };

      const extractOrderNumber = (s: string) => {
        const m = (s || '').match(/#(\d{3,})/);
        return m ? m[1] : '';
      };
      const extractInstallmentNumber = (s: string) => {
        const m = (s || '').toLowerCase().match(/parcela\s*(\d+)/);
        return m ? m[1] : '';
      };
      const normalize = (s: string) => (s || '')
        .toLowerCase()
        // remove sufixo dinâmico de estoque
        .replace(/\(atual:[^)]+\)/g, '')
        // apaga datas e horários
        .replace(/\d{4}-\d{2}-\d{2}/g, '')
        .replace(/\b\d{2}:\d{2}\b/g, '')
        // remove valores monetários
        .replace(/r\$\s?[\d\.,]+/gi, '')
        // espaços
        .replace(/\s+/g, ' ')
        .trim();
      // Deduplicação
      // Para 'Lidos', evitar dedupe por conteúdo para não causar sumiço/reaparecimento quando a ordem muda.
      // Confiar no id único.
      let finalList: UINotification[];
      if (activeTab === 'read') {
        finalList = filtered;
      } else {
        const seen = new Set<string>();
        finalList = filtered.filter((n) => {
          const code = extractProductCode(n.message || '') || extractProductCode(n.title || '');
          const order = extractOrderNumber(n.message || '') || extractOrderNumber(n.title || '');
          const parcela = extractInstallmentNumber(n.message || '') || extractInstallmentNumber(n.title || '');
          const key = `${(n.type||'').toLowerCase()}|${normalize(n.title)}|${normalize(n.message)}|prd:${code}|ord:${order}|parc:${parcela}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      // Debug leve: ajuda a entender por que itens como aniversário não aparecem
      try {
        if (activeTab === 'unread') {
          const bdays = finalList.filter((x) =>
            (x.title || '').toLowerCase().includes('anivers') || (x.message || '').toLowerCase().includes('anivers')
          );
          // eslint-disable-next-line no-console
          console.debug('[NotificationCenter] unread:', finalList.length, 'birthdays:', bdays.length, bdays.slice(0, 3).map((x) => x.title));
        }
      } catch {}
      setNotifications(finalList);
      setPage(pagination?.page || 1);
      setPages(pagination?.pages || 1);
    } catch (e) {
      // fail silently
    } finally {
      setLoading(false);
      loadingRef.current = false;
      lastLoadRef.current = Date.now();
    }
  };

  // Carrega ao montar e quando a aba ativa mudar
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Também recarrega quando a central é aberta (garante estado atualizado ao abrir)
  useEffect(() => {
    if (isOpen) load(1);
  }, [isOpen]);

  // Atualizações em segundo plano: foco da janela, visibilidade e evento global
  useEffect(() => {
    const handler = () => load(1);
    const onCustom = () => load(1);
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('notifications-updated', onCustom as EventListener);
    return () => {
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('notifications-updated', onCustom as EventListener);
    };
  }, []);

  // Polling leve a cada 5 minutos
  useEffect(() => {
    const id = setInterval(() => {
      load(1);
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
=======
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'warning',
      title: 'Estoque Baixo',
      message: '3 produtos estão com estoque abaixo do mínimo',
      time: '5 min atrás',
      read: false
    },
    {
      id: '2',
      type: 'success',
      title: 'Pagamento Recebido',
      message: 'Boleto #BOL001 foi pago por João Silva',
      time: '1 hora atrás',
      read: false
    },
    {
      id: '3',
      type: 'info',
      title: 'Visita Agendada',
      message: 'Nova visita marcada para amanhã às 14h',
      time: '2 horas atrás',
      read: true
    },
    {
      id: '4',
      type: 'error',
      title: 'Boleto Vencido',
      message: 'Boleto #BOL003 venceu hoje',
      time: '3 horas atrás',
      read: true
    }
  ]);
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertCircle;
      case 'error':
        return AlertCircle;
      case 'info':
        return Info;
      default:
        return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

<<<<<<< HEAD
  const markAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications([]);
      // Notifica outras partes da UI (Dashboard) para recarregar
      try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch {}
      // Recarrega para garantir sincronização com backend
      await load(1);
    } catch {}
  };

  const clearRead = async () => {
    try {
      await notificationsService.deleteRead();
      await load(1);
    } catch {}
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  function formatRelativeTime(dateLike: string | number | Date | undefined) {
    try {
      if (!dateLike) return '';
      const d = new Date(dateLike);
      const diff = Date.now() - d.getTime();
      const sec = Math.floor(diff / 1000);
      if (sec < 60) return 'agora';
      const min = Math.floor(sec / 60);
      if (min < 60) return `${min} min atrás`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `${hr} h atrás`;
      const days = Math.floor(hr / 24);
      return `${days} d atrás`;
    } catch {
      return '';
    }
  }

  // Converte datas ISO (YYYY-MM-DD) em texto para DD-MM-YY
  const toDDMMYYInText = (text: string) => {
    try {
      return (text || '').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_m, y, m, d) => `${d}-${m}-${String(y).slice(2)}`);
    } catch {
      return text;
    }
  };

  const normalizeHHmm = (text: string) => {
    const m = (text || '').toString().match(/(\d{2}:\d{2})/);
    return m ? m[1] : '';
  };

  const isPassed = (message: string) => {
    // try to extract YYYY-MM-DD and HH:mm
    const dateMatch = (message || '').match(/(\d{4}-\d{2}-\d{2})/);
    const timeMatch = (message || '').match(/(\d{2}:\d{2})(?::\d{2})?/);
    const dateStr = dateMatch ? dateMatch[1] : '';
    const timeStr = timeMatch ? timeMatch[1] : '';
    if (!dateStr) return false;
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const todayStr = `${YYYY}-${MM}-${DD}`;
    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;
    const nowHH = String(now.getHours()).padStart(2, '0');
    const nowMM = String(now.getMinutes()).padStart(2, '0');
    const nowStr = `${nowHH}:${nowMM}`;
    const hhmm = normalizeHHmm(timeStr);
    return !!hhmm && hhmm < nowStr;
  };

  // (removido: isWithinReminderWindow) — não aplicamos janela de lembrete aqui

  // Extrai id/número de pedido de título/mensagem para navegação direta
  function extractOrderId(textA: string, textB: string): string | null {
    const t = `${textA || ''} ${textB || ''}`;
    // 1) Padrão "#12345"
    const hashNum = t.match(/#(\d{3,})/);
    if (hashNum) return hashNum[1];
    // 2) "pedido 12345" ou "pedido: 12345"
    const pedidoNum = t.toLowerCase().match(/pedido\s*[:#-]?\s*(\d{3,})/);
    if (pedidoNum) return pedidoNum[1];
    // 3) ObjectId Mongo (24 hex)
    const objectId = t.match(/\b[0-9a-fA-F]{24}\b/);
    if (objectId) return objectId[0];
    // 4) chave explícita order_id: XYZ
    const orderIdKey = t.toLowerCase().match(/order[_\s-]?id\s*[:#-]?\s*([0-9a-f]{24}|\d{3,})/);
    if (orderIdKey) return orderIdKey[1];
    return null;
  }

  // Detecta se a notificação é relacionada ao Financeiro
  const isFinanceNotification = (title: string, message: string): boolean => {
    const t = `${title} ${message}`.toLowerCase();
    return (
      t.includes('financeiro') ||
      t.includes('boleto') ||
      t.includes('parcela') ||
      t.includes('pagamento') ||
      t.includes('fatura')
    );
  };

  // Extrai número da parcela (se houver) para deep-link no Financeiro
  const extractInstallmentNumber = (title: string, message: string): number | null => {
    const t = `${title} ${message}`.toLowerCase();
    const m = t.match(/parcela\s*(\d{1,2})/);
    if (m) {
      const num = Number(m[1]);
      return Number.isFinite(num) && num > 0 ? num : null;
    }
    return null;
  };

  const handleNotificationClick = async (n: UINotification) => {
    const title = (n.title || '').toLowerCase();
    const message = (n.message || '').toLowerCase();
    const isLowStock = title.includes('estoque') || message.includes('estoque');
    const isVisit = title.includes('visita') || message.includes('visita');
    const orderId = extractOrderId(n.title || '', n.message || '');
    const isFinance = isFinanceNotification(n.title || '', n.message || '');
    const instNum = extractInstallmentNumber(n.title || '', n.message || '');
    try { await notificationsService.markAsRead(n.id); } catch {}
    try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch {}
    let didNavigate = false;
    if (isLowStock) {
      const m = (n.message || '').match(/\(([^)]+)\)/);
      const q = m && m[1] && m[1].toLowerCase() !== 'sem código' ? m[1] : '';
      const url = q ? `/products?tab=baixo&q=${encodeURIComponent(q)}` : '/products?tab=baixo';
      navigate(url);
      didNavigate = true;
    } else if (isVisit) {
      navigate(`/schedule?tab=${isPassed(n.message) ? 'atrasadas' : 'pendentes'}`);
      didNavigate = true;
    } else if (orderId && isFinance) {
      const url = instNum && Number.isFinite(instNum)
        ? `/financial?orderId=${encodeURIComponent(orderId)}&inst=${instNum}`
        : `/financial?orderId=${encodeURIComponent(orderId)}`;
      navigate(url);
      didNavigate = true;
    } else if (orderId) {
      navigate(`/orders?open=${encodeURIComponent(orderId)}`);
      didNavigate = true;
    }
    // Não remover itens da lista quando estiver na aba 'Lidos' (evita sumiço/reaparecimento).
    // Remover apenas quando estiver em 'Não lidos'.
    if (activeTab === 'unread') {
      setNotifications((prev) => prev.filter((notification) => notification.id !== n.id));
    }
    // Fecha a central apenas se houve navegação
    if (didNavigate) {
      try { onClose(); } catch {}
    }
  };
=======
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
<<<<<<< HEAD
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out">
=======
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out">
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notificações
              </h2>
<<<<<<< HEAD
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Fechar"
=======
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
            >
              <X className="h-5 w-5" />
            </button>
          </div>

<<<<<<< HEAD
          {/* Tabs */}
          <div className="px-4 pt-3">
            <div className="flex items-center gap-4">
              <button
                className={`pb-2 -mb-px text-sm transition-colors focus:outline-none ${
                  activeTab === 'unread'
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
                aria-selected={activeTab === 'unread'}
                onClick={() => setActiveTab('unread')}
              >
                Não lidos
              </button>
              <button
                className={`pb-2 -mb-px text-sm transition-colors focus:outline-none ${
                  activeTab === 'read'
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
                aria-selected={activeTab === 'read'}
                onClick={() => setActiveTab('read')}
              >
                Lidos
              </button>
            </div>
          </div>

          {/* Actions */}
          {activeTab === 'unread' && notifications.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{unreadCount} não lidas</span>
              <button
                onClick={markAllAsRead}
                className="text-blue-600 hover:underline"
                title="Limpa a lista marcando todas como lidas"
              >
                Limpar notificações
              </button>
            </div>
          )}
          {activeTab === 'read' && notifications.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end text-xs text-gray-500 dark:text-gray-400">
              <button
                onClick={clearRead}
                className="text-blue-600 hover:underline"
                title="Remove todas as notificações já lidas"
              >
                Limpar lidos
=======
          {/* Actions */}
          {unreadCount > 0 && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Marcar todas como lidas
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
<<<<<<< HEAD
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Carregando
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bell className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {activeTab === 'unread' ? 'Nenhuma não lida' : 'Nenhuma lida ainda'}
=======
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bell className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma notificação
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Suas notificações aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="space-y-1">
<<<<<<< HEAD
                {Array.from(new Map(notifications.map((x) => [x.id, x])).values()).map((item) => {
                  const IconComp = getIcon(item.type);
                  const color = getIconColor(item.type);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        !item.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                      }`}
                      onClick={() => handleNotificationClick(item)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <IconComp className={`h-5 w-5 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${!item.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {item.title}
                            </p>
                            {!item.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {(() => {
                              const t = `${item.title} ${item.message}`.toLowerCase();
                              const isVisit = t.includes('visita') || t.includes('lembrete');
                              return isVisit ? toDDMMYYInText(item.message) : item.message;
                            })()}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-500 mt-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.time}
=======
                {notifications.map((notification) => {
                  const Icon = getIcon(notification.type);
                  const iconColor = getIconColor(notification.type);
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <Icon className={`h-5 w-5 ${iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-500 mt-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {notification.time}
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
<<<<<<< HEAD
                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex items-center justify-between p-3">
                    <button
                      disabled={page <= 1}
                      onClick={() => load(page - 1)}
                      className="px-3 py-1 text-sm rounded disabled:opacity-50 bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-gray-500">Página {page} de {pages}</span>
                    <button
                      disabled={page >= pages}
                      onClick={() => load(page + 1)}
                      className="px-3 py-1 text-sm rounded disabled:opacity-50 bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    >
                      Próxima
                    </button>
                  </div>
                )}
=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;