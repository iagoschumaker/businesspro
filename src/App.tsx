import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Customers from './pages/Customers/Customers';
import CustomerDetail from './pages/Customers/CustomerDetail';
import Products from './pages/Products/Products';
import Orders from './pages/Orders/Orders';
import Schedule from './pages/Schedule/Schedule';
import Billing from './pages/Billing/Billing';
import Users from './pages/Users/Users';
import Reports from './pages/Reports/Reports';
import Financial from './pages/Financial/Financial';
import CompanyProfile from './pages/Company/CompanyProfile';
import Profile from './pages/Account/Profile';
import LoginForm from './components/Auth/LoginForm';
import { notificationService } from './services/notificationService';

// Super Admin components
import SuperAdminLayout from './pages/SuperAdmin/Layout';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import UsersManagement from './pages/SuperAdmin/UsersManagement';
import PlansManagement from './pages/SuperAdmin/PlansManagement';
import Analytics from './pages/SuperAdmin/Analytics';
import Settings from './pages/SuperAdmin/Settings';

// Componente simples para a página de login
const Login = () => <LoginForm />;

// Interfaces para os componentes
interface ProtectedPageProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

// Componente para páginas protegidas que exigem autenticação
const ProtectedPage: React.FC<ProtectedPageProps> = ({ children, requiredPermission }) => (
  <ProtectedRoute requiredPermission={requiredPermission}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

// Componente que usa o contexto de autenticação APÓS o provider estar disponível
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // Inicializa o serviço de notificações APENAS quando o usuário está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Usuário autenticado, inicializando serviço de notificações...');
      
      // Solicitar permissão para notificações
      if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            console.log(`Permissão para notificações: ${permission}`);
          });
        }
      }
      
      // Sincroniza lembretes com visitas somente se autenticado
      notificationService.syncRemindersWithVisits().catch(err => {
        console.log('Erro ao sincronizar, usando apenas lembretes locais', err);
      });
      
      // Inicia o sistema de verificação
      notificationService.stopChecking();
      notificationService.startChecking();
    } else {
      // Se não estiver autenticado, ainda verifica lembretes locais
      notificationService.stopChecking();
      notificationService.startChecking();
    }
    
    return () => {
      notificationService.stopChecking();
    };
  }, [isAuthenticated]);
  
  return (
    <Routes>
      {/* Rota pública para login */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      
      {/* Rota principal redireciona para login ou dashboard */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      
      {/* Super Admin Routes */}
      <Route path="/super-admin" element={<SuperAdminLayout />}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="plans" element={<PlansManagement />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Rotas protegidas */}
      <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
      <Route path="/customers" element={<ProtectedPage requiredPermission="Clientes"><Customers /></ProtectedPage>} />
      <Route path="/customers/:id" element={<ProtectedPage requiredPermission="Clientes"><CustomerDetail /></ProtectedPage>} />
      <Route path="/products" element={<ProtectedPage requiredPermission="Produtos"><Products /></ProtectedPage>} />
      <Route path="/orders" element={<ProtectedPage requiredPermission="Pedidos"><Orders /></ProtectedPage>} />
      <Route path="/schedule" element={<ProtectedPage requiredPermission="Agenda"><Schedule /></ProtectedPage>} />
      <Route path="/billing" element={<ProtectedPage requiredPermission="Boletos"><Billing /></ProtectedPage>} />
      <Route path="/users" element={<ProtectedPage requiredPermission="Usuários"><Users /></ProtectedPage>} />
      <Route path="/reports" element={<ProtectedPage requiredPermission="Relatórios"><Reports /></ProtectedPage>} />
      <Route path="/financial" element={<ProtectedPage requiredPermission="Financeiro"><Financial /></ProtectedPage>} />
      <Route path="/company" element={<ProtectedPage><CompanyProfile /></ProtectedPage>} />
      <Route path="/account/profile" element={<ProtectedPage><Profile /></ProtectedPage>} />
      
      {/* Redireciona qualquer outra rota para login */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

// Componente principal da aplicação
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;