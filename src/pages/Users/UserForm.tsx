import React, { useState } from 'react';
import Button from '../../components/Common/Button';

interface UserFormProps {
  onClose: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Vendedor',
    permissions: [] as string[]
  });

  const rolePermissions = {
    'Administrador': ['Dashboard', 'Clientes', 'Produtos', 'Pedidos', 'Agenda', 'Boletos', 'Usuários', 'Relatórios'],
    'Vendedor': ['Dashboard', 'Clientes', 'Produtos', 'Pedidos', 'Agenda'],
    'Financeiro': ['Dashboard', 'Boletos', 'Relatórios'],
    'Suporte': ['Dashboard', 'Clientes', 'Produtos']
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    const userData = {
      ...formData,
      id: Math.floor(Math.random() * 1000),
      status: 'Ativo',
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: null
    };

    console.log('User data:', userData);
    alert('Usuário criado com sucesso!');
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'role') {
      setFormData({
        ...formData,
        [name]: value,
        permissions: rolePermissions[value as keyof typeof rolePermissions] || []
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permission]
      });
    } else {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(p => p !== permission)
      });
    }
  };

  const allPermissions = ['Dashboard', 'Clientes', 'Produtos', 'Pedidos', 'Agenda', 'Boletos', 'Usuários', 'Relatórios'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome Completo *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            E-mail *
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Senha *
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Confirmar Senha *
          </label>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={6}
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Cargo *
        </label>
        <select
          name="role"
          required
          value={formData.role}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="Vendedor">Vendedor</option>
          <option value="Financeiro">Financeiro</option>
          <option value="Suporte">Suporte</option>
          <option value="Administrador">Administrador</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Permissões
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {allPermissions.map((permission) => (
            <label key={permission} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.permissions.includes(permission)}
                onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {permission}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">
          Configurações de Segurança:
        </h4>
        <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
          <li>• Senha deve ter no mínimo 6 caracteres</li>
          <li>• Usuário receberá e-mail de boas-vindas</li>
          <li>• Login obrigatório será solicitado no primeiro acesso</li>
          <li>• Permissões podem ser alteradas posteriormente</li>
        </ul>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">
          Criar Usuário
        </Button>
      </div>
    </form>
  );
};

export default UserForm;