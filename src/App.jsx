import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, Component } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Feed from './pages/Feed';
import Network from './pages/Network';
import Bind from './pages/Bind';
import PYQVault from './pages/PYQVault';
import BookExchange from './pages/BookExchange';
import MentorHub from './pages/MentorHub';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import './index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#faf8f5] dark:bg-[#080b14] flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-sm font-medium">Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const pageMeta = {
  '/': { title: 'Feed', subtitle: "What's happening on campus" },
  '/connect': { title: 'Explore', subtitle: 'Discover and connect with students' },
  '/vault': { title: 'PYQ Vault', subtitle: 'Previous Year Question Papers' },
  '/library': { title: 'Book Exchange', subtitle: 'Free textbooks for everyone' },
  '/mentor': { title: 'Mentor Hub', subtitle: 'Learn from seniors, grow together' },
  '/inbox': { title: 'Messages', subtitle: null },
  '/profile': { title: 'Profile', subtitle: null },
  '/settings': { title: 'Settings', subtitle: null },
};

function AuthGate() {
  const { user, isLoading } = useAuth();
  const { addNotification, notifications } = useNotifications();
  const [showSignup, setShowSignup] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (user && !isLoading) {
      const hasWelcome = notifications.some(n => n.type === 'system' && n.message.includes('Welcome to StuGrow'));
      if (!hasWelcome) {
        addNotification({
          userId: user.id,
          type: 'system',
          message: `Welcome to StuGrow, ${user.name}! Complete your profile to get started.`,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-[#080b14] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-slate-300 dark:border-slate-600 border-t-slate-800 dark:border-t-slate-200 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return showSignup ? (
      <Signup onSwitchToLogin={() => setShowSignup(false)} />
    ) : (
      <Login onSwitchToSignup={() => setShowSignup(true)} />
    );
  }

  const meta = pageMeta[location.pathname] || pageMeta['/'];

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#080b14] transition-colors duration-300 overflow-x-hidden">
      <Sidebar />
      <main className="lg:ml-[72px] xl:ml-[240px] min-h-screen pb-20 lg:pb-0 transition-all duration-300">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/connect" element={<Network />} />
          <Route path="/bind" element={<Bind />} />
          <Route path="/vault" element={<PYQVault />} />
          <Route path="/library" element={<BookExchange />} />
          <Route path="/mentor" element={<MentorHub />} />
          <Route path="/inbox" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <ToastProvider>
              <Router>
                <AuthGate />
              </Router>
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
