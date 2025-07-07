import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  ShoppingCart, 
  Calendar, 
  DollarSign,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Próximas Visitas
            </h3>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <UpcomingVisits visits={getCombinedVisits()} />
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pedidos Recentes
          </h3>
          <ShoppingCart className="h-5 w-5 text-purple-500" />
        </div>
        <RecentOrders orders={dashboardData?.recentOrders || []} />
      </Card>
    </div>
  );
};

export default Dashboard;