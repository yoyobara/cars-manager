import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'member';
  family_id: string;
  allowed_car_ids: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    familyName?: string,
    inviteCode?: string
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await apiClient.get<User>('/auth/me');
      setUser(response.data);
    } catch (error) {
      setUser(null);
      localStorage.removeItem('cars_manager_token');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('cars_manager_token');
      if (token) {
        await refreshUser();
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post<{ access_token: string }>('/auth/login', {
      email,
      password,
    });
    localStorage.setItem('cars_manager_token', response.data.access_token);
    await refreshUser();
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    familyName?: string,
    inviteCode?: string
  ) => {
    const response = await apiClient.post<{ access_token: string }>('/auth/register', {
      name,
      email,
      password,
      role: familyName ? 'manager' : 'member',
      family_name: familyName || undefined,
      invite_code: inviteCode || undefined,
    });
    localStorage.setItem('cars_manager_token', response.data.access_token);
    await refreshUser();
  };

  const logout = () => {
    localStorage.removeItem('cars_manager_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
