import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, User } from 'lucide-react';

const Header: React.FC = () => {
  // Removemos isDark pois o tema agora é sempre escuro
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Função de logout simplificada e direta
  const handleLogout = () => {
    // Limpar dados de autenticação
    if (typeof logout === 'function') {
      logout();
    }
    
    // Limpar storage manualmente para garantir
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('Executando logout e redirecionamento');
    
    // Redirecionamento direto
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 sticky top-0 z-30">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo e hamburger menu */}
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              type="button"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              Sistema de Gestão
            </span>
          </div>

          {/* Ícones da direita */}
          <div className="flex items-center space-x-4">

            {/* Informações do usuário */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user?.name}</p>
              </div>
            </div>
            
            {/* Botão de Logout simplificado e direto */}
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              type="button"
              style={{ cursor: 'pointer' }}
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-gray-800 pt-2 pb-3 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-1 px-2">
            {/* Links do menu mobile */}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;