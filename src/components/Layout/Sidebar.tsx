<<<<<<< HEAD
import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
=======
import React from 'react';
import { NavLink } from 'react-router-dom';
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Calendar,
  CreditCard,
<<<<<<< HEAD
  FileText,
  X,
  Building2,
  User
=======
  UserCheck,
  FileText,
  X,
  Building2
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
<<<<<<< HEAD
  const { user } = useAuth();
=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clientes', href: '/customers', icon: Users },
    { name: 'Produtos', href: '/products', icon: Package },
    { name: 'Pedidos', href: '/orders', icon: ShoppingCart },
    { name: 'Agenda', href: '/schedule', icon: Calendar },
<<<<<<< HEAD
    { name: 'Financeiro', href: '/financial', icon: CreditCard },
    { name: 'Relatórios', href: '/reports', icon: FileText },
    { name: 'Empresa', href: '/company', icon: Building2 },
    { name: 'Minha Conta', href: '/account/profile', icon: User },
  ];

  // Lock body scroll on mobile when sidebar is open
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isOpen && isMobile) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

=======
    { name: 'Boletos', href: '/billing', icon: CreditCard },
    { name: 'Usuários', href: '/users', icon: UserCheck },
    { name: 'Relatórios', href: '/reports', icon: FileText },
  ];

>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
<<<<<<< HEAD
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
=======
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
            onClick={onClose}
          />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              BusinessPro
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`
                }
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </div>
<<<<<<< HEAD

          {user?.isSuperAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <NavLink
                to="/super-admin"
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                      : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50 dark:text-purple-300 dark:hover:text-white dark:hover:bg-purple-900/40'
                  }`
                }
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <Building2 className="mr-3 h-5 w-5 flex-shrink-0" />
                Super Admin
              </NavLink>
            </div>
          )}
=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
        </nav>
      </div>
    </>
  );
};

export default Sidebar;