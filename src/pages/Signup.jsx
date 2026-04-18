import { useState } from 'react';
import { GraduationCap, Eye, EyeOff, ArrowRight, Mail, Lock, User, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { branches } from '../data/mockData';

export default function Signup({ onSwitchToLogin }) {
  const { signup } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: '',
    branch: '',
    year: '',
    bio: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      addToast('Passwords do not match', 'error');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      addToast('Password must be at least 6 characters', 'error');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 1000));

    const result = await signup(form);
    if (!result.success) {
      setError(result.error);
      addToast(result.error, 'error');
      setStep(1);
    } else {
      addToast('Account created! Welcome to StuGrow!', 'success');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#080b14] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-slate-300/40 to-slate-200/20 dark:from-slate-800/30 dark:to-slate-700/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-slate-200/40 to-slate-100/20 dark:from-slate-800/20 dark:to-slate-900/10 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full bg-gradient-to-bl from-violet-200/15 to-transparent dark:from-violet-900/10 blur-3xl" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 rounded-full bg-gradient-to-tl from-emerald-200/10 to-transparent dark:from-emerald-900/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 dark:from-slate-200 dark:to-slate-50 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-slate-900/20 dark:shadow-slate-100/10">
            <GraduationCap className="w-9 h-9 text-white dark:text-slate-900" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Join StuGrow</h1>
          <p className="text-slate-400 dark:text-slate-500 mt-2.5 text-base font-medium">Create your student profile</p>
        </div>

        <div className="card p-8 animate-slide-up shadow-2xl shadow-slate-200/60 dark:shadow-slate-900/60" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center gap-2 mb-7">
            <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-300 dark:to-slate-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-300 dark:to-slate-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-900/15 border border-rose-200/60 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-sm mb-5 animate-scale-in font-medium">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Full name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="Your full name"
                    className="input-field pl-11"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">@</span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => updateForm('username', e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''))}
                    placeholder="your.username"
                    className="input-field pl-11"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">College email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    placeholder="you@college.ac.in"
                    className="input-field pl-11"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    placeholder="Min 6 characters"
                    className="input-field pl-11 pr-11"
                    required
                    minLength={6}
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

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => updateForm('confirmPassword', e.target.value)}
                    placeholder="Confirm your password"
                    className="input-field pl-11"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 mt-2 text-[15px]">
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">College name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                  <input
                    type="text"
                    value={form.college}
                    onChange={(e) => updateForm('college', e.target.value)}
                    placeholder="Your college name"
                    className="input-field pl-11"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Branch</label>
                  <select
                    value={form.branch}
                    onChange={(e) => updateForm('branch', e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Select</option>
                    {branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Year</label>
                  <select
                    value={form.year}
                    onChange={(e) => updateForm('year', e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Select</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Bio <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={form.bio}
                  onChange={(e) => updateForm('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="input-field resize-none h-20"
                  maxLength={150}
                />
                <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{form.bio.length}/150</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 btn-secondary py-3 text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-[15px]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-7 pt-6 border-t border-slate-100 dark:border-slate-800/50 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-slate-900 dark:text-white font-semibold hover:underline underline-offset-2"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}