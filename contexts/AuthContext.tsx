
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authService, LoginCredentials, SignUpCredentials } from '../services/authService';
import { useLanguage } from './LanguageContext';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  isAdmin: boolean; // New: To track admin status
  login: (credentials: LoginCredentials) => Promise<string | null>;
  signup: (credentials: SignUpCredentials) => Promise<string | null>;
  logout: () => void;
  adminLogin: (email: string, password: string) => Promise<string | null>; // New: Admin login function
  adminLogout: () => void; // New: Admin logout function
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // New: Admin state
  const [isLoading, setIsLoading] = useState(true); // Start as true to check auth status
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      setError(null);
      const authenticatedUser = authService.getLoggedInUser();
      const adminStatus = authService.isAdmin(); // Check admin status
      
      if (adminStatus) {
        setIsAdmin(true);
        setIsLoggedIn(false); // Admin is not a regular logged-in user in this context
        setUser(null);
      } else if (authenticatedUser) {
        setIsLoggedIn(true);
        setUser(authenticatedUser);
        setIsAdmin(false);
      } else {
        setIsLoggedIn(false);
        setUser(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    };
    checkAuthStatus();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<string | null> => {
    setError(null);
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(credentials);
      setIsLoggedIn(true);
      setUser(loggedInUser);
      setIsAdmin(false); // Ensure admin status is false for regular login
      setIsLoading(false);
      return null; // No error
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      return err.message; // Return error message
    }
  };

  const signup = async (credentials: SignUpCredentials): Promise<string | null> => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.register(credentials);
      setIsLoading(false);
      return null; // No error
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      return err.message; // Return error message
    }
  };

  const logout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setUser(null);
    setIsAdmin(false); // Clear admin status on regular logout
    setError(null);
    // Redirect to login page after logout (handled by App.tsx useEffect)
  };

  const adminLogin = async (email: string, password: string): Promise<string | null> => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.adminLogin(email, password);
      setIsAdmin(true);
      setIsLoggedIn(false); // Admin is separate from regular user login
      setUser(null);
      setIsLoading(false);
      return null;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      return err.message;
    }
  };

  const adminLogout = () => {
    authService.adminLogout();
    setIsAdmin(false);
    setIsLoggedIn(false); // Ensure both are false
    setUser(null);
    setError(null);
    // App.tsx will redirect to adminLogin or login view
  };

  const value = {
    isLoggedIn,
    user,
    isAdmin, // New: Admin status
    login,
    signup,
    logout,
    adminLogin, // New: Admin login function
    adminLogout, // New: Admin logout function
    isLoading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
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
