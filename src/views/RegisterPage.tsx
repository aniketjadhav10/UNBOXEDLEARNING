// Register Page — creates an account via email/password (auto-approved, see
// supabase/auto_approve_password_signups.sql). Matches LoginPage's visual language.
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, GraduationCap, Loader2, Mail, UserPlus } from 'lucide-react';
import { signUpWithPassword } from '../services/supabase';

export function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { session, user } = await signUpWithPassword(email, password, name.trim() || undefined);
      if (session) {
        router.replace('/');
      } else if (user && user.identities && user.identities.length === 0) {
        // Supabase silently no-ops signUp for an email that's already registered
        // (no error, no email sent) to avoid leaking which emails exist. This is
        // the documented way to detect that case client-side.
        setError(
          'An account with this email already exists. Sign in below — use "Continue with Google" if that’s how you originally signed up, or reset your password from the sign-in page.',
        );
      } else {
        setCheckEmail(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] p-4">
      <div className="fixed -top-20 -left-20 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-20 -right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl items-center justify-center shadow-2xl mb-4">
            <GraduationCap size={30} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">UnBoxed Learning</h1>
          <p className="text-violet-300 text-sm mt-1">Create your homeschool hub account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {checkEmail ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-violet-100 text-violet-500 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail size={28} />
              </div>
              <h2 className="text-gray-900 text-lg font-bold mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-6">
                We sent a confirmation link to <span className="font-medium text-gray-800">{email}</span>.
                Click it to activate your account, then sign in.
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-gray-900 text-lg font-bold mb-6">Create your account</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5" htmlFor="register-name">
                    Full name
                  </label>
                  <input
                    id="register-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5" htmlFor="register-email">
                    Email address
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5" htmlFor="register-password">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-3 pr-11 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
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

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5" htmlFor="register-confirm">
                    Confirm password
                  </label>
                  <input
                    id="register-confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password || !confirmPassword}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm mt-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
