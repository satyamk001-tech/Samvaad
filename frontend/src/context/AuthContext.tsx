import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { stompService } from '../services/stomp';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('viora_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('viora_access_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('viora:auth_expired', handleAuthExpired);
    return () => window.removeEventListener('viora:auth_expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (token) {
      stompService.connect(token);
    } else {
      stompService.disconnect();
    }
  }, [token]);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const currentUser = await api.get<User>('/auth/me');
          setUser(currentUser);
          localStorage.setItem('viora_user', JSON.stringify(currentUser));
        } catch {
          logout();
        }
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      usernameOrEmail,
      password,
    });

    localStorage.setItem('viora_access_token', data.accessToken);
    localStorage.setItem('viora_refresh_token', data.refreshToken);
    localStorage.setItem('viora_user', JSON.stringify(data.user));

    setToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (username: string, email: string, password: string, displayName?: string) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', {
      username,
      email,
      password,
      displayName,
    });

    localStorage.setItem('viora_access_token', data.accessToken);
    localStorage.setItem('viora_refresh_token', data.refreshToken);
    localStorage.setItem('viora_user', JSON.stringify(data.user));

    setToken(data.accessToken);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('viora_access_token');
    localStorage.removeItem('viora_refresh_token');
    localStorage.removeItem('viora_user');
    setToken(null);
    setUser(null);
    stompService.disconnect();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        loading,
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
