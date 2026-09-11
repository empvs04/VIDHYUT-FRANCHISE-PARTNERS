import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('vidhyut_admin_token');
      const savedUser = localStorage.getItem('vidhyut_admin_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify with server
          const response = await api.get('/auth/me');
          if (response.data?.data?.user) {
            setUser(response.data.data.user);
            localStorage.setItem('vidhyut_admin_user', JSON.stringify(response.data.data.user));
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/admin/login', { email, password });
    const { token, user: userData } = response.data.data;

    localStorage.setItem('vidhyut_admin_token', token);
    localStorage.setItem('vidhyut_admin_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('vidhyut_admin_token');
    localStorage.removeItem('vidhyut_admin_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
