import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit,
  Eye,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Trash
} from 'lucide-react';
import { superAdminApi } from '../../services/superAdminApi';
import CreateUserModal from '../../components/SuperAdmin/CreateUserModal';
import EditUserModal from '../../components/SuperAdmin/EditUserModal';
import toast from 'react-hot-toast';
import { User } from '../../types/superadmin';

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, [searchTerm, statusFilter, planFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (planFilter) params.append('plan', planFilter);

      const queryParams = {
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(planFilter && { plan: planFilter })
      };
      const response = await superAdminApi.getTenants(queryParams);
      setUsers(response.tenants);
    } catch (error) {
      console.error('Erro ao carregar users:', error);
      toast.error('Erro ao carregar users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await superAdminApi.updateTenantStatus(userId, newStatus);
      
      toast.success('Status atualizado com sucesso');
      loadUsers();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'trial':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'suspended':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      active: 'Ativo',
      trial: 'Trial',
      suspended: 'Suspenso',
      cancelled: 'Cancelado'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return limit > 0 ? Math.round((used / limit) * 100) : 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
    return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir o tenant "${user.name}" e todos os seus usuários? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;
    try {
      await superAdminApi.deleteTenant(user._id);
      toast.success('Tenant excluído com sucesso');
      loadUsers();
    } catch (error) {
      console.error('Erro ao excluir tenant:', error);
      toast.error('Erro ao excluir tenant');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestão de Usuários</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome, subdomínio ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspenso</option>
            <option value="cancelled">Cancelado</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Todos os Planos</option>
            <option value="trial">Trial</option>
            <option value="basic">Básico</option>
            <option value="professional">Profissional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <div key={user._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-8 h-8 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.subdomain}.businesspro.com</div>
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{user.contact?.email || '-'}</div>
                        </div>
                        <span className="inline-flex px-2 py-1 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 capitalize flex-shrink-0">
                          {user.plan}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-center">
                          {getStatusIcon(user.status)}
                          <span className="ml-1 text-gray-900 dark:text-gray-100">{getStatusText(user.status)}</span>
                        </span>
                        {user.subscription?.endDate && (
                          <span className="text-gray-500 dark:text-gray-400">Expira: {new Date(user.subscription.endDate as string).toLocaleDateString('pt-BR')}</span>
                        )}
                        <span className={`px-1 rounded ${getUsageColor(getUsagePercentage(user.usage.users, user.planLimits.users))}`}>
                          {user.usage.users}/{user.planLimits.users} usuários
                        </span>
                        <span className={`px-1 rounded ${getUsageColor(getUsagePercentage(user.usage.customers, user.planLimits.customers))}`}>
                          {user.usage.customers}/{user.planLimits.customers} clientes
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => {/* Implementar visualização */}}
                          className="text-blue-600 hover:text-blue-900"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(user)}
                          className="text-green-600 hover:text-green-900"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                        <select
                          value={user.status}
                          onChange={(e) => handleStatusChange(user._id, e.target.value)}
                          className="ml-auto text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="active">Ativo</option>
                          <option value="trial">Trial</option>
                          <option value="suspended">Suspenso</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/tablet: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plano
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Uso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Criado em
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-8 h-8 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.subdomain}.businesspro.com</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{user.contact?.email || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(user.status)}
                          <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                            {getStatusText(user.status)}
                          </span>
                        </div>
                        {user.subscription?.endDate && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Expira: {new Date(user.subscription?.endDate as string).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 capitalize">
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            <span className={`px-1 rounded ${getUsageColor(getUsagePercentage(user.usage.users, user.planLimits.users))}`}>
                              {user.usage.users}/{user.planLimits.users} usuários
                            </span>
                          </div>
                          <div className="flex items-center text-xs">
                            <Building2 className="w-3 h-3 mr-1" />
                            <span className={`px-1 rounded ${getUsageColor(getUsagePercentage(user.usage.customers, user.planLimits.customers))}`}>
                              {user.usage.customers}/{user.planLimits.customers} clientes
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {/* Implementar visualização */}}
                            className="text-blue-600 hover:text-blue-900"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(user)}
                            className="text-green-600 hover:text-green-900"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                          <select
                            value={user.status}
                            onChange={(e) => handleStatusChange(user._id, e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="active">Ativo</option>
                            <option value="trial">Trial</option>
                            <option value="suspended">Suspenso</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal de criação de usuário */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadUsers}
      />
      <EditUserModal
        isOpen={showEditModal}
        user={selectedUser}
        onClose={closeEdit}
        onSaved={() => { closeEdit(); loadUsers(); }}
      />
    </div>
  );
};

export default UsersManagement;
