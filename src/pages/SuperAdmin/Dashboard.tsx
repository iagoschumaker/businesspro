import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  TrendingUp, 
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { superAdminApi } from '../../services/superAdminApi';

interface DashboardMetrics {
  tenants: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
  };
  users: number;
  customers: number;
  orders: number;
  revenue: number;
}

interface RecentTenant {
  _id: string;
  name: string;
  subdomain: string;
  status: string;
  plan: string;
  createdAt: string;
}

const SuperAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentTenants, setRecentTenants] = useState<RecentTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.getDashboard();
      setMetrics(response.metrics);
      setRecentTenants(response.recentTenants);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'trial':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'suspended':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'trial':
        return 'Trial';
      case 'suspended':
        return 'Suspenso';
      default:
        return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard Super Admin</h1>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Tenants</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics?.tenants.total || 0}</p>
            </div>
          </div>
          <div className="mt-4 flex space-x-4 text-sm">
            <span className="text-green-600">
              <CheckCircle className="inline w-4 h-4 mr-1" />
              {metrics?.tenants.active || 0} Ativos
            </span>
            <span className="text-blue-600">
              <Clock className="inline w-4 h-4 mr-1" />
              {metrics?.tenants.trial || 0} Trial
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Usuários</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics?.users || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Pedidos</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics?.orders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Receita Mensal</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(metrics?.revenue || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tenants recentes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Tenants Recentes</h2>
        </div>
        {/* Mobile: card list */}
        <div className="md:hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentTenants.map((tenant) => (
              <li key={tenant._id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tenant.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{tenant.subdomain}</div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      {getStatusIcon(tenant.status)}
                      <span className="text-gray-900 dark:text-gray-100">{getStatusText(tenant.status)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-2 py-1 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {tenant.plan}
                    </span>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop/tablet: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subdomínio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Criado em
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {recentTenants.map((tenant) => (
                <tr key={tenant._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{tenant.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{tenant.subdomain}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(tenant.status)}
                      <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                        {getStatusText(tenant.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
