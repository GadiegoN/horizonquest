/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { api, ApiError } from "../lib/api";

import { XpModal } from "../components/xp-modal";

export type Stats = {
  totalQuestsCompleted: number;
  totalAchievements: number;
  totalXp: number;
};

export type User = {
  id: string;
  email: string;
  role: string;
  guildProfile?: {
    id: string;
    adventurerName: string;
    currentXp: number;
    nextRankXp?: number | null;
    rank: string;
    classId?: string | null;
    className?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    hqCoins?: number;
    equippedTitle?: string | null;
    equippedFrame?: string | null;
    equippedBadge?: string | null;
    equippedTheme?: string | null;
    stats?: Stats;
  };
};

export type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  error: string;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("hq_token"),
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refreshVersion = useRef(0);
  const [gainedXp, setGainedXp] = useState(0);

  const refreshUser = useCallback(async () => {
    const version = ++refreshVersion.current;
    const currentToken = localStorage.getItem("hq_token");
    if (!currentToken) return;
    const [data, stats] = await Promise.all([
      api.get("/auth/me"),
      api.get("/profile/stats"),
    ]);
    if (
      version !== refreshVersion.current ||
      currentToken !== localStorage.getItem("hq_token")
    )
      return;
    const profile = data.user.guildProfile;
    const key = `hq_xp_${profile.id}`;
    const previous = localStorage.getItem(key);
    if (previous !== null && profile.currentXp > Number(previous))
      setGainedXp((value) => value + profile.currentXp - Number(previous));
    localStorage.setItem(key, String(profile.currentXp));
    setUser({ ...data.user, guildProfile: { ...profile, stats } });
    setError("");
  }, []);

  useEffect(() => {
    let canceled = false;
    async function load() {
      try {
        await refreshUser();
      } catch (err) {
        if (canceled) return;
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem("hq_token");
          setToken(null);
          setUser(null);
        } else
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar seu perfil.",
          );
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 20000);
    window.addEventListener("focus", load);
    return () => {
      canceled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [token, refreshUser]);

  function login(token: string, user: User) {
    localStorage.setItem("hq_token", token);
    if (
      user.guildProfile &&
      localStorage.getItem(`hq_xp_${user.guildProfile.id}`) === null
    )
      localStorage.setItem(
        `hq_xp_${user.guildProfile.id}`,
        String(user.guildProfile.currentXp),
      );
    setToken(token);
    setUser(user);
    setGainedXp(0);
    setError("");
  }
  function logout() {
    localStorage.removeItem("hq_token");
    setToken(null);
    setUser(null);
    setGainedXp(0);
    setError("");
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        refreshUser,
        error,
        isAuthenticated: !!user && !!token,
        loading,
      }}
    >
      {children}
      {gainedXp > 0 && <XpModal xp={gainedXp} onClose={() => setGainedXp(0)} />}
    </AuthContext.Provider>
  );
}
