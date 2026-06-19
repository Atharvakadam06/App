import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, Mail, Lock, Zap, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DEMO_ACCOUNTS } from '../services/firebase';

export default function Login({ onSwitchToSignup }) {
  const { login } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 600));

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
      addToast(result.error, 'error');
    } else {
      addToast('Welcome back! 👋', 'success');
    }
    setLoading(false);
  };

  const handleQuickLogin = async (account) => {
    setError('');
    setLoading(true);
    setEmail(account.email);
    setPassword(account.password);
    await new Promise(r => setTimeout(r, 400));
    const result = await login(account.email, account.password);
    if (!result.success) {
      setError(result.error);
      addToast(result.error, 'error');
    } else {
      addToast('Welcome back! 👋', 'success');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen min-h-dvh bg-[#faf8f5] dark:bg-[#080b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-200/30 to-blue-200/15 dark:from-violet-900/15 dark:to-blue-900/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-blue-200/25 to-indigo-200/15 dark:from-blue-900/15 dark:to-indigo-900/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-slate-200/20 to-transparent dark:from-slate-800/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="relative inline-block mb-5">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 dark:from-slate-100 dark:to-white w-[72px] h-[72px] flex items-center justify-center mx-auto shadow-2xl shadow-slate-900/30 dark:shadow-white/10">
              <img src="/logo.svg" alt="StuGrow" className="w-10 h-10" onError={(e) => { e.target.style.display='none'; }} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white dark:border-[#080b14] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Welcome back</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-base font-medium">
            Sign in to continue to <span className="text-slate-700 dark:text-slate-300 font-bold">StuGrow</span>
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white dark:bg-[#0e1322] rounded-3xl border border-slate-200/80 dark:border-[#151a28] shadow-2xl shadow-slate-200/60 dark:shadow-black/40 p-7 sm:p-8 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-900/15 border border-rose-200/60 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-sm animate-scale-in font-semibold">
                ⚠️ {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.ac.in"
                  className="input-field pl-11"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-11 pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Options row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500 accent-slate-800 dark:accent-slate-200"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors font-medium">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-semibold"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to sign up */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#151a28] text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-slate-900 dark:text-white font-bold hover:underline underline-offset-2"
              >
                Create one
              </button>
            </p>
          </div>

          {/* Demo accounts */}
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-[#151a28]">
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-3 flex items-center justify-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Quick demo login
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account)}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#080b14]/60 hover:bg-slate-100 dark:hover:bg-[#080b14] border border-slate-200/60 dark:border-[#151a28] transition-all text-left disabled:opacity-50 active:scale-95"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 flex items-center justify-center text-white dark:text-slate-900 text-xs font-black shrink-0">
                    {account.displayName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{account.displayName}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{account.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}