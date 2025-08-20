import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { superAdminApi } from '../../services/superAdminApi';
import toast from 'react-hot-toast';


interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [initialUser, setInitialUser] = useState({ email: '', password: '' });

  // Formulário simplificado: somente subdomínio

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar usuário obrigatório
    if (!initialUser.email || !initialUser.password) {
      toast.error('Informe email e senha do usuário inicial');
      return;
    }

    try {
      setLoading(true);
      // Usar exatamente o email como nome do tenant e salvar como contato
      const tenant = await superAdminApi.createTenant({ 
        name: initialUser.email,
        contact: { email: initialUser.email }
      });
      await superAdminApi.registerSimple({
        email: initialUser.email,
        password: initialUser.password,
        tenantSubdomain: String(tenant.subdomain || '').toLowerCase(),
        role: 'Administrador',
        isSuperAdmin: false
      });
      toast.success('Usuário inicial criado');

      toast.success('Tenant criado com sucesso!');
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao criar tenant/usuário:', error);
      const data = error?.response?.data;
      const baseMsg = data?.error || 'Erro ao criar tenant/usuário';
      const details = Array.isArray(data?.details) ? `: ${data.details.join(', ')}` : '';
      toast.error(baseMsg + details);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInitialUser({ email: '', password: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Criar Novo Usuário</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Usuário inicial (obrigatório) */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Usuário Inicial</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={initialUser.email}
                  onChange={(e) => setInitialUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <input
                  type="password"
                  value={initialUser.password}
                  onChange={(e) => setInitialUser(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="mínimo 6 caracteres"
                  required
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Criando...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  <span>Criar Usuário</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
