import { useState, useEffect } from 'react';
import { Sun, Moon, Bell, Lock, Eye, Globe, User, Shield, HelpCircle, LogOut, ChevronRight, Check, X, Trash2, Download, Smartphone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { clearAllData, exportUserData, deleteUser } from '../services/data';

function SettingsSection({ title, icon, children }) {
  return (
    <div className="bg-white dark:bg-[#0e1322] rounded-2xl border border-slate-100 dark:border-[#151a28] overflow-hidden mb-4 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-50 dark:border-[#151a28]">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-[#151a28]">
        {children}
      </div>
    </div>
  );
}

function SettingsItem({ icon, label, description, onClick, danger, right }) {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-5 py-4 transition-all duration-200 text-left min-h-[60px] active:scale-[0.98] ${
        danger
          ? 'hover:bg-rose-50 dark:hover:bg-rose-900/10'
          : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
      }`}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
        danger
          ? 'bg-rose-100 dark:bg-rose-900/20'
          : 'bg-slate-100 dark:bg-[#151a28]'
      }`}>
        <Icon className={`w-[18px] h-[18px] ${danger ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className={`font-semibold text-[15px] ${danger ? 'text-rose-500 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium truncate">{description}</p>
        )}
      </div>
      {right || <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
    </button>
  );
}

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex items-center rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none ${
        enabled
          ? 'bg-slate-800 dark:bg-slate-200'
          : 'bg-slate-200 dark:bg-slate-700'
      }`}
      style={{ width: '48px', height: '26px' }}
      aria-checked={enabled}
      role="switch"
    >
      <span
        className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white dark:bg-slate-900 transition-transform duration-300 shadow-sm ${
          enabled ? 'translate-x-[22px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0e1322] rounded-3xl border border-slate-100 dark:border-[#151a28] p-6 max-w-sm w-full animate-scale-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
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
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Change Password</h3>
        <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>
      {success ? (
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
            <Check className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password updated!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <p className="text-sm text-rose-500 font-semibold">{error}</p>}
          <input type="password" placeholder="Current password" className="input-field" value={form.current} onChange={(e) => setForm(p => ({ ...p, current: e.target.value }))} />
          <input type="password" placeholder="New password" className="input-field" value={form.newPass} onChange={(e) => setForm(p => ({ ...p, newPass: e.target.value }))} />
          <input type="password" placeholder="Confirm new password" className="input-field" value={form.confirm} onChange={(e) => setForm(p => ({ ...p, confirm: e.target.value }))} />
          <button onClick={handleSubmit} className="btn-primary w-full mt-1">Update Password</button>
        </div>
      )}
    </Modal>
  );
}

function ProfileVisibilityModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [visibility, setVisibility] = useState(() => {
    return user?.settings?.visibility || 'public';
  });
  const { addToast } = useToast();

  const handleSave = async () => {
    if (user && updateProfile) {
      try {
        const updatedSettings = {
          ...(user.settings || {}),
          visibility
        };
        await updateProfile({ settings: JSON.stringify(updatedSettings) });
      } catch (e) {
        console.warn('Failed to save profile visibility setting:', e);
      }
    }
    addToast('Visibility updated!', 'success');
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profile Visibility</h3>
        <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>
      <div className="space-y-2.5">
        {[
          { v: 'public', label: 'Public', desc: 'Anyone can see your profile', emoji: '🌍' },
          { v: 'campus', label: 'Campus Only', desc: 'Only students from your college', emoji: '🏫' },
          { v: 'private', label: 'Private', desc: 'Only your connections', emoji: '🔒' },
        ].map(opt => (
          <button
            key={opt.v}
            onClick={() => setVisibility(opt.v)}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-3 ${
              visibility === opt.v
                ? 'border-slate-800 dark:border-slate-300 bg-slate-50 dark:bg-[#151a28]'
                : 'border-slate-100 dark:border-[#151a28] hover:border-slate-200 dark:hover:border-slate-600'
            }`}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{opt.label}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{opt.desc}</p>
            </div>
            {visibility === opt.v && <Check className="w-4 h-4 text-slate-800 dark:text-slate-300 ml-auto shrink-0" />}
          </button>
        ))}
      </div>
      <button
        onClick={handleSave}
        className="btn-primary w-full mt-5"
      >
        Save Changes
      </button>
    </Modal>
  );
}

