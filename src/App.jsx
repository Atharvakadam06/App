import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, Component } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { PostLikeProvider } from './context/PostLikeContext';
import { PostSaveProvider } from './context/PostSaveContext';
import { ToastProvider } from './context/ToastContext';
import { LayoutProvider, useLayout } from './context/LayoutContext';
import { MessageProvider } from './context/MessageContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Feed from './pages/Feed';
import Network from './pages/Network';
import Bind from './pages/Bind';
import PYQVault from './pages/PYQVault';
import BookExchange from './pages/BookExchange';
import Marketplace from './pages/Marketplace';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import GlobalChat from './pages/GlobalChat';
import PostViewer from './pages/PostViewer';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { IncomingCallOverlay } from './components/CallScreen';
import { getIncomingCall, updateCallStatus, getConversations, createConversation } from './services/data';
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
  '/bind': { title: 'Binds', subtitle: 'Your connections' },
  '/connect': { title: 'Explore', subtitle: 'Discover and connect with students' },
  '/vault': { title: 'PYQ Vault', subtitle: 'Previous Year Question Papers' },
  '/library': { title: 'Book Exchange', subtitle: 'Free textbooks for everyone' },
  '/marketplace': { title: 'Marketplace', subtitle: 'Buy & sell projects, books, or devices' },
  '/inbox': { title: 'Messages', subtitle: null },
  '/global-chat': { title: 'Global Chat', subtitle: 'Public Campus Conversation' },
  '/profile': { title: 'Profile', subtitle: null },
  '/settings': { title: 'Settings', subtitle: null },
};

