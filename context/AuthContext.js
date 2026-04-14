import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axios';
import { subscribeToUnauthorized } from '../api/authEvents';

const AuthContext = createContext();
const DEFAULT_CURRENCY = 'USD';

const extractCurrencyCode = (user, organization) =>
  user?.organization?.settings?.currency ||
  user?.settings?.currency ||
  user?.organizationSettings?.currency ||
  organization?.settings?.currency ||
  DEFAULT_CURRENCY;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyCurrency, setCompanyCurrency] = useState(DEFAULT_CURRENCY);

  const clearSession = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setUserToken(null);
    setUser(null);
    setCompanyCurrency(DEFAULT_CURRENCY);
  };

  const refreshCompanyCurrency = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/profile/organization');
      if (data?.success) {
        const code = extractCurrencyCode(null, data.data);
        setCompanyCurrency(code);
        return code;
      }
    } catch (e) {
      console.log('Loading company currency failed', e);
    }
    return DEFAULT_CURRENCY;
  }, []);

  // Load token on start
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');

        if (token && userData) {
          setUserToken(token);
          const storedUser = JSON.parse(userData);
          setUser(storedUser);
          setCompanyCurrency(extractCurrencyCode(storedUser));
          
          // Verify with API
          const { data } = await axiosInstance.get('/auth/me');
          if (data.success) {
            setUser(data.data);
            await AsyncStorage.setItem('user', JSON.stringify(data.data));
            setCompanyCurrency(extractCurrencyCode(data.data));
            if (!data.data?.organization?.settings?.currency && !data.data?.settings?.currency) {
              await refreshCompanyCurrency();
            }
          }
        }
      } catch (e) {
        console.log('Restoring token failed', e);
        await clearSession();
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  useEffect(() => {
    return subscribeToUnauthorized(async () => {
      setIsLoading(false);
      await clearSession();
    });
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.post('/auth/login', { email, password });
      if (data.success) {
        if (data.requiresOrgSelection) {
          setIsLoading(false);
          return { success: false, error: 'Organization selection is not yet supported in the mobile app.' };
        }

        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setUserToken(data.token);
        setUser(data.user);
        setCompanyCurrency(extractCurrencyCode(data.user));
        if (!data.user?.organization?.settings?.currency && !data.user?.settings?.currency) {
          await refreshCompanyCurrency();
        }
        setIsLoading(false);
        return { success: true };
      }
    } catch (error) {
      setIsLoading(false);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await clearSession();
    } catch (e) {
      console.log(e);
    }
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userToken,
      isLoading,
      companyCurrency,
      refreshCompanyCurrency,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