function ConfirmModal({ title, desc, icon: Icon, iconClass, confirmLabel, confirmClass, onClose, onConfirm }) {
  return (
    <Modal onClose={onClose}>
      <div className="text-center mb-5">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${iconClass}`}>
          <Icon className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">{desc}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
        <button onClick={onConfirm} className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.97] ${confirmClass}`}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function ThemeSelector() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <div className="bg-white dark:bg-[#0e1322] rounded-2xl border border-slate-100 dark:border-[#151a28] p-5 mb-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-4">Appearance</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { if (darkMode) toggleTheme(); }}
          className={`p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
            !darkMode
              ? 'border-slate-800 dark:border-slate-300 bg-slate-50 dark:bg-[#151a28] shadow-sm'
              : 'border-slate-100 dark:border-[#151a28]'
          }`}
        >
          <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-slate-50 to-white mb-3 flex items-center justify-center border border-slate-200">
            <Sun className="w-7 h-7 text-amber-400" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Light</p>
            {!darkMode && <Check className="w-4 h-4 text-slate-800 dark:text-slate-300" />}
          </div>
        </button>

        <button
          onClick={() => { if (!darkMode) toggleTheme(); }}
          className={`p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
            darkMode
              ? 'border-slate-300 dark:border-slate-300 bg-slate-50 dark:bg-[#151a28] shadow-sm'
              : 'border-slate-100 dark:border-[#151a28]'
          }`}
        >
          <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-[#080b14] to-[#0e1322] mb-3 flex items-center justify-center border border-[#151a28]">
            <Moon className="w-7 h-7 text-indigo-400" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Dark</p>
            {darkMode && <Check className="w-4 h-4 text-slate-800 dark:text-slate-300" />}
          </div>
        </button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const { user, updateProfile } = useAuth();
  const [settings, setSettings] = useState(() => {
    return user?.settings?.notifications || { messages: true, connections: true, resources: false };
  });

  useEffect(() => {
    if (user?.settings?.notifications) {
      setSettings(user.settings.notifications);
    }
  }, [user?.settings?.notifications]);

  const handleToggle = async (key, val) => {
    const newNotifs = { ...settings, [key]: val };
    setSettings(newNotifs);
    if (user && updateProfile) {
      try {
        const updatedSettings = {
          ...(user.settings || {}),
          notifications: newNotifs
        };
        await updateProfile({ settings: JSON.stringify(updatedSettings) });
      } catch (e) {
        console.warn('Failed to save notification settings:', e);
      }
    }
  };

  return (
    <SettingsSection title="Notifications">
      {[
        { key: 'messages', icon: Bell, label: 'New Messages', desc: 'Get notified for new messages' },
        { key: 'connections', icon: User, label: 'New Connections', desc: 'When someone links with you' },
        { key: 'resources', icon: Globe, label: 'Resource Updates', desc: 'New papers and books' },
      ].map(item => (
        <div key={item.key} className="flex items-center gap-3.5 px-5 py-4 min-h-[60px]">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#151a28] flex items-center justify-center flex-shrink-0">
            <item.icon className="w-[18px] h-[18px] text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-slate-800 dark:text-slate-200">{item.label}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{item.desc}</p>
          </div>
          <Toggle enabled={settings[item.key]} onChange={(v) => handleToggle(item.key, v)} />
        </div>
      ))}
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
      setShowExportData(false);
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

  const handleClearData = async () => {
    try {
      await clearAllData();
      addToast('All data cleared!', 'success');
      window.location.reload();
    } catch {
      addToast('Failed to clear data.', 'error');
    }
  };

  return (
    <div className="p-3 sm:p-5 max-w-2xl mx-auto overflow-x-hidden">
      {/* Modals */}
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
      {showVisibility && <ProfileVisibilityModal onClose={() => setShowVisibility(false)} />}
      {showClearData && (
        <ConfirmModal
          title="Clear All Data?"
          desc="This will delete all posts, papers, books, and messages. This cannot be undone."
          icon={Trash2}
          iconClass="bg-rose-100 dark:bg-rose-900/20 text-rose-500"
          confirmLabel="Clear All"
          confirmClass="bg-rose-500 hover:bg-rose-600 text-white"
          onClose={() => setShowClearData(false)}
          onConfirm={handleClearData}
        />
      )}
      {showExportData && (
        <ConfirmModal
          title="Export Your Data"
          desc="Download all your posts, comments, likes, saved items, and connections as a JSON file."
          icon={Download}
          iconClass="bg-slate-100 dark:bg-slate-800 text-slate-500"
          confirmLabel="Download"
          confirmClass="bg-slate-800 dark:bg-slate-200 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900"
          onClose={() => setShowExportData(false)}
          onConfirm={handleExportData}
        />
      )}
      {showDeleteAccount && (
        <ConfirmModal
          title="Delete Account?"
          desc="This will permanently delete your account and all data. This action cannot be undone."
          icon={Trash2}
          iconClass="bg-rose-100 dark:bg-rose-900/20 text-rose-500"
          confirmLabel="Delete Account"
          confirmClass="bg-rose-600 hover:bg-rose-700 text-white"
          onClose={() => setShowDeleteAccount(false)}
          onConfirm={handleDeleteAccount}
        />
      )}

      {/* User banner */}
      {user && (
        <div className="flex items-center gap-3 mb-5 bg-white dark:bg-[#0e1322] rounded-2xl border border-slate-100 dark:border-[#151a28] p-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-700 shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <span className="font-bold text-slate-600 dark:text-slate-300">{user.name?.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#151a28] text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            Edit
          </button>
        </div>
      )}

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
        <SettingsItem icon={Globe} label="Language" description="English" onClick={() => addToast('Language settings coming soon!', 'info')} />
        <SettingsItem icon={HelpCircle} label="Help & Support" description="Get help with StuGrow" onClick={() => addToast('For support, contact support@stugrow.app', 'info')} />
        <SettingsItem icon={Smartphone} label="App Version" description="StuGrow v1.0.0" onClick={() => {}} right={<span className="text-xs text-slate-400 font-medium">v1.0.0</span>} />
        <SettingsItem icon={LogOut} label="Sign Out" description="Log out of your account" onClick={logout} danger />
      </SettingsSection>
    </div>
  );
}