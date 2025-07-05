import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  ShoppingCart, 
  Calendar, 
  DollarSign,
  AlertCircle
} from 'lucide-react';
import Card from '../../components/Common/Card';
import StatsCard from './StatsCard';
import SalesChart from './SalesChart';
import RecentOrders from './RecentOrders';
import UpcomingVisits from './UpcomingVisits';
import { dashboardService } from '../../services/api';
import { useApi } from '../../hooks/useApi';

const Dashboard: React.FC = () => {
  const { data: dashboardData, loading, execute: loadDashboard } = useApi(dashboardService.getStats);

  useEffect(() => {
    loadDashboard();
  }, []);

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
      color: 'green'
    },
    {
      title: 'Pedidos Hoje',
      value: dashboardData.stats.ordersToday?.toString() || '0',
      change: dashboardData.stats.ordersChange || '+0%',
      trend: dashboardData.stats.ordersChange?.startsWith('+') ? 'up' as const : 'down' as const,
      icon: ShoppingCart,
      color: 'blue'
    },
    {
      title: 'Clientes Ativos',
      value: dashboardData.stats.activeCustomers?.toString() || '0',
      change: dashboardData.stats.customersChange || '0%',
      trend: 'up' as const,
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Produtos em Estoque',
      value: dashboardData.stats.totalProducts?.toString() || '0',
      change: dashboardData.stats.lowStockProducts ? `-${dashboardData.stats.lowStockProducts} baixo` : 'Normal',
      trend: dashboardData.stats.lowStockProducts > 0 ? 'down' as const : 'up' as const,
      icon: Package,
      color: 'orange'
    }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Atualizado há 5 minutos
        </div>
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
          <UpcomingVisits visits={dashboardData?.upcomingVisits || []} />
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