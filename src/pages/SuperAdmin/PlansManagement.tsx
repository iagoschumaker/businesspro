import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit,
  Trash2,
  CreditCard,
  Check,
  X
} from 'lucide-react';
import { superAdminApi } from '../../services/superAdminApi';
import toast from 'react-hot-toast';

interface Plan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  limits: {
    users: number;
    customers: number;
    products: number;
    storage: number;
    apiRequests: number;
  };
  features: Array<{
    name: string;
    enabled: boolean;
  }>;
  isActive: boolean;
  order: number;
}

const PlansManagement: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plansData = await superAdminApi.getPlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatStorage = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Gestão de Planos</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Novo Plano
        </button>
      </div>

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 ${
              plan.slug === 'professional' 
                ? 'border-blue-500 ring-2 ring-blue-200' 
                : 'border-gray-200 dark:border-gray-700'
            } relative overflow-hidden`}
          >
            {plan.slug === 'professional' && (
              <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-center py-1 text-sm font-medium">
                Mais Popular
              </div>
            )}

            <div className={`p-4 md:p-6 ${plan.slug === 'professional' ? 'pt-10' : ''}`}>
              {/* Header do Plano */}
              <div className="text-center mb-4 md:mb-6">
                <div className="flex items-center justify-center mb-3">
                  <CreditCard className="w-7 h-7 md:w-8 md:h-8 text-blue-600" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{plan.description}</p>
              </div>

              {/* Preços */}
              <div className="text-center mb-4 md:mb-6">
                <div className="mb-2">
                  <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(plan.price.monthly)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">/mês</span>
                </div>
                <div className="text-sm text-gray-500">
                  ou {formatCurrency(plan.price.yearly)}/ano
                </div>
              </div>

              {/* Limites */}
              <div className="space-y-3 mb-4 md:mb-6">
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Usuários:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{plan.limits.users}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Clientes:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{plan.limits.customers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Produtos:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{plan.limits.products.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Armazenamento:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{formatStorage(plan.limits.storage)}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-gray-600 dark:text-gray-300">API Requests:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{plan.limits.apiRequests.toLocaleString()}/mês</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-4 md:mb-6">
                {plan.features.slice(0, 5).map((feature, index) => (
                  <div key={index} className="flex items-center text-xs md:text-sm">
                    {feature.enabled ? (
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                    )}
                    <span className={feature.enabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
                      {feature.name}
                    </span>
                  </div>
                ))}
                {plan.features.length > 5 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    +{plan.features.length - 5} recursos adicionais
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="mb-4">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  plan.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {plan.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm">
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </button>
                <button className="sm:w-11 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estatísticas dos Planos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 md:mb-4">Estatísticas dos Planos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {plans.map((plan) => (
            <div key={plan._id} className="text-center">
              <div className="text-xl md:text-2xl font-bold text-blue-600">0</div>
              <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Tenants {plan.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlansManagement;
