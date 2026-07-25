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

type EmailOtpRequest = {
  userId: string;
  phrase: string;
};

interface AuthContextValue {
  user: Models.User<Models.Preferences> | null;
  profile: Profile | null;
  roles: string[]; // team ids the user belongs to, e.g. ["agents"]
  loading: boolean;
  isAdmin: boolean;
  hasRole: (team: string) => boolean;
  requestEmailOtp: (email: string) => Promise<EmailOtpRequest>;
  verifyEmailOtp: (userId: string, secret: string, name?: string) => Promise<void>;
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

  const requestEmailOtp = useCallback(async (email: string) => {
    const token = await account.createEmailToken({
      userId: ID.unique(),
      email,
      phrase: true,
    });
    return { userId: token.userId, phrase: token.phrase };
  }, []);

  const verifyEmailOtp = useCallback(
    async (userId: string, secret: string, name?: string) => {
      await account.createSession({ userId, secret });

      const trimmedName = name?.trim();
      if (trimmedName) {
        await account.updateName({ name: trimmedName });
      }

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
      requestEmailOtp,
      verifyEmailOtp,
      logout,
      refresh,
    }),
    [user, profile, roles, loading, requestEmailOtp, verifyEmailOtp, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
