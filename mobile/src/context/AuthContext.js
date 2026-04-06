import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

const DEFAULT_SERVER = 'http://192.168.1.100:3000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedAuth();
  }, []);

  async function loadSavedAuth() {
    try {
      const savedToken = await AsyncStorage.getItem('prabhat_token');
      const savedUser = await AsyncStorage.getItem('prabhat_user');
      const savedUrl = await AsyncStorage.getItem('prabhat_server_url');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
      if (savedUrl) setServerUrl(savedUrl);
    } catch {
      // Ignore storage errors
    } finally {
      setLoading(false);
    }
  }

  const updateServerUrl = useCallback(async (url) => {
    const cleanUrl = url.replace(/\/+$/, '');
    setServerUrl(cleanUrl);
    await AsyncStorage.setItem('prabhat_server_url', cleanUrl);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setToken(data.token);
    setUser(data.user);
    await AsyncStorage.setItem('prabhat_token', data.token);
    await AsyncStorage.setItem('prabhat_user', JSON.stringify(data.user));
    return data;
  }, [serverUrl]);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${serverUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore logout errors
      }
    }
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('prabhat_token');
    await AsyncStorage.removeItem('prabhat_user');
  }, [token, serverUrl]);

  const apiFetch = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${serverUrl}/api${url}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      await logout();
      throw new Error('Session expired');
    }
    return res;
  }, [token, serverUrl, logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, serverUrl, login, logout, apiFetch, updateServerUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
