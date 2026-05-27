'use client';

import { useAuthContext } from '@/components/AuthProvider';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const hasRedirected = useRef(false);

  const goToDashboard = useCallback(() => {
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    if (user) {
      goToDashboard();
    }
  }, [user, goToDashboard]);

  if (user) {
    return null;
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
      goToDashboard();
    } catch (err: any) {
      setError(err.message || 'Google Sign In failed');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      goToDashboard();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <main className="min-screen w-full flex items-center justify-center bg-gradient-to-br from-bg via-surface to-[#101726] p-4 min-h-screen">
      <div className="w-full max-w-md bg-card/45 backdrop-blur-md border border-border/80 rounded-2xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        
        {/* Banner Section */}
        <div className="bg-cyan-bg/10 border-b border-border/50 p-8 text-center">
          <div className="w-14 h-14 bg-cyan/10 text-cyan rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-cyan/20">
            💰
          </div>
          <h1 className="font-syne text-2xl font-bold text-white tracking-tight leading-tight">
            FinanceAI
          </h1>
          <p className="text-text-muted text-sm mt-2 max-w-xs mx-auto">
            Track assets, UPI transactions, goals, and family accounts using intelligent insights.
          </p>
        </div>

        {/* Auth Forms */}
        <div className="p-8">
          {error && (
            <div className="mb-4 bg-red/10 border border-red/20 text-red text-xs px-4 py-3 rounded-lg flex items-center">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Toggle Tab */}
          <div className="flex border-b border-border/60 mb-6">
            <button
              onClick={() => { setIsSignUp(false); setError(''); }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-tight transition-colors border-b-2 ${
                !isSignUp ? 'border-cyan text-cyan' : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(''); }}
              className={`flex-1 pb-3 text-sm font-semibold tracking-tight transition-colors border-b-2 ${
                isSignUp ? 'border-cyan text-cyan' : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text focus:outline-none focus:border-cyan transition-colors"
                  placeholder="name@example.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password" autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text focus:outline-none focus:border-cyan transition-colors"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan text-bg font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-cyan/95 active:scale-[0.99] transition-all text-sm mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-bg border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Social Sign In */}
          <div className="relative my-6 flex items-center">
            <div className="flex-grow border-t border-border/60"></div>
            <span className="flex-shrink mx-4 text-text-dim text-[11px] font-bold uppercase tracking-widest">
              or
            </span>
            <div className="flex-grow border-t border-border/60"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full border border-border bg-white/[0.01] hover:bg-white/[0.04] text-text font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    </main>
  );
}
