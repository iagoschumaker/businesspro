import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      const { token: newToken, user: newUser } = response;

      setToken(newToken);
      setUser(newUser);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    // Limpar dados de autenticação
    setToken(null);
    setUser(null);
    localStorage.clear(); // Limpa todo o localStorage, não apenas token e user
    sessionStorage.clear(); // Limpa qualquer dado de sessão também
    
    // Implementação robusta para garantir o redirecionamento
    try {
      console.log('Executando logout...');
      
      // O redirecionamento principal agora será feito no componente Header
      // para evitar problemas de redirecionamento em cadeia
    } catch (error) {
      console.error('Erro durante o logout:', error);
      
      // Em caso de erro, tenta o redirecionamento aqui também
      window.location.href = '/login';
    }
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      loading,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
};