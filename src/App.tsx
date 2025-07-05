import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Customers from './pages/Customers/Customers';
import Products from './pages/Products/Products';
import Orders from './pages/Orders/Orders';
import Schedule from './pages/Schedule/Schedule';
import Billing from './pages/Billing/Billing';
import Users from './pages/Users/Users';
import Reports from './pages/Reports/Reports';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route 
                  path="/customers" 
                  element={
                    <ProtectedRoute requiredPermission="Clientes">
                      <Customers />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/products" 
                  element={
                    <ProtectedRoute requiredPermission="Produtos">
                      <Products />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/orders" 
                  element={
                    <ProtectedRoute requiredPermission="Pedidos">
                      <Orders />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/schedule" 
                  element={
                    <ProtectedRoute requiredPermission="Agenda">
                      <Schedule />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/billing" 
                  element={
                    <ProtectedRoute requiredPermission="Boletos">
                      <Billing />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/users" 
                  element={
                    <ProtectedRoute requiredPermission="Usuários">
                      <Users />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/reports" 
                  element={
                    <ProtectedRoute requiredPermission="Relatórios">
                      <Reports />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </Layout>
          </ProtectedRoute>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;