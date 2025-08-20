<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, Bell, User, LogOut } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { visitsService } from '../../services/visitsService';
import NotificationCenter from '../Common/NotificationCenter';
import { notificationsService } from '../../services/api';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  const pathTitleMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/customers': 'Clientes',
    '/products': 'Produtos',
    '/orders': 'Pedidos',
    '/schedule': 'Agenda',
    '/financial': 'Financeiro',
    '/users': 'Usuários',
    '/reports': 'Relatórios',
    '/settings': 'Configurações',
    '/login': 'Login',
    '/': 'Início',
  };

  const computeTitle = (pathname: string) => {
    // tenta correspondência exata
    if (pathTitleMap[pathname]) return pathTitleMap[pathname];
    // tenta pelo prefixo mais longo
    const match = Object.keys(pathTitleMap)
      .filter((p) => p !== '/' && pathname.startsWith(p))
      .sort((a, b) => b.length - a.length)[0];
    return match ? pathTitleMap[match] : 'Início';
  };

  const pageTitle = computeTitle(location.pathname);
  const [tenantInput, setTenantInput] = useState('');
  const [noTenant, setNoTenant] = useState(false);
  const isSuperAdmin = !!(user && ((user as any).isSuperAdmin || (user as any).role === 'SuperAdmin'));

  useEffect(() => {
    try {
      const t = localStorage.getItem('tenantSubdomain');
      setNoTenant(!t);
    } catch {
      setNoTenant(true);
    }
  }, [user]);

  // Unread polling: contar todas as não lidas, sem filtros adicionais.
  // Pausa enquanto o painel está aberto para evitar flicker.
  useEffect(() => {
    let timer: any;
    const lastRunRef = { current: 0 } as { current: number };
    const MIN_GAP = 2000; // 2s entre chamadas
    const refresh = async () => {
      if (showNotifications) return; // suspende enquanto painel aberto
      if (authLoading || !isAuthenticated) return; // evita chamadas sem credenciais
      if (noTenant) return; // evita chamadas sem tenant definido
      const now = Date.now();
      if (now - lastRunRef.current < MIN_GAP) return; // debounce
      lastRunRef.current = now;
      try {
        const { notifications: list } = await notificationsService.getAll({ page: 1, limit: 50, unread_only: true });
        setUnread((list || []).length);
      } catch {}
    };
    refresh();
    timer = setInterval(refresh, 60000);
    const handler = () => refresh();
    const countHandler = (e: any) => {
      if (!e || typeof e.detail?.count !== 'number') return;
      setUnread(e.detail.count);
    };
    try { window.addEventListener('notifications-updated', handler as any); } catch {}
    try { window.addEventListener('notifications-count', countHandler as any); } catch {}
    const onFocus = () => refresh();
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    try { window.addEventListener('focus', onFocus); } catch {}
    try { document.addEventListener('visibilitychange', onVisibility); } catch {}
    return () => {
      clearInterval(timer);
      try { window.removeEventListener('notifications-updated', handler as any); } catch {}
      try { window.removeEventListener('notifications-count', countHandler as any); } catch {}
      try { window.removeEventListener('focus', onFocus); } catch {}
      try { document.removeEventListener('visibilitychange', onVisibility); } catch {}
    };
  }, [showNotifications, authLoading, isAuthenticated, noTenant]);

  // Visit reminders: toca um som e mostra popup quando chegar o momento do lembrete
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (noTenant) return; // evita chamadas sem tenant definido
    let timer: any;

    const playBeep = () => {
      try {
        const AudioCtx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const notes = [784, 988, 1175]; // G5, B5, D6 (acorde alegre)
        const start = ctx.currentTime + 0.01;
        const dur = 0.14;
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, start + i * (dur + 0.02));
          o.connect(g);
          g.connect(ctx.destination);
          const t0 = start + i * (dur + 0.02);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
          o.start(t0);
          o.stop(t0 + dur + 0.02);
        });
      } catch {}
    };

    const keyFor = (v: any) => `${String(v._id || v.id)}|${v.date}|${v.time}`;
    const loadSeen = () => {
      try { return JSON.parse(localStorage.getItem('visit_reminders_alerted') || '{}'); } catch { return {}; }
    };
    const saveSeen = (obj: any) => {
      try { localStorage.setItem('visit_reminders_alerted', JSON.stringify(obj)); } catch {}
    };

    const shouldAlert = (v: any) => {
      try {
        if (!v?.date || !v?.time) return false;
        const [hh = '00', mm = '00'] = String(v.time).split(':');
        const dt = new Date(`${v.date}T${hh.padStart(2,'0')}:${mm.padStart(2,'0')}:00`);
        const reminderMin = Number(v.reminder || 0);
        const triggerAt = new Date(dt.getTime() - reminderMin * 60 * 1000);
        return Date.now() >= triggerAt.getTime() && Date.now() <= dt.getTime() + 60 * 1000; // janela de +1min
      } catch { return false; }
    };

    const check = async () => {
      try {
        const now = new Date();
        const YYYY = now.getFullYear();
        const MM = String(now.getMonth() + 1).padStart(2, '0');
        const DD = String(now.getDate()).padStart(2, '0');
        const today = `${YYYY}-${MM}-${DD}`;
        const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const TYYYY = tomorrowDate.getFullYear();
        const TMM = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
        const TDD = String(tomorrowDate.getDate()).padStart(2, '0');
        const tomorrow = `${TYYYY}-${TMM}-${TDD}`;

        const [listToday, listTomorrow] = await Promise.all([
          visitsService.getAll({ date: today, status: 'Agendado', limit: 300 }),
          visitsService.getAll({ date: tomorrow, status: 'Agendado', limit: 300 })
        ]);
        // merge unique by id
        const map = new Map<string, any>();
        for (const v of (listToday || [])) map.set(String(v._id || v.id), v);
        for (const v of (listTomorrow || [])) map.set(String(v._id || v.id), v);
        const list = Array.from(map.values());
        const seen = loadSeen();
        for (const v of (list || [])) {
          const k = keyFor(v);
          if (seen[k]) continue;
          if (shouldAlert(v)) {
            // Marca como visto antes para evitar repetição
            seen[k] = true;
            saveSeen(seen);
            // Popup
            const customer = v.customer_name || v.customer?.name || v.customer_id?.name || 'Cliente';
            const [th = '00', tm = '00'] = String(v.time || '').split(':');
            const [yy = '', mm2 = '', dd2 = ''] = String(v.date || '').split('-');
            const when = `${dd2}-${mm2}-${String(yy).slice(2)} ${th.padStart(2,'0')}:${tm.padStart(2,'0')}`;
            toast.custom(
              () => (
                <div className="p-3 text-sm rounded-lg shadow-lg border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-gradient-to-br dark:from-blue-900/70 dark:to-indigo-900/60">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Bell className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Lembrete de visita</div>
                      <div className="mt-0.5 text-gray-700 dark:text-gray-100">
                        <span className="font-medium">{customer}</span>
                        <span className="mx-2 opacity-60">—</span>
                        <span>{when}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ),
              { duration: 8000, position: 'top-right' }
            );
            // Som
            playBeep();
            // Cria notificação persistente para Central e Dashboard
            try {
              await notificationsService.create({
                type: 'info',
                title: 'Lembrete de visita',
                message: `${customer} — ${when}`,
              });
              try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch {}
            } catch {}
          }
        }
      } catch {}
    };

    // primeira checagem imediata e depois a cada 60s
    check();
    timer = setInterval(check, 60000);
    const onFocus = () => check();
    const onVisibility = () => { if (document.visibilityState === 'visible') check(); };
    try { window.addEventListener('focus', onFocus); } catch {}
    try { document.addEventListener('visibilitychange', onVisibility); } catch {}
    return () => {
      clearInterval(timer);
      try { window.removeEventListener('focus', onFocus); } catch {}
      try { document.removeEventListener('visibilitychange', onVisibility); } catch {}
    };
  }, [authLoading, isAuthenticated]);

  // (removido: isWithinReminderWindow) — badge agora conta apenas alertas

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="ml-4 lg:ml-0 text-2xl font-semibold text-gray-900 dark:text-white">
              {pageTitle}
            </h1>
            {/* SuperAdmin tenant selector when no tenant resolved */}
            {isSuperAdmin && noTenant && (
              <div className="ml-4 flex items-center gap-2">
                <input
                  value={tenantInput}
                  onChange={(e) => setTenantInput(e.target.value)}
                  placeholder="subdomínio do tenant"
                  className="px-2 py-1 text-sm border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                />
                <button
                  onClick={() => {
                    const v = String(tenantInput || '').trim().toLowerCase();
                    if (!v) {
                      toast.error('Informe o subdomínio do tenant');
                      return;
                    }
                    try {
                      localStorage.setItem('tenantSubdomain', v);
                    } catch {}
                    toast.success('Tenant definido');
                    window.location.reload();
                  }}
                  className="px-3 py-1 rounded-md text-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Usar
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Logout movido para o menu do usuário (disponível em mobile e desktop) */}

            <div className="relative z-[1000]">
              <button 
                onClick={() => {
                  setShowNotifications(true);
                }}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Bell className="h-5 w-5" />
              </button>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold bg-red-500 text-white rounded-full">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
                aria-controls="user-menu"
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user?.name || 'avatar'}
                    className="w-8 h-8 rounded-full object-cover border border-white/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>

              {showUserMenu && (
                <div
                  id="user-menu"
                  role="menu"
                  aria-label="Menu do usuário"
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[1001] pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      navigate('/account/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Minha Conta
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      logout();
                      setShowUserMenu(false);
                    }}
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <NotificationCenter
        isOpen={showNotifications}
        onClose={async () => {
          setShowNotifications(false);
          try {
            // Recompute: contar todas as não lidas
            const { notifications: list } = await notificationsService.getAll({ page: 1, limit: 50, unread_only: true });
            setUnread((list || []).length);
          } catch {}
        }}
      />

      {/* Overlay para fechar menu do usuário (abaixo do header/dropdown) */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
=======
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, User } from 'lucide-react';

const Header: React.FC = () => {
  // Removemos isDark pois o tema agora é sempre escuro
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Função de logout simplificada e direta
  const handleLogout = () => {
    // Limpar dados de autenticação
    if (typeof logout === 'function') {
      logout();
    }
    
    // Limpar storage manualmente para garantir
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('Executando logout e redirecionamento');
    
    // Redirecionamento direto
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 sticky top-0 z-30">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo e hamburger menu */}
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              type="button"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              Sistema de Gestão
            </span>
          </div>

          {/* Ícones da direita */}
          <div className="flex items-center space-x-4">

            {/* Informações do usuário */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user?.name}</p>
              </div>
            </div>
            
            {/* Botão de Logout simplificado e direto */}
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              type="button"
              style={{ cursor: 'pointer' }}
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-gray-800 pt-2 pb-3 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-1 px-2">
            {/* Links do menu mobile */}
          </div>
        </div>
      )}
    </header>
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  );
};

export default Header;