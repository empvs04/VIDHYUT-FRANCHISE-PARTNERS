import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('vidhyut_auth_token') || localStorage.getItem('vidhyut_admin_token');
      const savedUser = localStorage.getItem('vidhyut_auth_user') || localStorage.getItem('vidhyut_admin_user');
      const savedPartner = localStorage.getItem('vidhyut_auth_partner');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          if (savedPartner) setPartner(JSON.parse(savedPartner));

          // Verify with server
          const response = await api.get('/auth/me');
          if (response.data?.data?.user) {
            const userData = response.data.data.user;
            const partnerData = response.data.data.partner;

            setUser(userData);
            setPartner(partnerData || null);

            localStorage.setItem('vidhyut_auth_user', JSON.stringify(userData));
            if (partnerData) {
              localStorage.setItem('vidhyut_auth_partner', JSON.stringify(partnerData));
            } else {
              localStorage.removeItem('vidhyut_auth_partner');
            }
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Super Admin Password Login
  const loginAdmin = async (email, password) => {
    const response = await api.post('/auth/admin/login', { email, password });
    const { token, user: userData } = response.data.data;

    localStorage.setItem('vidhyut_auth_token', token);
    localStorage.setItem('vidhyut_admin_token', token); // For backwards compatibility
    localStorage.setItem('vidhyut_auth_user', JSON.stringify(userData));
    localStorage.removeItem('vidhyut_auth_partner');

    setUser(userData);
    setPartner(null);
    return userData;
  };

  // Franchise Partner Request OTP
  const requestPartnerOTP = async (identifier) => {
    const response = await api.post('/auth/partner/request-otp', { identifier });
    return response.data?.data;
  };

  // Franchise Partner Verify OTP & Login
  const verifyPartnerOTP = async (identifier, otp) => {
    const response = await api.post('/auth/partner/verify-otp', { identifier, otp });
    const { token, user: userData, partner: partnerData } = response.data.data;

    localStorage.setItem('vidhyut_auth_token', token);
    localStorage.setItem('vidhyut_auth_user', JSON.stringify(userData));
    localStorage.setItem('vidhyut_auth_partner', JSON.stringify(partnerData));

    setUser(userData);
    setPartner(partnerData);
    return { user: userData, partner: partnerData };
  };

  // Resend OTP
  const resendPartnerOTP = async (identifier) => {
    const response = await api.post('/auth/partner/resend-otp', { identifier });
    return response.data?.data;
  };

  const logout = () => {
    localStorage.removeItem('vidhyut_auth_token');
    localStorage.removeItem('vidhyut_admin_token');
    localStorage.removeItem('vidhyut_auth_user');
    localStorage.removeItem('vidhyut_admin_user');
    localStorage.removeItem('vidhyut_auth_partner');
    setUser(null);
    setPartner(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        partner,
        login: loginAdmin,
        loginAdmin,
        requestPartnerOTP,
        verifyPartnerOTP,
        resendPartnerOTP,
        logout,
        loading,
        isAuthenticated: !!user,
        isSuperAdmin: user?.role === 'SUPER_ADMIN',
        isPartner: user && user?.role !== 'SUPER_ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
