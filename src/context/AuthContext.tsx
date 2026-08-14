// ============================================================
// AuthContext — Real Supabase auth session
// Checks existing session on mount, subscribes to auth changes,
// fetches profile (is_admin, display_name) from profiles table.
// ============================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

// ── App-level user shape ─────────────────────────────────────
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student';
  avatarInitials: string;
  avatarColor: string;
  isApproved: boolean;
  isSuperAdmin: boolean;
  isOnboarded: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function mapUser(
  su: SupabaseUser,
  isAdmin: boolean,
  isApproved: boolean,
  isSuperAdmin: boolean,
  isOnboarded: boolean,
  displayName?: string | null,
): AppUser {
  const name = displayName?.trim() || su.email?.split('@')[0] || 'User';
  return {
    id: su.id,
    name,
    email: su.email ?? '',
    role: isAdmin ? 'admin' : 'student',
    avatarInitials: getInitials(name),
    avatarColor: isAdmin
      ? 'from-violet-500 to-purple-600'
      : 'from-pink-400 to-rose-500',
    isApproved,
    isSuperAdmin,
    isOnboarded,
  };
}

// ── Context shape ─────────────────────────────────────────────
interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  isAdmin: boolean;
  isApproved: boolean;
  isSuperAdmin: boolean;
  isOnboarded: boolean;
  isNewUser: boolean; // true for ~5 min after first sign-up
  authLoading: boolean; // true while resolving initial session
  signOut: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  markOnboardedLocally: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<AppUser | null>(null);
  const [session,     setSession]     = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  /** Fetch profiles row and map to AppUser */
  const loadProfile = useCallback(async (su: SupabaseUser) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, is_admin, is_approved, is_super_admin, is_onboarded')
        .eq('id', su.id)
        .single();
      setUser(mapUser(su, data?.is_admin ?? false, data?.is_approved ?? false, data?.is_super_admin ?? false, data?.is_onboarded ?? false, data?.display_name));
    } catch {
      // Profile may not exist yet — default to non-admin, non-approved, non-onboarded
      setUser(mapUser(su, false, false, false, false));
    }
  }, []);

  useEffect(() => {
    // 1. Restore existing session from localStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user).finally(() => setAuthLoading(false));
      } else {
        setAuthLoading(false);
      }
    });

    // 2. Keep in sync with Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          loadProfile(session.user);
        } else {
          setUser(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (displayName: string) => {
    if (!user) return;
    try {
      await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id);
      setUser({ ...user, name: displayName, avatarInitials: getInitials(displayName) });
    } catch (err) {
      console.error('Failed to update profile', err);
      throw err;
    }
  };

  const markOnboardedLocally = useCallback(() => {
    if (user) {
      setUser({ ...user, isOnboarded: true });
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin: user?.role === 'admin',
        isApproved: user?.isApproved ?? false,
        isSuperAdmin: user?.isSuperAdmin ?? false,
        isOnboarded: user?.isOnboarded ?? false,
        isNewUser: session?.user
          ? (Date.now() - new Date(session.user.created_at).getTime()) < 5 * 60 * 1000
          : false,
        authLoading,
        signOut,
        updateProfile,
        markOnboardedLocally,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
