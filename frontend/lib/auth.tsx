"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "./api";
import { demoUsers } from "./demo-data";
import { normalizeRole, type AuthUser, type LoginCredentials, type UserRole } from "./types";

interface StoredSession {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isHydrated: boolean;
  isSubmitting: boolean;
  error: string | null;
  isDemoSession: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  loginAsDemo: (role: UserRole) => Promise<AuthUser>;
  logout: () => void;
  clearError: () => void;
}

const STORAGE_KEY = "skilltrace.session.v1";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredSession(): StoredSession | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as StoredSession;
    if (!parsed.token || !parsed.user?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemoSession, setIsDemoSession] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
    setIsHydrated(true);
  }, []);

  const persist = useCallback((next: StoredSession, demo: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
    setIsDemoSession(demo);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await api.login(credentials);
        const role = normalizeRole(result.user.role);
        const profile = demoUsers[role];
        const user: AuthUser = {
          id: result.user.id,
          name: result.user.full_name || profile.name,
          email: result.user.email,
          role,
          organization: profile.organization,
        };
        const next: StoredSession = { token: result.access_token, user };
        persist(next, false);
        return user;
      } catch (caught) {
        const expectedPassword = credentials.password === "Demo@123";
        const expectedEmail = `${credentials.role ?? "trainee"}@skilltrace.in`;
        if (expectedPassword && credentials.email === expectedEmail) {
          const profile = demoUsers[credentials.role ?? "trainee"];
          const next: StoredSession = {
            token: `demo-${credentials.role ?? "trainee"}-${Date.now()}`,
            user: {
              id: `demo-${credentials.role ?? "trainee"}`,
              name: profile.name,
              email: profile.email,
              role: credentials.role ?? "trainee",
              organization: profile.organization,
            },
          };
          persist(next, true);
          return next.user;
        }
        const message =
          caught instanceof ApiError
            ? caught.message
            : "Unable to sign in. Please try again.";
        setError(message);
        throw caught;
      } finally {
        setIsSubmitting(false);
      }
    },
    [persist],
  );

  const loginAsDemo = useCallback(
    async (role: UserRole) =>
      login({
        email: `${role}@skilltrace.in`,
        password: "Demo@123",
        role,
      }),
    [login],
  );

  const clearError = useCallback(() => setError(null), []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setIsDemoSession(false);
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isHydrated,
      isSubmitting,
      error,
      isDemoSession,
      login,
      loginAsDemo,
      logout,
      clearError,
    }),
    [
      session,
      isHydrated,
      isSubmitting,
      error,
      isDemoSession,
      login,
      loginAsDemo,
      clearError,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
