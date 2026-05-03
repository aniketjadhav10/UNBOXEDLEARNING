import { FormEvent, useState } from 'react';
import { Chrome } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail, signInWithGoogle } from '../services/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      await signInWithEmail(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    }
  }

  async function handleGoogleSignIn() {
    setError('');

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with Google');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-md border border-black/10 bg-white p-6">
        <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-ink/60">Use your Supabase email and password account.</p>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 outline-none focus:border-moss focus:ring-2 focus:ring-moss/20"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 outline-none focus:border-moss focus:ring-2 focus:ring-moss/20"
              required
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        <button type="submit" className="mt-5 w-full rounded-md bg-ink px-4 py-2 font-medium text-white">
          Sign in
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10" />
          <span className="text-xs font-medium uppercase tracking-wide text-ink/45">or</span>
          <div className="h-px flex-1 bg-black/10" />
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-md border border-black/15 bg-white px-4 py-2 font-medium text-ink transition hover:bg-skywash"
          onClick={handleGoogleSignIn}
          type="button"
        >
          <Chrome aria-hidden="true" size={18} />
          Continue with Google
        </button>
      </form>
    </main>
  );
}
