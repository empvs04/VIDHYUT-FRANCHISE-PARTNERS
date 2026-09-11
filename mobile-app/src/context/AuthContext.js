import React, { createContext, useContext, useState, useEffect } from 'react';
import client, { storage } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [partner, setPartner] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedToken = await storage.getItem('partner_auth_token');
        const savedPartner = await storage.getItem('partner_profile');

        if (savedToken && savedPartner) {
          setToken(savedToken);
          setPartner(JSON.parse(savedPartner));

          // Background sync
          const res = await client.get('/auth/me');
          if (res.data?.data?.partner) {
            setPartner(res.data.data.partner);
            await storage.setItem('partner_profile', JSON.stringify(res.data.data.partner));
          }
        }
      } catch (err) {
        console.warn('Bootstrap auth load error:', err);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const requestOTP = async (mobileNumber) => {
    const res = await client.post('/auth/partner/request-otp', { mobileNumber });
    return res.data;
  };

  const resendOTP = async (mobileNumber) => {
    const res = await client.post('/auth/partner/resend-otp', { mobileNumber });
    return res.data;
  };

  const verifyOTP = async (mobileNumber, otp) => {
    const res = await client.post('/auth/partner/verify-otp', { mobileNumber, otp });
    const { token: authToken, partner: partnerData } = res.data.data;

    await storage.setItem('partner_auth_token', authToken);
    await storage.setItem('partner_profile', JSON.stringify(partnerData));

    setToken(authToken);
    setPartner(partnerData);
    return partnerData;
  };

  const logout = async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    }
    await storage.removeItem('partner_auth_token');
    await storage.removeItem('partner_profile');
    setToken(null);
    setPartner(null);
  };

  return (
    <AuthContext.Provider
      value={{
        partner,
        token,
        loading,
        isAuthenticated: !!token && !!partner,
        requestOTP,
        resendOTP,
        verifyOTP,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
