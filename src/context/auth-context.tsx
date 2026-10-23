"use client";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { isConfigured } from "@/lib/utils";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  role: string;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (displayName: string, avatarUrl?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getCachedProfile(userId: string): { display_name?: string | null; avatar_url?: string | null; role?: string | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`orbit_profile_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedProfile(userId: string, data: { display_name?: string | null; avatar_url?: string | null; role?: string | null }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`orbit_profile_${userId}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const cached = getCachedProfile(userId);

    const { data: authData } = await supabase.auth.getUser();
    const meta = authData.user?.user_metadata as
      | { display_name?: string; avatar_url?: string; role?: string }
      | undefined;

    let dbData: { id: string; display_name: string | null; avatar_url: string | null; role?: string | null } | null = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role")
        .eq("id", userId)
        .maybeSingle();
      dbData = data;
    } catch {
      // In case role column query fails before migration is run
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      dbData = data;
    }

    const resolvedName =
      cached?.display_name ??
      dbData?.display_name ??
      meta?.display_name ??
      authData.user?.email?.split("@")[0] ??
      "Listener";

    const resolvedAvatar =
      cached?.avatar_url ??
      dbData?.avatar_url ??
      meta?.avatar_url ??
      null;

    const resolvedRole =
      dbData?.role ??
      meta?.role ??
      cached?.role ??
      "user";

    const resolvedProfile: Profile = {
      id: userId,
      display_name: resolvedName,
      avatar_url: resolvedAvatar,
      role: resolvedRole,
    };

    setProfile(resolvedProfile);
    setCachedProfile(userId, { display_name: resolvedName, avatar_url: resolvedAvatar, role: resolvedRole });

    // Ensure profiles table has the record
    if (!dbData) {
      try {
        await supabase
          .from("profiles")
          .upsert(
            {
              id: userId,
              display_name: resolvedName,
              avatar_url: resolvedAvatar,
              role: resolvedRole,
            },
            { onConflict: "id" }
          );
      } catch {
        // Ignore if table schema lacks privileges
      }
    }
  }, []);

  const updateProfile = useCallback(
    async (displayName: string, avatarUrl?: string) => {
      const activeUser = user;
      if (!activeUser) return;
      const supabase = createClient();
      const nextName = displayName.trim() || null;
      const nextAvatar = avatarUrl?.trim() || null;

      // 1. Update local state immediately for snappy UX
      setProfile((prev) => ({
        id: activeUser.id,
        display_name: nextName,
        avatar_url: nextAvatar,
        role: prev?.role || "user",
      }));
      setCachedProfile(activeUser.id, {
        display_name: nextName,
        avatar_url: nextAvatar,
        role: profile?.role || "user",
      });

      // 2. Update Supabase Auth metadata
      try {
        const { error: authError } = await supabase.auth.updateUser({
          data: { display_name: nextName, avatar_url: nextAvatar },
        });
        if (authError) {
          console.warn("Auth user update error:", authError.message);
        }
      } catch (e) {
        console.warn("Failed to update user auth metadata:", e);
      }

      // 3. Update Supabase profiles table
      try {
        await supabase.from("profiles").upsert(
          {
            id: activeUser.id,
            display_name: nextName,
            avatar_url: nextAvatar,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (e) {
        console.warn("Failed to upsert profile record:", e);
      }
    },
    [user, profile]
  );

  useEffect(() => {
    if (!configured) {
      return;
    }

    const supabase = createClient();

    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
        if (data.user) {
          await loadProfile(data.user.id);
        }
      } finally {
        setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        void loadProfile(nextUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [configured, loadProfile]);

  const role = profile?.role || "user";
  const isAdmin = role.toLowerCase() === "admin";

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      profile,
      role,
      isAdmin,
      refreshProfile: async () => {
        if (user) await loadProfile(user.id);
      },
      updateProfile,
      signOut: async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
      },
    }),
    [configured, loading, user, profile, role, isAdmin, loadProfile, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
