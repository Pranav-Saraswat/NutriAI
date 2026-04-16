import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { UserProfile } from "../types/api";

interface LoginParams {
  token: string;
  user: UserProfile;
}

interface AuthContextValue {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  loading: boolean;
  isAuthenticated: boolean;
  login: (params: LoginParams) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nutriai_token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((response) => setUser(response.data.data as UserProfile))
      .catch(() => {
        localStorage.removeItem("nutriai_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = ({ token, user: authUser }: LoginParams) => {
    localStorage.setItem("nutriai_token", token);
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem("nutriai_token");
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, setUser, loading, isAuthenticated: Boolean(user), login, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
