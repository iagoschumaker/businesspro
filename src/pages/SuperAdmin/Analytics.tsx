import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  Activity
} from 'lucide-react';
import { superAdminApi } from '../../services/superAdminApi';

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white w-full md:w-auto">
            <option>Últimos 30 dias</option>
            <option>Últimos 7 dias</option>
            <option>Este mês</option>
            <option>Último mês</option>
          </select>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Tenants</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{dashboardData?.totalTenants || 0}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+12%</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">vs mês anterior</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tenants Ativos</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{dashboardData?.activeTenants || 0}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+8%</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">vs mês anterior</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receita Total</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">R$ {dashboardData?.totalRevenue?.toLocaleString() || '0'}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+25%</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">vs mês anterior</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">MRR</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">R$ {Math.round((dashboardData?.totalRevenue || 0) / 12).toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+18%</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">vs mês anterior</span>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Crescimento de Tenants</h3>
          <div className="h-56 md:h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <BarChart3 className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 text-gray-400" />
              <p>Gráfico em desenvolvimento</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Distribuição por Planos</h3>
          <div className="h-56 md:h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <BarChart3 className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 text-gray-400" />
              <p>Gráfico em desenvolvimento</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de performance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Performance por Plano</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tenants
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Receita
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Taxa de Conversão
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-900 dark:text-white">
                  Trial
                </td>
                <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  0
                </td>
                <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  R$ 0
                </td>
                <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  -
                </td>
              </tr>
              <tr>
                <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-900 dark:text-white">
                  Básico
                </td>
                <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  0
                </td>
                <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  R$ 0
                </td>
                <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                  -
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
