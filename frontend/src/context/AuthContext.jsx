import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('netcom_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('netcom_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const apiResponse = await authApi.getMe();
          if (apiResponse.data && apiResponse.data.user) {
            setUser(apiResponse.data.user);
            localStorage.setItem('netcom_user', JSON.stringify(apiResponse.data.user));
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, [token]);

  const login = async (username, password) => {
    const apiResponse = await authApi.login(username, password);
    const responsePayload = apiResponse.data;
    const authData = responsePayload.data || responsePayload;
    if (authData.token && authData.user) {
      setToken(authData.token);
      setUser(authData.user);
      localStorage.setItem('netcom_token', authData.token);
      localStorage.setItem('netcom_user', JSON.stringify(authData.user));
      return { success: true, user: authData.user };
    }
    throw new Error(responsePayload.message || 'Authentication failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('netcom_token');
    localStorage.removeItem('netcom_user');
  };

  const hasRole = (allowedRoles) => {
    if (!user || !user.role) return false;
    if (typeof allowedRoles === 'string') return user.role === allowedRoles;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        role: user?.role || 'viewer',
        loading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contextValue = useContext(AuthContext);
  if (!contextValue) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return contextValue;
}
