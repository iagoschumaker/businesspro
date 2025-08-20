import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  ShoppingCart, 
  Calendar, 
  DollarSign,
<<<<<<< HEAD
  Gift,
  MessageCircle,
  Eye,
  X
} from 'lucide-react';
import Card from '../../components/Common/Card';
import { useNavigate } from 'react-router-dom';
import StatsHeader from '../../components/Common/StatsHeader';
import SalesChart from './SalesChart';
import RecentOrders from './RecentOrders';
import UpcomingVisits from './UpcomingVisits';
import { dashboardService, productsService, customersService, ordersService, notificationsService, type Customer } from '../../services/api';
import { visitsService } from '../../services/visitsService';
import { useApi } from '../../hooks/useApi';
import { AlertTriangle } from 'lucide-react';
 

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: dashboardData, loading, execute: loadDashboard } = useApi(dashboardService.getStats);
  // Dados fixos (independentes do período) para Pedidos Recentes
  const { data: fixedData, loading: loadingFixed, execute: loadFixed } = useApi(dashboardService.getStats);
  const [statsRange, setStatsRange] = useState<'today' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'all' | 'custom'>('7d');
  const [customDays, setCustomDays] = useState<number>(7); // legacy: kept for backward compatibility
  // Datas personalizadas (YYYY-MM-DD)
  const todayStrInit = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  // Formata data da notificação (created_at/createdAt) como DD-MM-YY HH:mm
  const formatDDMMYYHHmm = (val: any) => {
    try {
      const s = String(val || '');
      const parts = s.includes('T') ? s.split('T') : s.split(' ');
      const date = parts[0] || '';
      const time = (parts[1] || '').slice(0, 5);
      const [y, m, d] = date.split('-');
      if (y && m && d) {
        return `${d}-${m}-${String(y).slice(2)}${time ? ` ${time}` : ''}`;
      }
      return s;
    } catch {
      return String(val || '');
    }
  };
  const sevenDaysAgoStrInit = (() => {
    const now = new Date();
    now.setDate(now.getDate() - 7);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();
  const [customStart, setCustomStart] = useState<string>(sevenDaysAgoStrInit);
  const [customEnd, setCustomEnd] = useState<string>(todayStrInit);
  const [upcomingVisits, setUpcomingVisits] = useState<any[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [birthdaysToday, setBirthdaysToday] = useState<Customer[]>([]);
  const [hideBirthdays, setHideBirthdays] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  
  // Tenant-aware storage key for birthdays dismissal
  const birthdaysKey = (() => {
    try {
      const t = localStorage.getItem('tenantSubdomain');
      return `hideBirthdaysDate:${t || 'default'}`;
    } catch {
      return 'hideBirthdaysDate:default';
    }
  })();


  // Persists the dismissal of the birthdays section for the current day (per tenant)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(birthdaysKey);
      if (saved && saved === todayStrInit) setHideBirthdays(true);
      // Cleanup previous days key automatically by overwriting when closing
    } catch {}
  }, [birthdaysKey, todayStrInit]);

  useEffect(() => {
    // Recarrega os dados quando o período muda. A API pode ignorar o parâmetro se não suportar.
    loadDashboard(statsRange as any);
  }, [statsRange]);

  // Carrega dados fixos uma vez (separados do período)
  useEffect(() => {
    loadFixed();
  }, []);

  // Carrega notificações recentes e escuta eventos de atualização
  useEffect(() => {
    let mounted = true;
    const loadRecentNotifications = async () => {
      try {
        const { notifications } = await notificationsService.getAll({ page: 1, limit: 6 });
        if (mounted) setRecentNotifications(Array.isArray(notifications) ? notifications : []);
      } catch {
        if (mounted) setRecentNotifications([]);
      }
    };
    loadRecentNotifications();
    const onUpdated = () => loadRecentNotifications();
    try { window.addEventListener('notifications-updated', onUpdated as any); } catch {}
    return () => {
      mounted = false;
      try { window.removeEventListener('notifications-updated', onUpdated as any); } catch {}
    };
  }, []);

  // Fallback: carregar pedidos recentes diretamente se o dashboard não fornecer
  useEffect(() => {
    const loadRecentOrders = async () => {
      try {
        const data = await ordersService.getAll({ limit: 10 });
        const list = Array.isArray(data) ? data : [];
        setRecentOrders(list);
      } catch (e) {
        setRecentOrders([]);
      }
    };
    loadRecentOrders();
  }, []);

  // Fallback: contar produtos com baixo estoque no frontend
  useEffect(() => {
    const loadLowStock = async () => {
      try {
        const data = await productsService.getAll();
        const items = Array.isArray(data) ? data : (Array.isArray((data as any)?.products) ? (data as any).products : []);
        const isLowStock = (p: any) => {
          const stock = Number(p?.stock ?? p?.quantity ?? 0) || 0;
          const min = Number(p?.min_stock ?? p?.minStock ?? 0) || 0;
          const status = (p?.status || '').toString();
          return stock <= min || status === 'Baixo Estoque';
        };
        setLowStockCount(items.filter(isLowStock).length);
      } catch {
        setLowStockCount(0);
      }
    };
    loadLowStock();
  }, []);

  // Carrega aniversariantes do dia (comparando MM-DD)
  useEffect(() => {
    const loadBirthdays = async () => {
      try {
        const data = await customersService.getAll();
        const list: Customer[] = Array.isArray(data) ? data : [];
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const md = `${mm}-${dd}`;
        const todays = list.filter((c) => {
          const mmdd = toMMDD(c.birth_date || '');
          return mmdd === md;
        });
        setBirthdaysToday(todays);
      } catch {
        setBirthdaysToday([]);
      }
    };
    loadBirthdays();
  }, []);

  // Carrega visitas reais (comparações por string para evitar timezone)
  useEffect(() => {
    const loadUpcomingVisits = async () => {
      try {
        setLoadingVisits(true);
        const allVisits = await visitsService.getAll();

        // Datas no formato YYYY-MM-DD
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const Y2 = yesterday.getFullYear();
        const M2 = String(yesterday.getMonth() + 1).padStart(2, '0');
        const D2 = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${Y2}-${M2}-${D2}`;

        const toKey = (v: any) => `${v.date || ''} ${((v.time || '').toString().match(/^(\d{2}:\d{2})/)||[])[1] || '23:59'}`;

        const upcoming = (Array.isArray(allVisits) ? allVisits : [])
          .filter(v => (v.date || '') >= yesterdayStr) // inclui ontem, hoje e futuras
          .sort((a, b) => toKey(a).localeCompare(toKey(b)))
          .slice(0, 4);

        setUpcomingVisits(upcoming);
      } catch (error) {
        console.error('Erro ao carregar próximas visitas:', error);
        setUpcomingVisits([]);
      } finally {
        setLoadingVisits(false);
      }
    };

    loadUpcomingVisits();
  }, []);

  // Utilidades de período para filtrar dados no frontend (fallback se a API ignorar o parâmetro)
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Normaliza para data YYYY-MM-DD sem causar shift de timezone
  // Se vier exatamente 'YYYY-MM-DD', retorna como está (já está no fuso local via backend)
  // Só parseia quando houver tempo na string
  const normalizeDate = (s: string) => {
    if (!s) return '';
    const trimmed = s.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return trimmed.slice(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helpers para aniversário: parse e idade
  const toISO = (raw: string): string | null => {
    const s = (raw || '').trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ISO
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`; // BR /
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`; // BR -
    return null;
  };
  const calcAge = (isoDate: string | null): number | null => {
    if (!isoDate) return null;
    const y = parseInt(isoDate.slice(0,4), 10);
    const m = parseInt(isoDate.slice(5,7), 10) - 1;
    const d = parseInt(isoDate.slice(8,10), 10);
    const dob = new Date(Date.UTC(y, m, d));
    const now = new Date();
    let age = now.getUTCFullYear() - dob.getUTCFullYear();
    const mDiff = now.getUTCMonth() - dob.getUTCMonth();
    if (mDiff < 0 || (mDiff === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
    return age >= 0 && age < 130 ? age : null;
  };
  const toMMDD = (raw: string): string | null => {
    const s = (raw || '').trim();
    if (!s) return null;
    // ISO YYYY-MM-DD -> MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s.slice(5,7)}-${s.slice(8,10)}`;
    // BR DD/MM/YYYY -> MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return `${s.slice(3,5)}-${s.slice(0,2)}`;
    // BR DD-MM-YYYY -> MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return `${s.slice(3,5)}-${s.slice(0,2)}`;
    // fallback: tenta últimos 5 com dois dígitos
    if (s.length >= 5 && /\d{2}.\d{2}$/.test(s.slice(-5))) {
      const only = s.slice(-5).replace(/[^0-9]/g, '');
      if (only.length === 4) return `${only.slice(0,2)}-${only.slice(2,4)}`;
    }
    return null;
  };

  const makeLastNDaysSet = (n: number) => {
    const set = new Set<string>();
    const base = new Date();
    for (let i = 0; i < n; i++) {
      const dt = new Date(base);
      dt.setDate(base.getDate() - i);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      set.add(`${y}-${m}-${d}`);
    }
    return set;
  };

  const filteredChart = (() => {
    const chart: Array<{ date: string; sales: number; orders: number }> = dashboardData?.salesChart || [];
    if (!chart.length) return chart;
    const today = getTodayStr();
    if (statsRange === 'today') {
      return chart.filter(i => normalizeDate(i.date) === today);
    }
    if (statsRange === '7d') {
      const days = makeLastNDaysSet(7);
      return chart.filter(i => days.has(normalizeDate(i.date)));
    }
    if (statsRange === '30d') {
      const days = makeLastNDaysSet(30);
      return chart.filter(i => days.has(normalizeDate(i.date)));
    }
    if (statsRange === 'custom') {
      const start = (customStart || customEnd || '').slice(0, 10);
      const end = (customEnd || customStart || '').slice(0, 10);
      if (!start && !end) return chart;
      const s = start || '';
      const e = end || '';
      return chart.filter(i => {
        const d = normalizeDate(i.date);
        const afterStart = s ? d >= s : true;
        const beforeEnd = e ? d <= e : true;
        return afterStart && beforeEnd;
      });
    }
    if (statsRange === 'thisMonth') {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return chart.filter(i => normalizeDate(i.date).startsWith(ym));
    }
    if (statsRange === 'lastMonth') {
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const ym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      return chart.filter(i => normalizeDate(i.date).startsWith(ym));
    }
    return chart; // 'all'
  })();

  const totalsFromChart = (() => {
    const sums = filteredChart.reduce(
      (acc, cur) => {
        const sales = Number(cur.sales) || 0;
        const orders = Number((cur as any).orders) || 0;
        acc.sales += sales;
        acc.orders += orders;
        return acc;
      },
      { sales: 0, orders: 0 }
    );
    return sums;
  })();

  // Seção de "Notificações Importantes" removida — Central de Notificações continua disponível no topo da UI

  // Labels e stats baseados no período selecionado
  const formatBR = (ymd: string) => {
    if (!ymd) return '';
    const [y, m, d] = ymd.split('-');
    if (!y || !m || !d) return ymd;
    return `${d}/${m}/${y}`;
  };
  const periodLabel = (
    statsRange === 'custom'
      ? (customStart || customEnd ? `De ${formatBR(customStart)} até ${formatBR(customEnd)}` : 'Personalizado')
      : ({
          today: 'Hoje',
          '7d': 'Últimos 7 dias',
          '30d': 'Últimos 30 dias',
          thisMonth: 'Este mês',
          lastMonth: 'Mês passado',
          all: 'Todos os registros',
        } as const)[statsRange]
  );

  const rangeLabel = (
    statsRange === 'custom'
      ? (customStart || customEnd ? `De ${formatBR(customStart)} até ${formatBR(customEnd)}` : 'Personalizado')
      : ({
          today: 'Hoje',
          '7d': 'Últimos 7 dias',
          '30d': 'Últimos 30 dias',
          thisMonth: 'Este mês',
          lastMonth: 'Mês passado',
          all: 'Todos os registros',
        } as const)[statsRange]
  );

  type StatColor = 'green' | 'blue' | 'purple' | 'orange';
  type StatItem = {
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    icon: React.ComponentType<any>;
    color: StatColor;
  };

  const stats: StatItem[] = dashboardData ? [
    {
      title: `Vendas — ${periodLabel}`,
      value: `R$ ${(totalsFromChart.sales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: dashboardData.stats?.salesChange || '+0%',
      trend: (dashboardData.stats?.salesChange || '+0%').toString().startsWith('+') ? 'up' : 'down',
      icon: DollarSign,
      color: 'green',
    },
    {
      title: `Pedidos — ${periodLabel}`,
      value: (totalsFromChart.orders || 0).toString(),
      change: dashboardData.stats?.ordersChange || '+0%',
      trend: (dashboardData.stats?.ordersChange || '+0%').toString().startsWith('+') ? 'up' : 'down',
      icon: ShoppingCart,
      color: 'blue',
    },
    {
      title: 'Clientes Ativos',
      value: dashboardData.stats?.activeCustomers?.toString() || '0',
      change: dashboardData.stats?.customersChange || '0%',
      trend: 'up',
      icon: Users,
      color: 'purple',
    },
    {
      title: 'Produtos em Estoque',
      value: dashboardData.stats?.totalProducts?.toString() || '0',
      change: dashboardData.stats?.lowStockProducts ? `-${dashboardData.stats.lowStockProducts} baixo` : 'Normal',
      trend: (dashboardData.stats?.lowStockProducts || 0) > 0 ? 'down' : 'up',
      icon: Package,
      color: 'orange',
    }
  ] : [];

  if (loading || loadingFixed) {
    return (
      <div className="space-y-6">
=======
  AlertCircle,
  PieChart,
  RefreshCw
} from 'lucide-react';
import Card from '../../components/Common/Card';
import StatsCard from './StatsCard';
import SalesChart from './SalesChart';
import RecentOrders from './RecentOrders';
import UpcomingVisits from './UpcomingVisits';
import OrderStatusStats from './OrderStatusStats';
import { dashboardService } from '../../services/api';
import { useApi } from '../../hooks/useApi';

const Dashboard: React.FC = () => {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { data: dashboardData, loading, execute: loadDashboard } = useApi(dashboardService.getStats);
  const { data: orderStatusStats, loading: loadingOrderStats, execute: loadOrderStats } = useApi(dashboardService.getOrdersByStatus);

  useEffect(() => {
    loadDashboard();
    loadOrderStats();
    setLastUpdated(new Date());
  }, []);
  
  // Função para formatar a data de última atualização
  const formatLastUpdated = () => {
    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Atualizado agora';
    if (minutes === 1) return 'Atualizado há 1 minuto';
    if (minutes < 60) return `Atualizado há ${minutes} minutos`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'Atualizado há 1 hora';
    return `Atualizado há ${hours} horas`;
  };
  
  // Função para atualizar o dashboard
  const handleRefresh = () => {
    loadDashboard();
    loadOrderStats();
    setLastUpdated(new Date());
  };
  
  // Função para combinar visitas do backend com visitas temporárias do localStorage
  const getCombinedVisits = () => {
    // Se não tiver dados do dashboard ainda, retornar array vazio
    if (!dashboardData) return [];
    
    try {
      // Visitas do backend
      const serverVisits = dashboardData.upcomingVisits || [];
      console.log('Visitas do servidor:', serverVisits);
      
      // Tentar buscar visitas temporárias do localStorage
      let combinedVisits = [...serverVisits];
      try {
        const tempVisitsJson = localStorage.getItem('tempVisits');
        const tempVisits = tempVisitsJson ? JSON.parse(tempVisitsJson) : [];
        console.log('Visitas temporárias encontradas:', tempVisits.length);
        
        if (tempVisits && Array.isArray(tempVisits) && tempVisits.length > 0) {
          // Obter data atual no formato YYYY-MM-DD para comparação
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          console.log('Data de hoje para comparação:', todayStr);
          
          // Processar todas as visitas temporárias
          for (const tempVisit of tempVisits) {
            console.log(`Processando visita temporária: ${JSON.stringify(tempVisit)}`);
            
            if (!tempVisit) {
              console.log('Visita inválida (null ou undefined)');
              continue;
            }
            
            if (!tempVisit.date) {
              console.log('Visita sem data');
              continue;
            }
            
            // Verificar se essa visita já existe no array combinado
            const exists = combinedVisits.some(visit => {
              return visit && tempVisit && visit.id === tempVisit.id;
            });
            
            if (!exists) {
              // Formatar a visita temporária para o formato esperado pelo componente UpcomingVisits
              const formattedVisit = {
                id: tempVisit.id || Date.now(),
                customer_name: tempVisit.customer_name || 'Cliente não identificado',
                date: tempVisit.date,
                time: tempVisit.time || '00:00',
                location: tempVisit.location || tempVisit.purpose || 'Local não especificado',
                type: tempVisit.type || 'Visita',
                status: tempVisit.status || 'Agendado',
                _isTemp: true
              };
              
              // Sempre adicionar visitas temporárias ao dashboard, independente da data
              console.log(`Adicionando visita temporária: ${formattedVisit.date}`);
              combinedVisits.push(formattedVisit);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao processar visitas temporárias:', error);
      }
      
      // Ordenar por data e hora
      combinedVisits.sort((a: any, b: any) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Limitar a 5 visitas mais próximas
      combinedVisits = combinedVisits.slice(0, 5);
      
      console.log('Todas as visitas combinadas:', combinedVisits);
      return combinedVisits;
    } catch (error) {
      console.error('Erro ao combinar visitas:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
        </div>
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </Card>
          ))}
<<<<<<< HEAD
          {stats.map((stat: StatItem, index: number) => {
            const textColor: Record<StatColor, string> = {
              green: 'text-green-600 dark:text-green-400',
              blue: 'text-blue-600 dark:text-blue-400',
              purple: 'text-purple-600 dark:text-purple-400',
              orange: 'text-orange-600 dark:text-orange-400',
            };
            const Icon = stat.icon;
            return (
              <Card key={index} padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      <span className={`${textColor[stat.color]}`}>{stat.value}</span>
                    </p>
                    {stat.title === 'Produtos em Estoque' && (
                      (() => {
                        const count = (dashboardData?.stats?.lowStockProducts ?? lowStockCount) || 0;
                        const danger = count > 0;
                        return (
                          <div className={`${danger ? 'flex' : 'hidden sm:flex'} items-center gap-1 text-[11px] md:text-xs ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {danger && <AlertTriangle className="w-3.5 h-3.5" />}
                            <span>Estoque baixo: {count} produto(s)</span>
                          </div>
                        );
                      })()
                    )}
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <Icon className={`h-6 w-6 ${textColor[stat.color]}`} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Aniversariantes de Hoje */}
        {birthdaysToday.length > 0 && !hideBirthdays && (
          <Card padding="sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aniversariantes de Hoje</h3>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" />
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded"
                  aria-label="Fechar seção de aniversários"
                  onClick={() => { try { localStorage.setItem(birthdaysKey, todayStrInit); } catch {} ; setHideBirthdays(true); }}
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {birthdaysToday.slice(0, 6).map((c) => {
                const id = String((c as any)._id || (c as any).id || '');
                const digits = (c.phone || '').toString().replace(/\D/g, '');
                const e164 = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
                const wa = e164 ? `https://wa.me/${e164}` : '';
                return (
                  <li key={id || c.name} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">Faz aniversário hoje</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={wa || undefined}
                        onClick={(e) => { if (!wa) e.preventDefault(); }}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={wa ? 'Parabenizar no WhatsApp' : 'Telefone indisponível'}
                        className={`px-2 py-1 text-xs rounded-md transition ${wa ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed'}`}
                        aria-label="Abrir WhatsApp"
                      >
                        WhatsApp
                      </a>
                      <button
                        onClick={() => id && navigate(`/customers/${id}`)}
                        className="px-2 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white transition"
                        aria-label="Ver Perfil"
                      >
                        Ver Perfil
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {/* Period Filter */}
        <StatsHeader
          showPeriod
          period={statsRange}
          onChangePeriod={(p) => setStatsRange(p as any)}
          className="mb-2"
        />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card padding="sm">
            <div className="flex flex-col h-[380px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Vendas — {rangeLabel}
                </h3>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <SalesChart data={filteredChart} />
              </div>
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Próximas Visitas
              </h3>
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            {loadingVisits ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Carregando visitas...</p>
              </div>
            ) : (
              <UpcomingVisits visits={upcomingVisits} />
            )}
          </Card>
        </div>

        {/* Notificações Recentes */}
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notificações Recentes</h3>
          </div>
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Sem notificações recentes.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentNotifications.slice(0, 6).map((n: any, idx: number) => (
                <li key={(n._id || n.id || idx).toString()} className="py-2 flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full ${n.type === 'error' ? 'bg-red-500' : n.type === 'warning' ? 'bg-yellow-500' : n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{n.title || 'Notificação'}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">{n.message}</div>
                    { (n.created_at || n.createdAt) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDDMMYYHHmm(n.created_at || n.createdAt)}</div>
                    ) }
                  </div>
                </li>)
              )}
            </ul>
          )}
        </Card>

        {/* Recent Orders */}
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pedidos Recentes
            </h3>
            <ShoppingCart className="h-5 w-5 text-purple-500" />
          </div>
          <RecentOrders orders={(fixedData?.recentOrders && fixedData.recentOrders.length ? fixedData.recentOrders : recentOrders) || []} />
        </Card>
