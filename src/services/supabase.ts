import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

const REMEMBER_ME_KEY = 'ul_remember_me';

/** Call before signing in so `downgradeSessionCookiesIfNotRemembered` knows the user's choice. */
export function setRememberMePreference(remember: boolean) {
  if (remember) {
    localStorage.removeItem(REMEMBER_ME_KEY);
  } else {
    localStorage.setItem(REMEMBER_ME_KEY, '0');
  }
}

/**
 * If "remember me" was left unchecked, re-write every Supabase auth cookie
 * (@supabase/ssr may chunk large tokens into `sb-<ref>-auth-token.0`, `.1`, …)
 * without max-age/expires, downgrading them to browser-session-only cookies.
 * Call this right after a successful sign-in.
 */
function downgradeSessionCookiesIfNotRemembered() {
  if (typeof document === 'undefined') return;
  if (localStorage.getItem(REMEMBER_ME_KEY) !== '0') return;

  document.cookie.split(';').forEach((entry) => {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex === -1) return;
    const name = entry.slice(0, separatorIndex).trim();
    if (!name.startsWith('sb-')) return;
    const value = entry.slice(separatorIndex + 1);
    // Re-set with the same name/value/path but no max-age/expires => session cookie.
    document.cookie = `${name}=${value}; path=/; samesite=lax${
      window.location.protocol === 'https:' ? '; secure' : ''
    }`;
  });
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  downgradeSessionCookiesIfNotRemembered();
  return data;
}

export async function signUpWithPassword(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, signup_source: 'password' },
    },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
