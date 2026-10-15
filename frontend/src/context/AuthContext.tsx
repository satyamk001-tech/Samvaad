import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { stompService } from '../services/stomp';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string, email: string, displayName: string, photoUrl?: string) => Promise<void>;
  loginWithPhone: (phoneNumber: string, displayName?: string, idToken?: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
  reloadUser: () => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('samvaad_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('samvaad_access_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('samvaad:auth_expired', handleAuthExpired);
    return () => window.removeEventListener('samvaad:auth_expired', handleAuthExpired);
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
          localStorage.setItem('samvaad_user', JSON.stringify(currentUser));
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

    localStorage.setItem('samvaad_access_token', data.accessToken);
    localStorage.setItem('samvaad_refresh_token', data.refreshToken);
    localStorage.setItem('samvaad_user', JSON.stringify(data.user));

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

    localStorage.setItem('samvaad_access_token', data.accessToken);
    localStorage.setItem('samvaad_refresh_token', data.refreshToken);
    localStorage.setItem('samvaad_user', JSON.stringify(data.user));

    setToken(data.accessToken);
    setUser(data.user);
  };

  const reloadUser = async () => {
    if (token) {
      try {
        const currentUser = await api.get<User>('/auth/me');
        setUser(currentUser);
        localStorage.setItem('samvaad_user', JSON.stringify(currentUser));
      } catch (e) {
        console.error('Failed to reload user', e);
      }
    }
  };

  const loginWithGoogle = async (idToken: string, email: string, displayName: string, photoUrl?: string) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/google', {
      idToken,
      email,
      displayName,
      photoUrl,
    });

    localStorage.setItem('samvaad_access_token', data.accessToken);
    localStorage.setItem('samvaad_refresh_token', data.refreshToken);
    localStorage.setItem('samvaad_user', JSON.stringify(data.user));

    setToken(data.accessToken);
    setUser(data.user);
  };

  const loginWithPhone = async (phoneNumber: string, displayName?: string, idToken?: string) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/phone', {
      phoneNumber,
      displayName,
      idToken,
    });

    localStorage.setItem('samvaad_access_token', data.accessToken);
    localStorage.setItem('samvaad_refresh_token', data.refreshToken);
    localStorage.setItem('samvaad_user', JSON.stringify(data.user));

    setToken(data.accessToken);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('samvaad_access_token');
    localStorage.removeItem('samvaad_refresh_token');
    localStorage.removeItem('samvaad_user');
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
        loginWithGoogle,
        loginWithPhone,
        register,
        reloadUser,
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
