import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('atm_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('atm_token'));
  const [loading, setLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('atm_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session verification failed, clearing auth:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    verifySession();
  }, [token]);

  const login = async (identifier, password) => {
    const res = await authApi.login({ username: identifier, password });
    if (res.success && res.data) {
      const { user: authedUser, token: authToken } = res.data;
      setUser(authedUser);
      setToken(authToken);
      localStorage.setItem('atm_user', JSON.stringify(authedUser));
      localStorage.setItem('atm_token', authToken);
      return authedUser;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (formData) => {
    const res = await authApi.register(formData);
    if (res.success && res.data) {
      const { user: newUser, token: newToken } = res.data;
      setUser(newUser);
      setToken(newToken);
      localStorage.setItem('atm_user', JSON.stringify(newUser));
      localStorage.setItem('atm_token', newToken);
      return newUser;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = () => {
    try {
      authApi.logout().catch(() => {});
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('atm_user');
      localStorage.removeItem('atm_token');
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('atm_user', JSON.stringify(res.data.user));
        return res.data.user;
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
