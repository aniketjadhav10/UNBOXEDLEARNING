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
  };
}

// ── Context shape ─────────────────────────────────────────────
interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  isAdmin: boolean;
  authLoading: boolean; // true while resolving initial session
  signOut: () => Promise<void>;
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
        .select('display_name, is_admin')
        .eq('id', su.id)
        .single();
      setUser(mapUser(su, data?.is_admin ?? false, data?.display_name));
    } catch {
      // Profile may not exist yet — default to non-admin
      setUser(mapUser(su, false));
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin: user?.role === 'admin',
        authLoading,
        signOut,
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
