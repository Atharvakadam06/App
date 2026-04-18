import { useState } from 'react';
import { GraduationCap, Eye, EyeOff, ArrowRight, Mail, Lock, Zap } from 'lucide-react';
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

    await new Promise(r => setTimeout(r, 800));

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
      addToast(result.error, 'error');
    } else {
      addToast('Welcome back!', 'success');
    }
    setLoading(false);
  };

  const handleQuickLogin = async (account) => {
    setError('');
    setLoading(true);
    setEmail(account.email);
    setPassword(account.password);
    await new Promise(r => setTimeout(r, 500));
    const result = await login(account.email, account.password);
    if (!result.success) {
      setError(result.error);
      addToast(result.error, 'error');
    } else {
      addToast('Welcome back!', 'success');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#080b14] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-slate-300/40 to-slate-200/20 dark:from-slate-800/30 dark:to-slate-700/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-slate-200/40 to-slate-100/20 dark:from-slate-800/20 dark:to-slate-900/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-slate-200/20 to-transparent dark:from-slate-800/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full bg-gradient-to-tr from-amber-200/15 to-transparent dark:from-amber-900/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 dark:from-slate-200 dark:to-slate-50 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-slate-900/20 dark:shadow-slate-100/10">
            <GraduationCap className="w-9 h-9 text-white dark:text-slate-900" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Welcome back</h1>
          <p className="text-slate-400 dark:text-slate-500 mt-2.5 text-base font-medium">Sign in to continue to StuGrow</p>
        </div>

        <div className="card p-8 animate-slide-up shadow-2xl shadow-slate-200/60 dark:shadow-slate-900/60" style={{animationDelay: '0.1s'}}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-900/15 border border-rose-200/60 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-sm animate-scale-in font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
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
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500 accent-slate-800 dark:accent-slate-200" />
                <span className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Remember me</span>
              </label>
              <button type="button" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 mt-2 text-[15px]"
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

          <div className="mt-7 pt-6 border-t border-slate-100 dark:border-slate-800/50 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-slate-900 dark:text-white font-semibold hover:underline underline-offset-2"
              >
                Create one
              </button>
            </p>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/50">
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-3 flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Quick demo login
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account)}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/40 transition-all text-left disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-400 dark:to-slate-200 flex items-center justify-center text-white dark:text-slate-900 text-xs font-bold shrink-0">
                    {account.displayName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{account.displayName}</p>
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