// ── Global incoming call detector (works on every page) ──────────────────────
function GlobalCallManager() {
  const { user, users } = useAuth();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState(null);
  const [caller, setCaller] = useState(null);
  const pollRef = useRef();

  useEffect(() => {
    if (!user?.id) return;
    const check = async () => {
      try {
        const call = await getIncomingCall(user.id);
        if (call) {
          setIncoming(prev => {
            if (prev?.id === call.id) return prev;
            const c = (users || []).find(u => u.id === call.caller_id);
            setCaller(c || { name: 'Unknown', avatar: null });
            return call;
          });
        } else {
          setIncoming(null);
          setCaller(null);
        }
      } catch {}
    };
    check();
    pollRef.current = setInterval(check, 2500);
    return () => clearInterval(pollRef.current);
  }, [user?.id, users]);

  if (!incoming || !caller) return null;

  const handleAccept = async () => {
    const activeIncoming = incoming;
    if (!activeIncoming) return;

    // 1. Hide overlay instantly so user gets 0ms responsive feedback
    setIncoming(null);
    setCaller(null);

    try {
      // 2. Perform DB update to accept status in background
      await updateCallStatus(activeIncoming.id, 'accepted');

      // 3. Resolve conversation and navigate
      const convs = await getConversations(user.id);
      let conv = convs.find(c => c.user?.id === activeIncoming.caller_id);
      if (!conv) {
        const newId = await createConversation(user.id, activeIncoming.caller_id);
        conv = { id: newId };
      }
      
      const acceptedCallObj = { ...activeIncoming, status: 'accepted' };
      navigate('/inbox', { state: { openConvId: conv.id, acceptedCall: acceptedCallObj } });
    } catch (e) {
      console.warn('Error accepting call:', e);
    }
  };

  const handleDecline = async (reason) => {
    const activeIncoming = incoming;
    if (!activeIncoming) return;

    // Hide overlay instantly
    setIncoming(null);
    setCaller(null);

    try {
      await updateCallStatus(activeIncoming.id, reason);
    } catch (e) {
      console.warn('Error declining call:', e);
    }
  };

  return (
    <IncomingCallOverlay
      call={incoming}
      callerUser={caller}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}

function getParallaxStyle(slotIndex, activeIndex) {
  const diff = slotIndex - activeIndex;
  if (diff === 0) {
    return {
      transform: 'translate3d(0%, 0, 0) scale(1)',
      opacity: 1,
      zIndex: 20,
      pointerEvents: 'auto',
      visibility: 'visible',
    };
  } else if (diff < 0) {
    // Receding page: moves left at 25% parallax speed with subtle scale (0.96) and dimming (0.5)
    return {
      transform: `translate3d(${diff * 25}%, 0, 0) scale(0.96)`,
      opacity: 0.5,
      zIndex: 10 + diff,
      pointerEvents: 'none',
      visibility: Math.abs(diff) <= 1 ? 'visible' : 'invisible',
    };
  } else {
    // Incoming page: overlays from right at full speed
    return {
      transform: `translate3d(${diff * 100}%, 0, 0) scale(1)`,
      opacity: 1,
      zIndex: 20 + diff,
      pointerEvents: 'none',
      visibility: Math.abs(diff) <= 1 ? 'visible' : 'invisible',
    };
  }
}

function AuthGate() {
  const { user, isLoading } = useAuth();
  const { addNotification, notifications } = useNotifications();
  const { hideMobileNav } = useLayout();
  const [showSignup, setShowSignup] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [mounted] = useState({ '/': true, '/connect': true, '/inbox': true });

  const SLIDE_PAGES = ['/', '/inbox', '/connect'];
  const slideIndex = Math.max(0, SLIDE_PAGES.indexOf(location.pathname));
  const isSwipePage = SLIDE_PAGES.includes(location.pathname);

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

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e) => {
    if (touchStart.x === 0) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStart.x;
    const diffY = touch.clientY - touchStart.y;
    setTouchStart({ x: 0, y: 0 });

    // Enforce horizontal swipe: X-diff must be at least 65px and at least 1.8x the Y-diff
    if (Math.abs(diffX) < 65 || Math.abs(diffX) < Math.abs(diffY) * 1.8) {
      return;
    }

    // Fast target check without getComputedStyle reflows
    const target = e.target;
    if (target && target.closest) {
      if (target.closest('.no-swipe, .overflow-x-auto, input, textarea, select, [contenteditable="true"]')) {
        return;
      }
    }

    // When a chat is open in Messages, swipe right → tell Messages to close it (not history.back)
    if (location.pathname === '/inbox' && hideMobileNav) {
      if (diffX > 0) window.dispatchEvent(new CustomEvent('messages-back'));
      return;
    }

    const swipePages = ['/', '/inbox', '/connect'];
    const currentIndex = swipePages.indexOf(location.pathname);
    if (currentIndex === -1) return;

    if (diffX < 0 && currentIndex < swipePages.length - 1) {
      // Swipe Left -> Next Page (Feed -> Messages -> Explore)
      navigate(swipePages[currentIndex + 1]);
    } else if (diffX > 0 && currentIndex > 0) {
      // Swipe Right -> Previous Page
      navigate(swipePages[currentIndex - 1]);
    }
  };

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
    <div className="h-dvh flex flex-col bg-[#faf8f5] dark:bg-[#080b14] transition-colors duration-300">
      <GlobalCallManager />
      <Sidebar />
      <main className="lg:ml-[72px] xl:ml-[244px] flex flex-col h-full transition-all duration-300 overflow-hidden">
        {location.pathname !== '/inbox' && location.pathname !== '/global-chat' && (
          <Header title={meta.title} subtitle={meta.subtitle} />
        )}

        {/* ── Desktop View (lg and above) ──────────────────────────────────── */}
        {/* Standard single-page routing without horizontal slider math         */}
        <div className="hidden lg:flex flex-col flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain [&:has(.messages-fullscreen)]:pb-0 animate-fade-in" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/connect" element={<Network />} />
            <Route path="/bind" element={<Bind />} />
            <Route path="/vault" element={<PYQVault />} />
            <Route path="/library" element={<BookExchange />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/inbox" element={<Messages />} />
            <Route path="/global-chat" element={<GlobalChat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/posts/:userId" element={<PostViewer />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* ── Mobile View (below lg) ────────────────────────────────────────── */}
        {/* Native iOS 3D Parallax Stack Transition                              */}
        <div className="lg:hidden flex-1 flex flex-col overflow-hidden relative">
          {isSwipePage ? (
            <div
              className="flex-1 relative overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Slot 0 — Feed (/) */}
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] overscroll-y-contain shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform bg-[#faf8f5] dark:bg-[#080b14]"
                style={getParallaxStyle(0, slideIndex)}
              >
                {mounted['/'] && <Feed />}
              </div>
              {/* Slot 1 — Messages (/inbox) */}
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] [&:has(.messages-fullscreen)]:pb-0 overscroll-y-contain shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform bg-[#faf8f5] dark:bg-[#080b14]"
                style={getParallaxStyle(1, slideIndex)}
              >
                {mounted['/inbox'] && <Messages />}
              </div>
              {/* Slot 2 — Network (/connect) */}
              <div
                className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] overscroll-y-contain shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform bg-[#faf8f5] dark:bg-[#080b14]"
                style={getParallaxStyle(2, slideIndex)}
              >
                {mounted['/connect'] && <Network />}
              </div>
            </div>
          ) : (
            <div
              key={location.pathname}
              className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] overscroll-y-contain animate-fade-in"
            >
              <Routes>
                <Route path="/bind" element={<Bind />} />
                <Route path="/vault" element={<PYQVault />} />
                <Route path="/library" element={<BookExchange />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/global-chat" element={<GlobalChat />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/posts/:userId" element={<PostViewer />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <PostLikeProvider>
            <PostSaveProvider>
              <NotificationProvider>
                <MessageProvider>
                  <ToastProvider>
                    <LayoutProvider>
                      <Router>
                        <AuthGate />
                      </Router>
                    </LayoutProvider>
                  </ToastProvider>
                </MessageProvider>
              </NotificationProvider>
            </PostSaveProvider>
          </PostLikeProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
