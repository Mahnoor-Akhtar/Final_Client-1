import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, dataApi } from '../services/api';

export type AppRole = 'admin' | 'teacher' | 'student';

interface Session {
  user: { id: string; email: string; user_metadata?: { role?: string; [key: string]: any } };
  access_token: string;
}

interface AuthContextType {
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  role: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveRole = async (userId: string, metadataRole?: string): Promise<AppRole> => {
    // Prefer role from login/register response metadata
    if (metadataRole && ['admin', 'teacher', 'student'].includes(metadataRole)) {
      return metadataRole as AppRole;
    }
    try {
      const roles = await dataApi.getAll('user_roles', { user_id: userId });
      if (Array.isArray(roles) && roles.length > 0) {
        return roles[0].role as AppRole;
      }
    } catch {}
    return 'student';
  };

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('session');
        if (raw) {
          const s: Session = JSON.parse(raw);
          setSession(s);
          const r = await resolveRole(s.user.id);
          setRole(r);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (res?.error) throw new Error(res.error.message ?? 'Login failed');
    // Backend returns { data: { session: {...}, user: {...} }, error: null }
    const s: Session = res.data?.session ?? res.session ?? res;
    if (!s?.access_token || !s?.user?.id) throw new Error('Invalid response from server');
    await AsyncStorage.setItem('session', JSON.stringify(s));
    setSession(s);
    const metadataRole = s.user?.user_metadata?.role;
    const r = await resolveRole(s.user.id, metadataRole);
    setRole(r);
  };

  const register = async (email: string, password: string) => {
    const res = await authApi.register(email, password);
    if (res?.error) throw new Error(res.error.message ?? 'Registration failed');
    // Backend returns { data: { session: {...}, user: {...} }, error: null }
    const s: Session = res.data?.session ?? res.session ?? res;
    if (!s?.access_token || !s?.user?.id) throw new Error('Invalid response from server');
    await AsyncStorage.setItem('session', JSON.stringify(s));
    setSession(s);
    const metadataRole = s.user?.user_metadata?.role;
    const r = await resolveRole(s.user.id, metadataRole);
    setRole(r);
  };

  const logout = async () => {
    // Run backend logout in background without blocking local session clearance
    authApi.logout().catch((e) => {
      console.log('Background logout API call failed:', e);
    });

    try {
      await AsyncStorage.removeItem('session');
    } catch (e) {
      console.log('AsyncStorage remove item failed:', e);
    }
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, role, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
