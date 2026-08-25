// Forgot Password Page — requests a password-reset email via Supabase.
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, Loader2, Mail, Send } from 'lucide-react';
import { requestPasswordReset } from '../services/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email.');
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
          <p className="text-violet-300 text-sm mt-1">Reset your password</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-violet-100 text-violet-500 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail size={28} />
              </div>
              <h2 className="text-gray-900 text-lg font-bold mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-6">
                If an account exists for <span className="font-medium text-gray-800">{email}</span>, we sent a link to reset your password.
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
              <Link href="/login" className="text-gray-400 hover:text-gray-600 transition-colors mb-4 inline-block">
                <ArrowLeft size={20} />
              </Link>
              <h2 className="text-gray-900 text-lg font-bold mb-2">Forgot your password?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Enter your email and we&apos;ll send you a link to reset it.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5" htmlFor="forgot-email">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
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
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm mt-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
