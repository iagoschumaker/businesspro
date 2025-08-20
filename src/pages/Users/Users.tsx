import React, { useState } from 'react';
import { Plus, Search, Filter, User, Shield, Lock, Mail } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import UserForm from './UserForm';

const Users: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const users = [
    {
      id: 1,
      name: 'Admin Sistema',
      email: 'admin@empresa.com',
      role: 'Administrador',
      permissions: ['Todas'],
      status: 'Ativo',
      lastLogin: '2024-01-15 10:30',
      createdAt: '2024-01-01'
    },
    {
      id: 2,
      name: 'João Vendedor',
      email: 'joao@empresa.com',
      role: 'Vendedor',
      permissions: ['Clientes', 'Pedidos', 'Agenda'],
      status: 'Ativo',
      lastLogin: '2024-01-15 09:15',
      createdAt: '2024-01-05'
    },
    {
      id: 3,
      name: 'Maria Financeiro',
      email: 'maria@empresa.com',
      role: 'Financeiro',
      permissions: ['Boletos', 'Relatórios'],
      status: 'Ativo',
      lastLogin: '2024-01-14 16:45',
      createdAt: '2024-01-10'
    },
    {
      id: 4,
      name: 'Carlos Suporte',
      email: 'carlos@empresa.com',
      role: 'Suporte',
      permissions: ['Clientes', 'Produtos'],
      status: 'Inativo',
      lastLogin: '2024-01-12 14:20',
      createdAt: '2024-01-08'
    }
  ];

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrador':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Vendedor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Financeiro':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Suporte':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Inativo':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Administrador':
        return Shield;
      case 'Vendedor':
        return User;
      case 'Financeiro':
        return Lock;
      default:
        return User;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Usuários e Permissões
        </h1>
        <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
          Novo Usuário
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {users.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total de Usuários
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {users.filter(u => u.status === 'Ativo').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Usuários Ativos
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {users.filter(u => u.role === 'Administrador').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Administradores
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {users.filter(u => u.role === 'Vendedor').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Vendedores
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <Button variant="secondary" icon={Filter}>
            Filtros
          </Button>
        </div>
      </Card>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredUsers.map((user) => {
          const RoleIcon = getRoleIcon(user.role);
          return (
            <Card key={user.id} className="hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <RoleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {user.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4 mr-2" />
                  {user.email}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Último acesso:</span> {user.lastLogin}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Criado em:</span> {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Permissões:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {user.permissions.map((permission, index) => (
                    <span
                      key={index}
                      className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button size="sm" variant="secondary" className="flex-1">
                  Editar
                </Button>
                <Button size="sm" variant="secondary">
                  Permissões
                </Button>
                <Button 
                  size="sm" 
                  variant={user.status === 'Ativo' ? 'danger' : 'success'}
                >
                  {user.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* User Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Usuário"
        size="lg"
      >
        <UserForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Users;