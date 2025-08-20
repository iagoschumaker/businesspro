import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService, setAuthToken, User, meService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, tenantSubdomain?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
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
  const refreshTimerRef = useRef<number | null>(null);

  // Define antecipadamente para evitar qualquer referência antes da declaração
  const refreshUser = async () => {
    try {
      const me = await meService.get();
      setUser(me as User);
    } catch (_) {
      // silencioso
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');

      // Verifica expiração do token local antes de chamar o backend
      const isExpired = (() => {
        if (!savedToken) return true;
        try {
          const payload = JSON.parse(atob(savedToken.split('.')[1] || ''));
          const nowSec = Math.floor(Date.now() / 1000);
          return typeof payload.exp === 'number' ? payload.exp <= nowSec : true;
        } catch {
          return true;
        }
      })();

      if (!savedToken || isExpired) {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setAuthToken(savedToken);
        // Verificar token com o backend e obter usuário atualizado
        const response = await authService.verify();
        setToken(savedToken);
        setUser(response.user);
        // Persistir tenantSubdomain para requests subsequentes
        try {
          const tSub = response?.tenantSubdomain;
          if (tSub) {
            localStorage.setItem('tenantSubdomain', String(tSub).toLowerCase());
          } else {
            localStorage.removeItem('tenantSubdomain');
          }
        } catch {}
      } catch (error) {
        // Token inválido/expirado
        setAuthToken(null);
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Agenda refresh do token ~5min antes do exp
  useEffect(() => {
    // limpar timer anterior
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || '')) as { exp?: number };
      const nowMs = Date.now();
      const expMs = (payload.exp || 0) * 1000;
      if (!payload.exp || expMs <= nowMs) return;

      const fiveMinMs = 5 * 60 * 1000;
      const delay = Math.max(1000, expMs - nowMs - fiveMinMs);

      refreshTimerRef.current = window.setTimeout(async () => {
        try {
          const res = await authService.refresh();
          if (res?.token) {
            setToken(res.token);
            setAuthToken(res.token);
          }
        } catch (_) {
          // falha no refresh: efetua logout local e força login
          setToken(null);
          setUser(null);
          setAuthToken(null);
          window.location.href = '/login';
        }
      }, delay);
    } catch {
      // token inválido: força logout
      setToken(null);
      setUser(null);
      setAuthToken(null);
    }
  }, [token]);

  const login = async (email: string, password: string, tenantSubdomain?: string) => {
    try {
      const response = await authService.login(email, password, tenantSubdomain);
      const { token: newToken, user: newUser } = response;

      setToken(newToken);
      setUser(newUser);
      setAuthToken(newToken);
    } catch (error) {
      throw error;
    }
  };

  

  const logout = () => {
    // Tenta invalidar sessão no backend; se falhar, ainda assim limpa localmente
    (async () => {
      try {
        await authService.logout();
      } catch (_) {
        // ignora erros de logout no backend
      } finally {
        setToken(null);
        setUser(null);
        setAuthToken(null);
        try { localStorage.removeItem('tenantSubdomain'); } catch {}
        // Redireciona para login
        window.location.href = '/login';
      }
    })();
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      loading,
      isAuthenticated,
      refreshUser
    }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading"></div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Carregando...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};