=======
        </div>
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      </div>
    );
  }

<<<<<<< HEAD
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat: StatItem, index: number) => {
          const textColor: Record<StatColor, string> = {
            green: 'text-green-600 dark:text-green-400',
            blue: 'text-blue-600 dark:text-blue-400',
            purple: 'text-purple-600 dark:text-purple-400',
            orange: 'text-orange-600 dark:text-orange-400',
          };
          const Icon = stat.icon;
          return (
            <Card key={index} padding="sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    <span className={`${textColor[stat.color]}`}>{stat.value}</span>
                  </p>
                  {stat.title === 'Produtos em Estoque' && (
                    (() => {
                      const count = (dashboardData?.stats?.lowStockProducts ?? lowStockCount) || 0;
                      const danger = count > 0;
                      return (
                        <div className={`${danger ? 'flex' : 'hidden sm:flex'} items-center gap-1 text-[11px] md:text-xs ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {danger && <AlertTriangle className="w-3.5 h-3.5" />}
                          <span>Estoque baixo: {count} produto(s)</span>
                        </div>
                      );
                    })()
                  )}
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <Icon className={`h-6 w-6 ${textColor[stat.color]}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Aniversariantes de Hoje */}
      {birthdaysToday.length > 0 && !hideBirthdays && (
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aniversariantes de Hoje</h3>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              <button
                type="button"
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded"
                aria-label="Fechar seção de aniversários"
                onClick={() => { try { localStorage.setItem(birthdaysKey, todayStrInit); } catch {} ; setHideBirthdays(true); }}
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {birthdaysToday.slice(0, 6).map((c) => {
              const id = String((c as any)._id || (c as any).id || '');
              const digits = (c.phone || '').toString().replace(/\D/g, '');
              const e164 = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
              const wa = e164 ? `https://wa.me/${e164}` : '';
              return (
                <li key={id || c.name} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
                    {(() => {
                      const age = calcAge(toISO(c.birth_date || ''));
                      return (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                          {age !== null ? `Faz ${age} anos hoje` : 'Faz aniversário hoje'}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={wa || undefined}
                      onClick={(e) => { if (!wa) e.preventDefault(); }}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={wa ? 'Parabenizar no WhatsApp' : 'Telefone indisponível'}
                      className={`p-1.5 transition ${wa ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                      aria-label="Abrir WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => id && navigate(`/customers/${id}`)}
                      className="p-1.5 transition text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      aria-label="Ver Perfil"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Period Filter */}
      <StatsHeader
        showPeriod
        period={statsRange}
        onChangePeriod={(p) => setStatsRange(p as any)}
        customDays={customDays}
        onChangeCustomDays={(n) => setCustomDays(n)}
        customStart={customStart}
        customEnd={customEnd}
        onChangeCustomStart={(s) => setCustomStart(s)}
        onChangeCustomEnd={(s) => setCustomEnd(s)}
        className="mb-2"
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="sm">
          <div className="flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Vendas — {rangeLabel}
              </h3>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1">
              <SalesChart data={filteredChart} />
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
=======
  const stats = dashboardData ? [
    {
      title: 'Vendas do Mês',
      value: `R$ ${dashboardData.stats.salesThisMonth?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`,
      change: dashboardData.stats.salesChange || '+0%',
      trend: dashboardData.stats.salesChange?.startsWith('+') ? 'up' as const : 'down' as const,
      icon: DollarSign,
      color: 'green' as const
    },
    {
      title: 'Pedidos Hoje',
      value: dashboardData.stats.ordersToday?.toString() || '0',
      change: dashboardData.stats.ordersChange || '+0%',
      trend: dashboardData.stats.ordersChange?.startsWith('+') ? 'up' as const : 'down' as const,
      icon: ShoppingCart,
      color: 'blue' as const
    },
    {
      title: 'Clientes Ativos',
      value: dashboardData.stats.activeCustomers?.toString() || '0',
      change: dashboardData.stats.customersChange || '0%',
      trend: 'up' as const,
      icon: Users,
      color: 'purple' as const
    },
    {
      title: 'Produtos em Estoque',
      value: dashboardData.stats.totalProducts?.toString() || '0',
      change: dashboardData.stats.lowStockProducts ? `-${dashboardData.stats.lowStockProducts} baixo` : 'Normal',
      trend: dashboardData.stats.lowStockProducts > 0 ? 'down' as const : 'up' as const,
      icon: Package,
      color: 'orange' as const
    }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <button
          onClick={handleRefresh}
          disabled={loading || loadingOrderStats}
          className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${(loading || loadingOrderStats) ? 'animate-spin' : ''}`} />
          <span>{formatLastUpdated()}</span>
        </button>
      </div>

      {/* Alertas */}
      {dashboardData?.alerts && (dashboardData.alerts.overdueBillets > 0 || dashboardData.alerts.lowStockProducts > 0) && (
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Atenção necessária
              </h3>
              <div className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                {dashboardData.alerts.overdueBillets > 0 && (
                  <p>• {dashboardData.alerts.overdueBillets} boleto(s) vencido(s)</p>
                )}
                {dashboardData.alerts.lowStockProducts > 0 && (
                  <p>• {dashboardData.alerts.lowStockProducts} produto(s) com estoque baixo</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Status dos Pedidos */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Status dos Pedidos
          </h3>
          <PieChart className="h-5 w-5 text-indigo-500" />
        </div>
        {loadingOrderStats ? (
          <div className="h-20 animate-pulse bg-gray-200 dark:bg-gray-700 rounded"></div>
        ) : (
          <OrderStatusStats statusCounts={orderStatusStats || []} />
        )}
      </Card>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vendas dos Últimos 30 Dias
            </h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <SalesChart data={dashboardData?.salesChart || []} />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Próximas Visitas
            </h3>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
<<<<<<< HEAD
          {loadingVisits ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Carregando visitas...</p>
            </div>
          ) : (
            <UpcomingVisits visits={upcomingVisits} />
          )}
=======
          <UpcomingVisits visits={getCombinedVisits()} />
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
        </Card>
      </div>

      {/* Recent Orders */}
<<<<<<< HEAD
      <Card padding="sm">
        <div className="flex items-center justify-between mb-2">
=======
      <Card>
        <div className="flex items-center justify-between mb-4">
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pedidos Recentes
          </h3>
          <ShoppingCart className="h-5 w-5 text-purple-500" />
        </div>
<<<<<<< HEAD
        <RecentOrders orders={(fixedData?.recentOrders && fixedData.recentOrders.length ? fixedData.recentOrders : recentOrders) || []} />
=======
        <RecentOrders orders={dashboardData?.recentOrders || []} />
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      </Card>
    </div>
  );
};

export default Dashboard;