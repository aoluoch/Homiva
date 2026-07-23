import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Permission, Role, type Models } from "appwrite";
import { account, ID, Query, tablesDB, teams } from "@/lib/appwrite";
import { appwriteConfig, TABLES, TEAMS } from "@/lib/config";
import type { Profile } from "@/types/models";

interface AuthContextValue {
  user: Models.User<Models.Preferences> | null;
  profile: Profile | null;
  roles: string[]; // team ids the user belongs to, e.g. ["agents"]
  loading: boolean;
  isAdmin: boolean;
  hasRole: (team: string) => boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null,
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = useCallback(async () => {
    try {
      const res = await teams.list();
      setRoles(res.teams.map((t) => t.$id));
    } catch {
      setRoles([]);
    }
  }, []);

  const ensureProfile = useCallback(
    async (u: Models.User<Models.Preferences>) => {
      try {
        const existing = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: TABLES.profiles,
          queries: [Query.equal("userId", u.$id), Query.limit(1)],
        });
        if (existing.rows.length > 0) {
          setProfile(existing.rows[0] as unknown as Profile);
          return;
        }
        const created = await tablesDB.createRow({
          databaseId: appwriteConfig.databaseId,
          tableId: TABLES.profiles,
          rowId: ID.unique(),
          data: {
            userId: u.$id,
            name: u.name || u.email.split("@")[0],
            email: u.email,
            roles: [],
          },
          permissions: [
            Permission.read(Role.user(u.$id)),
            Permission.update(Role.user(u.$id)),
          ],
        });
        setProfile(created as unknown as Profile);
      } catch (err) {
        // A missing profile is non-fatal for browsing.
        console.warn("Could not load/create profile", err);
        setProfile(null);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const current = await account.get();
      setUser(current);
      await Promise.all([loadRoles(), ensureProfile(current)]);
    } catch {
      setUser(null);
      setProfile(null);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [ensureProfile, loadRoles]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await account.create({ userId: ID.unique(), email, password, name });
      await account.createEmailPasswordSession({ email, password });
      await refresh();
    },
    [refresh],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      await account.createEmailPasswordSession({ email, password });
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await account.deleteSession({ sessionId: "current" });
    } finally {
      setUser(null);
      setProfile(null);
      setRoles([]);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      roles,
      loading,
      isAdmin: roles.includes(TEAMS.admins),
      hasRole: (team: string) => roles.includes(team),
      register,
      login,
      logout,
      refresh,
    }),
    [user, profile, roles, loading, register, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
