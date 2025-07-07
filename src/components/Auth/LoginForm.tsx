import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Button from '../Common/Button';

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validação básica
    if (!formData.email.trim()) {
      setError('O e-mail é obrigatório');
      setLoading(false);
      return;
    }
    
    if (!formData.password.trim()) {
      setError('A senha é obrigatória');
      setLoading(false);
      return;
    }

    try {
      await login(formData.email, formData.password);
      // Redirecionamento já é feito pelo AuthContext/ProtectedRoute
    } catch (error: any) {
      // Tratamento de erro mais detalhado
      if (error.response) {
        // Erro de resposta da API
        const status = error.response.status;
        if (status === 401) {
          setError('E-mail ou senha inválidos');
        } else if (status === 403) {
          setError('Usuário sem permissão de acesso');
        } else {
          setError(error.response?.data?.error || `Erro ${status}: Falha ao fazer login`);
        }
      } else if (error.request) {
        // Erro de rede - sem resposta do servidor
        setError('Não foi possível conectar ao servidor. Verifique sua conexão.');
      } else {
        // Erro genérico
        setError('Erro ao fazer login: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            BusinessPro
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sistema de Gestão Empresarial
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400"
                  placeholder="Digite seu e-mail"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-3"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-2">Usuários de demonstração:</p>
              <div className="space-y-1 text-xs">
                <p><strong>Admin:</strong> admin@businesspro.com / admin123</p>
                <p><strong>Vendedor:</strong> joao@businesspro.com / 123456</p>
                <p><strong>Financeiro:</strong> maria@businesspro.com / 123456</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;