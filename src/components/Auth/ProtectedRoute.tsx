import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
<<<<<<< HEAD
// import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // Admin-only: permitir SuperAdmin também (compute antes para usar no useEffect)
  const accessDenied = (
    isAuthenticated &&
    !!user &&
    !(user as any).isSuperAdmin &&
    String((user as any).role) !== 'Administrador'
  );

  // useEffect deve ser chamado SEMPRE no topo, antes de qualquer return
  React.useEffect(() => {
    if (accessDenied) {
      toast.error('Acesso permitido apenas para Administrador.');
    }
  }, [accessDenied]);

=======

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { isAuthenticated, user, loading } = useAuth();

>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

<<<<<<< HEAD
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Acesso Negado</h2>
          <p className="text-gray-600 dark:text-gray-400">Somente Administrador pode acessar esta área.</p>
        </div>
      </div>
    );
=======
  // Verificar permissão específica se necessário
  if (requiredPermission && user) {
    const hasPermission = user.role === 'Administrador' || user.permissions.includes(requiredPermission);
    
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Acesso Negado
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
      );
    }
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  }

  return <>{children}</>;
};

export default ProtectedRoute;