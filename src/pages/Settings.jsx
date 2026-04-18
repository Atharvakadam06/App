import { useState } from 'react';
import { Sun, Moon, Bell, Lock, Eye, Globe, User, Shield, HelpCircle, LogOut, ChevronRight, Smartphone, Check, X, Trash2, Download, Ban } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { clearAllData, exportUserData, deleteUser } from '../services/data';

function SettingsSection({ title, children }) {
  return (
    <div className="card p-5 sm:p-6 mb-5">
      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function SettingsItem({ icon, label, description, onClick, danger }) {
  const Icon = icon;
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between py-3.5 ${danger ? '' : 'border-b'} last:border-0 hover:bg-[#f8f6f3] dark:hover:bg-[#0e1322]/50 -mx-2 px-2 rounded-xl transition-all duration-200`} style={danger ? {} : {borderColor: '#e8e5e0'}}>
      <div className="flex items-center gap-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-rose-50 dark:bg-rose-900/15' : 'bg-[#f3f1ed] dark:bg-[#0e1322]'}`}>
          <Icon className={`w-[18px] h-[18px] ${danger ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`} />
        </div>
        <div className="text-left">
          <p className={`font-semibold text-sm ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>{label}</p>
          {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{description}</p>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
    </button>
  );
}

function Toggle({ enabled, onChange }) {
  return (
    <button onClick={() => onChange(!enabled)} className={`relative w-12 h-6.5 rounded-full transition-all duration-300 flex-shrink-0 ${enabled ? 'bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-300 dark:to-slate-400 shadow-sm' : 'bg-slate-200 dark:bg-slate-700'}`} style={{height: '26px'}}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 transition-transform duration-300 shadow-sm ${enabled ? 'translate-x-[22px]' : 'translate-x-0'}`} />
    </button>
  );
}

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = () => {
    if (!form.newPass || form.newPass.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.newPass !== form.confirm) { setError('Passwords do not match'); return; }
    setSuccess(true);
    addToast('Password updated!', 'success');
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full animate-scale-in shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Change Password</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password updated!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}
            <input type="password" placeholder="Current password" className="input-field" value={form.current} onChange={(e) => setForm(p => ({...p, current: e.target.value}))} />
            <input type="password" placeholder="New password" className="input-field" value={form.newPass} onChange={(e) => setForm(p => ({...p, newPass: e.target.value}))} />
            <input type="password" placeholder="Confirm new password" className="input-field" value={form.confirm} onChange={(e) => setForm(p => ({...p, confirm: e.target.value}))} />
            <button onClick={handleSubmit} className="btn-primary w-full py-3 text-sm font-semibold">Update Password</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileVisibilityModal({ onClose }) {
  const [visibility, setVisibility] = useState('public');
  const { addToast } = useToast();

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full animate-scale-in shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Profile Visibility</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          {[{v: 'public', label: 'Public', desc: 'Anyone can see your profile'}, {v: 'campus', label: 'Campus Only', desc: 'Only students from your college'}, {v: 'private', label: 'Private', desc: 'Only your connections'}].map(opt => (
            <button key={opt.v} onClick={() => setVisibility(opt.v)} className={`w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200 ${visibility === opt.v ? 'border-slate-700 dark:border-slate-300 bg-[#f5f3ef] dark:bg-[#0e1322] shadow-sm' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{opt.label}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
        <button onClick={() => { addToast('Visibility updated!', 'success'); onClose(); }} className="btn-primary w-full mt-5 py-3 text-sm font-semibold">Save</button>
      </div>
    </div>
  );
}

function ClearDataModal({ onClose }) {
  const { addToast } = useToast();

  const handleClear = async () => {
    try {
      await clearAllData();
      addToast('All data cleared!', 'success');
      window.location.reload();
    } catch {
      addToast('Failed to clear data. Check database connection.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full animate-scale-in shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-7 h-7 text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Clear All Data?</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">This will delete all posts, papers, books, and messages. This cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5 text-sm font-semibold">Cancel</button>
          <button onClick={handleClear} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg font-semibold text-sm hover:bg-rose-700 transition-all duration-200 active:scale-[0.97]">Clear All</button>
        </div>
      </div>
    </div>
  );
}

function ExportDataModal({ onClose, onExport }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full animate-scale-in shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Download className="w-7 h-7 text-slate-500 dark:text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Export Your Data</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">Download all your posts, comments, likes, saved items, and connections.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5 text-sm font-semibold">Cancel</button>
          <button onClick={onExport} className="flex-1 px-4 py-2.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-lg font-semibold text-sm hover:bg-slate-900 dark:hover:bg-slate-100 transition-all duration-200 active:scale-[0.97]">Download</button>
        </div>
      </div>
    </div>
  );
}

function DeleteAccountModal({ onClose, onDelete }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full animate-scale-in shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-7 h-7 text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Delete Account?</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">This will permanently delete your account and all data. This action cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary py-2.5 text-sm font-semibold">Cancel</button>
          <button onClick={onDelete} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg font-semibold text-sm hover:bg-rose-700 transition-all duration-200 active:scale-[0.97]">Delete Account</button>
        </div>
      </div>
    </div>
  );
}

function ThemeSelector() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <SettingsSection title="Appearance">
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-medium">Choose how StuGrow looks</p>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { if (darkMode) toggleTheme(); }} className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] ${!darkMode ? 'border-slate-700 dark:border-slate-300 bg-[#f5f3ef] dark:bg-[#0e1322] shadow-sm' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
          <div className="w-full aspect-video rounded-lg bg-white mb-3 flex items-center justify-center border border-slate-100 shadow-inner">
            <Sun className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Light</p>
        </button>
        <button onClick={() => { if (!darkMode) toggleTheme(); }} className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] ${darkMode ? 'border-slate-700 dark:border-slate-300 bg-[#f5f3ef] dark:bg-[#0e1322] shadow-sm' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
          <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-[#080b14] to-[#151a28] mb-3 flex items-center justify-center border border-slate-800">
            <Moon className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Dark</p>
        </button>
      </div>
    </SettingsSection>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState({ messages: true, connections: true, resources: false });

  return (
    <SettingsSection title="Notifications">
      <div className="space-y-0.5">
        {[
          { key: 'messages', icon: Bell, label: 'New Messages', desc: 'Get notified for new messages' },
          { key: 'connections', icon: User, label: 'New Connections', desc: 'When someone links with you' },
          { key: 'resources', icon: Globe, label: 'Resource Updates', desc: 'New papers and books' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-3.5" style={{borderBottom: '1px solid #e8e5e0'}}>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center flex-shrink-0">
                <item.icon className="w-[18px] h-[18px] text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{item.desc}</p>
              </div>
            </div>
            <Toggle enabled={settings[item.key]} onChange={(v) => setSettings(p => ({ ...p, [item.key]: v }))} />
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

export default function Settings() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showVisibility, setShowVisibility] = useState(false);
  const [showClearData, setShowClearData] = useState(false);
  const [showExportData, setShowExportData] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const handleExportData = async () => {
    try {
      const data = await exportUserData(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stugrow-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Data exported successfully!', 'success');
    } catch {
      addToast('Failed to export data.', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(user.id);
      addToast('Account deleted successfully.', 'success');
      logout();
    } catch {
      addToast('Failed to delete account.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto overflow-x-hidden">
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
      {showVisibility && <ProfileVisibilityModal onClose={() => setShowVisibility(false)} />}
      {showClearData && <ClearDataModal onClose={() => setShowClearData(false)} />}
      {showExportData && <ExportDataModal onClose={() => setShowExportData(false)} onExport={handleExportData} />}
      {showDeleteAccount && <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} onDelete={handleDeleteAccount} />}

      <ThemeSelector />
      <NotificationSettings />
      <SettingsSection title="Privacy & Security">
        <SettingsItem icon={Lock} label="Change Password" description="Update your account password" onClick={() => setShowPassword(true)} />
        <SettingsItem icon={Eye} label="Profile Visibility" description="Control who can see your profile" onClick={() => setShowVisibility(true)} />
        <SettingsItem icon={Shield} label="Two-Factor Authentication" description="Add an extra layer of security" onClick={() => addToast('Two-factor authentication coming soon!', 'info')} />
      </SettingsSection>
      <SettingsSection title="Data & Account">
        <SettingsItem icon={Download} label="Export My Data" description="Download all your data" onClick={() => setShowExportData(true)} />
        <SettingsItem icon={Trash2} label="Clear All Data" description="Delete all posts, papers, books, messages" onClick={() => setShowClearData(true)} danger />
        <SettingsItem icon={Trash2} label="Delete Account" description="Permanently delete your account" onClick={() => setShowDeleteAccount(true)} danger />
      </SettingsSection>
      <SettingsSection title="General">
        <SettingsItem icon={User} label="Edit Profile" description={user?.email} onClick={() => navigate('/profile')} />
        <SettingsItem icon={Globe} label="Language" description="English" onClick={() => addToast('Language settings coming soon!', 'info')} />
        <SettingsItem icon={HelpCircle} label="Help & Support" description="Get help with StuGrow" onClick={() => addToast('For support, contact support@stugrow.app', 'info')} />
        <SettingsItem icon={LogOut} label="Sign Out" description="Log out of your account" onClick={logout} danger />
      </SettingsSection>
    </div>
  );
}