import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import { setLogoutCallback, getUsername } from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  const logout = useCallback(() => {
    authApi.logout();
    setIsAuthenticated(false);
    setUsername(null);
  }, []);

  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await authApi.verifyToken();
      if (user) {
        setIsAuthenticated(true);
        setUsername(getUsername());
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const data = await authApi.login(username, password);
    setIsAuthenticated(true);
    setUsername(data.username);
  };

  const register = async (username: string, password: string) => {
    const data = await authApi.register(username, password);
    setIsAuthenticated(true);
    setUsername(data.username);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, username, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
