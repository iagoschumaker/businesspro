import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Customers from './pages/Customers/Customers';
import CustomerDetail from './pages/Customers/CustomerDetail';
import Products from './pages/Products/Products';
import Orders from './pages/Orders/Orders';
import Schedule from './pages/Schedule/Schedule';

import Reports from './pages/Reports/Reports';
import Financial from './pages/Financial/Financial';
import CompanyProfile from './pages/Company/CompanyProfile';
import Profile from './pages/Account/Profile';

// Super Admin components
import SuperAdminLayout from './pages/SuperAdmin/Layout';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import UsersManagement from './pages/SuperAdmin/UsersManagement';
import PlansManagement from './pages/SuperAdmin/PlansManagement';
import Analytics from './pages/SuperAdmin/Analytics';
import Settings from './pages/SuperAdmin/Settings';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            {/* Super Admin Routes */}
            <Route path="/super-admin" element={<SuperAdminLayout />}>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="users" element={<UsersManagement />} />
              <Route path="plans" element={<PlansManagement />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Regular App Routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/customers/:id" element={<CustomerDetail />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/financial" element={<Financial />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/company" element={<CompanyProfile />} />
                    <Route path="/account/profile" element={<Profile />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;