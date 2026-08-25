// Login Page — styled with the app's design system
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, GraduationCap, Loader2, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signInWithPassword, signInWithGoogle, setRememberMePreference } from '../services/supabase';

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setRememberMePreference(rememberMe);
      await signInWithPassword(email, password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      // OAuth redirects, so no navigate() needed
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nav-from via-nav-to to-[#22182f] p-4 font-body">
      {/* Background decorations */}
      <div className="fixed -top-20 -left-20 w-72 h-72 bg-accent-pink/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-20 -right-20 w-72 h-72 bg-accent-coral/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-gradient-to-br from-accent-pink to-accent-coral rounded-2xl items-center justify-center shadow-2xl mb-4">
            <GraduationCap size={30} className="text-white" />
          </div>
          <h1 className="font-display text-white text-2xl font-bold">UnBoxed Learning</h1>
          <p className="text-violet-300 text-sm mt-1">Sign in to your homeschool hub</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="font-display text-gray-900 text-lg font-bold mb-6">Welcome back</h2>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5" htmlFor="login-email">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent-pink focus:ring-2 focus:ring-accent-pink/15 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-600" htmlFor="login-password">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-accent-pink hover:opacity-80">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-accent-pink focus:ring-2 focus:ring-accent-pink/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-accent-pink focus:ring-accent-pink"
              />
              Remember me
            </label>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-accent-pink to-accent-coral hover:opacity-90 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-opacity shadow-md mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60 text-gray-700 text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-accent-pink hover:opacity-80">
              Register
            </Link>
          </p>
        </div>

        <p className="text-center text-violet-400 text-xs mt-6 opacity-60">
          Secured with Supabase Auth · Row Level Security enabled
        </p>
      </div>
    </main>
  );
}
