import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Send, Paperclip, Image as ImageIcon, Smile, ArrowLeft, Inbox, X, Plus,
  CornerUpLeft, Star, Copy, Trash2, Edit3, ShieldAlert, Phone, Video, Search, Check,
  Bell, BellOff, User, Lock, Clock, Link, FileText, Sparkles, Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { useLayout } from '../context/LayoutContext';
import { useMessages } from '../context/MessageContext';
import { uploadToCloudinary } from '../services/cloudinary';
import {
  getConversations, getMessages, sendMessage, createConversation, editMessage,
  deleteMessageEveryone, createCall, getActiveCall, getIncomingCall,
  updateCallStatus, getCallById, setCallOffer, setCallAnswer, getUser,
  markMessagesAsRead, updateUserLastActive, setTypingStatus, getTypingStatus,
  deleteMessageForUser, getDeletedMessageIds, isUserOnline, toggleMessageReaction
} from '../services/data';
import { formatTimeAgo } from '../utils/timeUtils';
import ProfessionalSearch from '../components/ProfessionalSearch';
import { matchSearch } from '../utils/searchUtils';
import CallScreen, { IncomingCallOverlay } from '../components/CallScreen';
import { handleAvatarError } from '../utils/avatarUtils';

function EmojiPicker({ onSelect, onClose }) {
  const emojis = ['😀','😂','❤️','👍','👋','🎉','🔥','💯','😊','🤔','👏','🙏','💪','✨','🚀','📚','🎓','💡','⭐','🌟','😍','🥳','😎','🤝'];
  return (
    <div className="absolute bottom-20 left-2 right-2 sm:left-auto sm:right-0 sm:bottom-auto sm:top-full sm:mb-2 sm:w-72 bg-white dark:bg-[#0c1018] border border-gray-200/80 dark:border-gray-700/60 p-2.5 z-[60] shadow-2xl rounded-2xl animate-scale-in">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Emojis</span>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/70">
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {emojis.map(e => (
          <button
            key={e}
            type="button"
            onClick={() => { onSelect(e); onClose(); }}
            className="h-9 flex items-center justify-center text-[18px] hover:bg-gray-100 dark:hover:bg-gray-800/70 rounded-lg active:scale-90 transition-all"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function StarredMessagesModal({ currentUser, onClose, onJump }) {
  const starredKey = `stugrow_starred_dm_messages_${currentUser.id}`;
  const starred = JSON.parse(localStorage.getItem(starredKey)) || [];

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-[#0c1018] border border-gray-200/80 dark:border-gray-700/60 p-5 sm:p-6 w-full max-w-md max-h-[70vh] flex flex-col rounded-t-2xl sm:rounded-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500 animate-float" />
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Starred Messages</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-105 dark:hover:bg-gray-800/70 flex items-center justify-center active:scale-90"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar" style={{ maxHeight: '50vh' }}>
          {starred.length === 0 ? (
            <div className="text-center py-16">
              <Star className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-[13px] font-semibold text-gray-400 dark:text-gray-500">No starred messages</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Press and hold any message to star it</p>
            </div>
          ) : (
            starred.map(msg => (
              <button
                key={msg.id}
                onClick={() => onJump(msg)}
                className="w-full text-left p-3.5 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100/50 dark:border-white/[0.04] hover:bg-slate-100/50 dark:hover:bg-white/[0.05] hover:border-slate-200 dark:hover:border-slate-800 active:scale-[0.99] transition-all block group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {msg.otherUser?.avatar ? (
                      <img src={msg.otherUser.avatar} alt="" className="w-5 h-5 rounded-full object-cover" onError={(e) => handleAvatarError(e, msg.otherUser?.name)} />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500">
                        {msg.otherUser?.name?.[0]}
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {msg.otherUser?.name}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-semibold">{formatTimeAgo(msg.timestamp)}</span>
                </div>
                <p className="text-[13px] text-slate-850 dark:text-slate-200 font-medium truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                  {msg.content || '📎 Attachment'}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationList({ conversations, selectedId, onSelect, searchQuery, setSearchQuery, onNewChat, onOpenStarred, loading }) {
  const { user: currentUser } = useAuth();
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [nicknameTrigger, setNicknameTrigger] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setShouldAnimate(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateList = () => setNicknameTrigger(prev => prev + 1);
    window.addEventListener('stugrow-nickname-changed', updateList);
    return () => window.removeEventListener('stugrow-nickname-changed', updateList);
  }, []);

  const getDisplayName = (convUser) => {
    if (!currentUser || !convUser) return '';
    return localStorage.getItem(`stugrow_nickname_${currentUser.id}_${convUser.id}`) || convUser.name;
  };

  const filtered = conversations.filter(c => matchSearch(getDisplayName(c.user), searchQuery));
  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0d14] sm:border-r border-gray-200/70 dark:border-gray-700/50 w-full sm:w-80">
      {/* Fixed Header */}
      <div className="shrink-0 p-4 sm:p-5 border-b border-gray-200/70 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">Messages</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenStarred}
              title="Starred Messages"
              className="w-9 h-9 rounded-full bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.08] hover:text-amber-500 active:scale-90 transition-all"
            >
              <Star className="w-4 h-4" strokeWidth={2} />
            </button>
            <button onClick={onNewChat} className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center active:scale-90 transition-all shadow-sm">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <ProfessionalSearch placeholder="Search..." value={searchQuery} onChange={setSearchQuery} />
      </div>
      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling: touch overscroll-none">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse px-1">
                <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800/80" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-gray-100 dark:bg-gray-800/80 rounded-lg w-20" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center p-6 h-full">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">No conversations</p>
              <p className="text-[11px] text-gray-550 dark:text-gray-400 mt-1">Start a new chat</p>
            </div>
          </div>
        ) : (
          filtered.map((conv, i) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className="w-full flex items-center gap-3 p-3 sm:p-4 transition-all border-b border-gray-100/60 dark:border-gray-800/40 last:border-0 active:scale-[0.98]"
              style={shouldAnimate ? { animationName: i === 0 ? 'none' : 'fadeInUp', animationDuration: '0.3s', animationFillMode: 'backwards', animationDelay: `${Math.min(i * 20, 200)}ms`, animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' } : {}}
            >
              <div className="relative shrink-0">
                <img src={conv.user?.avatar} alt="" className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-white dark:ring-[#0a0d14] shadow-sm" onError={(e) => handleAvatarError(e, conv.user?.name)} />
                {isUserOnline(conv.user?.lastActive) && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#0a0d14]" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{getDisplayName(conv.user)}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium ml-2 shrink-0">{formatTimeAgo(conv.timestamp)}</span>
                </div>
                <p className="text-[11px] text-gray-550 dark:text-gray-400 truncate">{conv.lastMessage || 'Start a conversation'}</p>
              </div>
              {conv.unread > 0 && <span className="min-w-[18px] h-[18px] rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] flex items-center justify-center font-bold px-1 shadow-sm ml-1">{conv.unread}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function NewChatModal({ users, currentUser, onClose, onStart }) {
  const [search, setUserSearch] = useState('');
  const filtered = users.filter(u => u.id !== currentUser?.id && (matchSearch(u.name, search) || matchSearch(u.username, search)));
  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-[#0c1018] border border-gray-200/80 dark:border-gray-700/60 p-5 sm:p-6 w-full max-w-sm max-h-[60vh] sm:max-h-[70vh] flex flex-col rounded-t-2xl sm:rounded-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">New Conversation</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/70 flex items-center justify-center active:scale-90"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="mb-4">
          <ProfessionalSearch placeholder="Search students..." value={search} onChange={setUserSearch} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {filtered.length === 0 ? <p className="text-[13px] text-gray-400 text-center py-8">No students found</p> : filtered.map(u => (
            <button key={u.id} onClick={() => onStart(u)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#0f131f]/60 transition-all active:scale-[0.98]">
              <img src={u.avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800" onError={(e) => handleAvatarError(e, u.name)} />
              <div className="text-left"><p className="text-[13px] font-semibold text-gray-900 dark:text-white">{u.name}</p><p className="text-[11px] text-gray-500 dark:text-gray-400">@{u.username}</p></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatDetails({ recipientUser, messages, conversation, onBack, onSearch }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'links' | 'docs'
  
  // Localized states stored in localStorage for custom DM wallpaper and muted state
  const [isMuted, setIsMuted] = useState(() => {
    const muted = JSON.parse(localStorage.getItem(`stugrow_muted_chats_${user?.id}`)) || [];
    return muted.includes(conversation.id);
  });
  
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem(`stugrow_chat_theme_${conversation.id}`) || 'default';
  });

  const [disappearingState, setDisappearingState] = useState(() => {
    return localStorage.getItem(`stugrow_chat_disappearing_${conversation.id}`) || 'off';
  });

  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem(`stugrow_nickname_${user?.id}_${recipientUser.id}`) || '';
  });

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname);

  // Parse messages for shared items
  const sharedItems = useMemo(() => {
    const media = [];
    const links = [];
    const docs = [];

    // Regex to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    messages.forEach(msg => {
      // 1. Media (Images)
      if (msg.file && msg.fileType?.startsWith('image/')) {
        media.push({
          id: msg.id,
          url: msg.file,
          timestamp: msg.timestamp
        });
      }
      // 2. Docs (Files that are not images)
      else if (msg.file) {
        docs.push({
          id: msg.id,
          name: msg.fileName || 'Attachment',
          url: msg.file,
          fileType: msg.fileType,
          timestamp: msg.timestamp
        });
      }
      // 3. Links
      if (msg.content) {
        const matches = msg.content.match(urlRegex);
        if (matches) {
          matches.forEach(match => {
            links.push({
              id: msg.id + '_' + match,
              url: match,
              timestamp: msg.timestamp
            });
          });
        }
      }
    });

    return { media, links, docs };
  }, [messages]);

  const handleToggleMute = () => {
    const mutedKey = `stugrow_muted_chats_${user?.id}`;
    let muted = JSON.parse(localStorage.getItem(mutedKey)) || [];
    if (isMuted) {
      muted = muted.filter(id => id !== conversation.id);
      addToast('Conversation unmuted', 'success');
    } else {
      muted.push(conversation.id);
      addToast('Conversation muted', 'success');
    }
    localStorage.setItem(mutedKey, JSON.stringify(muted));
    setIsMuted(!isMuted);
  };

  const handleThemeChange = (themeName) => {
    localStorage.setItem(`stugrow_chat_theme_${conversation.id}`, themeName);
    setSelectedTheme(themeName);
    addToast(`Theme changed to ${themeName}`, 'success');
    window.dispatchEvent(new Event('stugrow-chat-theme-changed'));
  };

  const handleDisappearingChange = (e) => {
    const val = e.target.value;
    localStorage.setItem(`stugrow_chat_disappearing_${conversation.id}`, val);
    setDisappearingState(val);
    addToast(`Disappearing messages set to ${val === 'off' ? 'Off' : val}`, 'success');
  };

  const handleSaveNickname = () => {
    const trim = nicknameInput.trim();
    if (trim) {
      localStorage.setItem(`stugrow_nickname_${user?.id}_${recipientUser.id}`, trim);
      setNickname(trim);
      addToast('Nickname updated', 'success');
    } else {
      localStorage.removeItem(`stugrow_nickname_${user?.id}_${recipientUser.id}`);
      setNickname('');
      addToast('Nickname cleared', 'success');
    }
    setIsEditingNickname(false);
    window.dispatchEvent(new Event('stugrow-nickname-changed'));
  };

  const handleProfileClick = () => {
    if (recipientUser.id === user.id) navigate('/profile');
    else navigate(`/profile/${recipientUser.id}`);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear chat history? This will hide all messages for you.")) {
      const deletedKey = `stugrow_deleted_dm_messages_${user.id}`;
      const deleted = JSON.parse(localStorage.getItem(deletedKey)) || [];
      messages.forEach(m => {
        if (!deleted.includes(m.id)) deleted.push(m.id);
      });
      localStorage.setItem(deletedKey, JSON.stringify(deleted));
      
      messages.forEach(async (m) => {
        try {
          await deleteMessageForUser(user.id, m.id);
        } catch {}
      });
      
      addToast('Chat history cleared', 'success');
      onBack();
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const themesList = [
    { id: 'default', label: 'Default', bg: 'bg-[#faf8f5] dark:bg-[#080b14] border-slate-350 dark:border-slate-800' },
    { id: 'indigo', label: 'Indigo Glow', bg: 'bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-400' },
    { id: 'rose', label: 'Rose Whisper', bg: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-400' },
    { id: 'emerald', label: 'Emerald Garden', bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-400' },
    { id: 'dark-night', label: 'Dark Night', bg: 'bg-slate-900 border-slate-700' }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#080b14]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-3 sm:px-4 h-14 sm:h-[60px] border-b border-slate-200/60 dark:border-white/[0.04] bg-white dark:bg-[#0a0d14]">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-105 dark:hover:bg-gray-800/60 active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-500" strokeWidth={2.5} />
        </button>
        <span className="text-[14px] font-bold text-slate-900 dark:text-white">Details</span>
      </div>

      {/* Main Details Panel */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* User Card */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative group cursor-pointer" onClick={handleProfileClick}>
            <img src={recipientUser.avatar} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-slate-100 dark:ring-white/[0.06] hover:scale-105 transition-transform duration-300 shadow-md" onError={(e) => handleAvatarError(e, recipientUser.name)} />
            {isUserOnline(recipientUser.lastActive) && (
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full ring-4 ring-white dark:ring-[#080b14]" />
            )}
          </div>
          <div>
            <h2 className="text-[16px] font-black text-slate-900 dark:text-white">
              {nickname || recipientUser.name}
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold">@{recipientUser.username}</p>
            {nickname && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">Real Name: {recipientUser.name}</p>
            )}
          </div>
          {recipientUser.college && (
            <span className="inline-flex text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/[0.05]">
              {recipientUser.college}
            </span>
          )}
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-4 gap-2 px-2 max-w-sm mx-auto">
          <button onClick={handleProfileClick} className="flex flex-col items-center space-y-1.5 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all group">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:border-blue-200 dark:group-hover:border-blue-900/40 transition-colors">
              <User className="w-[18px] h-[18px]" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300">Profile</span>
          </button>
          
          <button onClick={onSearch} className="flex flex-col items-center space-y-1.5 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all group">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:border-blue-200 dark:group-hover:border-blue-900/40 transition-colors">
              <Search className="w-[18px] h-[18px]" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300">Search</span>
          </button>

          <button onClick={handleToggleMute} className="flex flex-col items-center space-y-1.5 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all group">
            <div className={`w-10 h-10 rounded-full bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] flex items-center justify-center transition-colors ${isMuted ? 'text-rose-500 border-rose-200/50' : 'text-slate-500 dark:text-slate-400 group-hover:text-amber-500 group-hover:border-amber-200'}`}>
              {isMuted ? <BellOff className="w-[18px] h-[18px]" strokeWidth={2} /> : <Bell className="w-[18px] h-[18px]" strokeWidth={2} />}
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </button>

          <button onClick={handleClearHistory} className="flex flex-col items-center space-y-1.5 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all group">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-rose-500 group-hover:border-rose-200 dark:group-hover:border-rose-950/40 transition-colors">
              <Trash2 className="w-[18px] h-[18px]" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300">Clear Chat</span>
          </button>
        </div>

        <hr className="border-slate-150 dark:border-slate-800/80" />

        {/* Options List */}
        <div className="space-y-4 text-left max-w-md mx-auto">
          {/* Nickname setting */}
          <div className="flex flex-col space-y-1.5 p-3 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/[0.03]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit3 className="w-[17px] h-[17px] text-slate-450" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Chat Nickname</span>
              </div>
              {!isEditingNickname && (
                <button onClick={() => { setIsEditingNickname(true); setNicknameInput(nickname); }} className="text-[11px] font-bold text-blue-500 hover:text-blue-600 active:scale-95 transition-all">
                  {nickname ? 'Edit' : 'Set'}
                </button>
              )}
            </div>
            {isEditingNickname ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="Set user nickname..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c1018] border border-slate-200 dark:border-slate-800 text-[12px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
                <button onClick={handleSaveNickname} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[11px] font-bold active:scale-95 transition-all">
                  Save
                </button>
                <button onClick={() => setIsEditingNickname(false)} className="px-2 py-1.5 text-[11px] text-slate-500 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-xl transition-all">
                  Cancel
                </button>
              </div>
            ) : nickname && (
              <p className="text-[12px] font-medium text-slate-650 dark:text-slate-400 pl-[30px]">{nickname}</p>
            )}
          </div>

          {/* Theme setting */}
          <div className="flex flex-col space-y-2 p-3 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/[0.03]">
            <div className="flex items-center gap-3">
              <Sparkles className="w-[17px] h-[17px] text-slate-450" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Chat Wallpaper</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 pt-1.5 pl-[30px]">
              {themesList.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  title={theme.label}
                  className={`h-8 rounded-xl border-2 flex items-center justify-center text-[10px] font-bold text-slate-500 transition-all active:scale-90 ${theme.bg} ${selectedTheme === theme.id ? 'ring-2 ring-blue-500 border-transparent scale-105' : 'hover:scale-102 hover:border-slate-400'}`}
                >
                  {theme.label[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Disappearing messages */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/[0.03]">
            <div className="flex items-center gap-3">
              <Clock className="w-[17px] h-[17px] text-slate-450" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Disappearing Messages</span>
            </div>
            <select
              value={disappearingState}
              onChange={handleDisappearingChange}
              className="bg-transparent text-[11px] font-bold text-slate-650 dark:text-slate-450 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="off" className="bg-white dark:bg-[#0c1018]">Off</option>
              <option value="24h" className="bg-white dark:bg-[#0c1018]">24 Hours</option>
              <option value="7d" className="bg-white dark:bg-[#0c1018]">7 Days</option>
            </select>
          </div>
        </div>

        <hr className="border-slate-150 dark:border-slate-800/80" />

        {/* Shared items Tabs */}
        <div className="space-y-4 max-w-md mx-auto">
          <div className="flex border-b border-slate-150 dark:border-slate-850">
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 pb-2.5 text-center text-xs font-bold transition-all border-b-2 ${activeTab === 'media' ? 'text-slate-900 dark:text-white border-slate-900 dark:border-white' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-400'}`}
            >
              Media
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`flex-1 pb-2.5 text-center text-xs font-bold transition-all border-b-2 ${activeTab === 'links' ? 'text-slate-900 dark:text-white border-slate-900 dark:border-white' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-400'}`}
            >
              Links
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex-1 pb-2.5 text-center text-xs font-bold transition-all border-b-2 ${activeTab === 'docs' ? 'text-slate-900 dark:text-white border-slate-900 dark:border-white' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-400'}`}
            >
              Files
            </button>
          </div>

          {/* Shared Tab Content */}
          <div className="min-h-[160px]">
            {activeTab === 'media' && (
              sharedItems.media.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">No shared photos or videos</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {sharedItems.media.map(item => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-xl overflow-hidden border border-slate-100 dark:border-white/[0.05] hover:opacity-90 active:scale-95 transition-all block bg-slate-50 dark:bg-white/[0.01]"
                    >
                      <img src={item.url} alt="" className="w-full h-full object-cover animate-fade-in" loading="lazy" />
                    </a>
                  ))}
                </div>
              )
            )}

            {activeTab === 'links' && (
              sharedItems.links.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">No shared links</p>
                </div>
              ) : (
                <div className="space-y-2 text-left">
                  {sharedItems.links.map(item => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/[0.03] hover:bg-slate-100/50 dark:hover:bg-white/[0.03] active:scale-[0.99] transition-all group animate-fade-in"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center shrink-0">
                        <Link className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                          {item.url}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{formatTimeAgo(item.timestamp)}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )
            )}

            {activeTab === 'docs' && (
              sharedItems.docs.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">No shared files</p>
                </div>
              ) : (
                <div className="space-y-2 text-left">
                  {sharedItems.docs.map(item => (
                    <a
                      key={item.id}
                      href={item.url}
                      download={item.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/[0.03] hover:bg-slate-100/50 dark:hover:bg-white/[0.03] active:scale-[0.99] transition-all group animate-fade-in"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{formatTimeAgo(item.timestamp)}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatView({ conversation, user, onBack, addToast, addNotification, users, initialHighlightMessageId, clearInitialHighlightMessageId, refreshUnread, refreshInbox }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [activeImageView, setActiveImageView] = useState(null);
  const [burstingHearts, setBurstingHearts] = useState({});

  const handleMessageReact = async (message, reactionChar) => {
    try {
      const activeReact = await toggleMessageReaction(message.id, user.id, reactionChar);
      
      setMessages(prev => prev.map(m => {
        if (m.id === message.id) {
          const existingReactions = m.reactions || [];
          const idx = existingReactions.findIndex(r => r.userId === user.id);
          let updatedReactions = [...existingReactions];
          if (idx > -1) {
            if (activeReact === null) {
              updatedReactions.splice(idx, 1);
            } else {
              updatedReactions[idx] = { userId: user.id, reaction: activeReact };
            }
          } else if (activeReact) {
            updatedReactions.push({ userId: user.id, reaction: activeReact });
          }
          return { ...m, reactions: updatedReactions };
        }
        return m;
      }));

      if (reactionChar === '❤️' && activeReact === '❤️') {
        setBurstingHearts(prev => ({ ...prev, [message.id]: true }));
        if (window.navigator.vibrate) window.navigator.vibrate(15);
        setTimeout(() => {
          setBurstingHearts(prev => {
            const updated = { ...prev };
            delete updated[message.id];
            return updated;
          });
        }, 800);
      }
    } catch (err) {
      console.error('Failed to react to message:', err);
    }
  };

  useEffect(() => {
    let spinnerTimer;
    if (loading) {
      spinnerTimer = setTimeout(() => {
        setShowSpinner(true);
      }, 120);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(spinnerTimer);
  }, [loading]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveImageView(null);
      }
    };
    if (activeImageView) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImageView]);

  // Dynamic user online status & typing indicators state
  const [recipientUser, setRecipientUser] = useState(conversation.user);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState('');
  const [hasScrolledToInitial, setHasScrolledToInitial] = useState(false);

  // ── Call State ──
  const [activeCall, setActiveCall] = useState(null);
  const [callRole, setCallRole] = useState(null); // 'caller' | 'receiver'

  // Gesture & Context Menu States
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [swipingMessageId, setSwipingMessageId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [contextMenuMessage, setContextMenuMessage] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);

  const chatViewRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const pressTimerRef = useRef(null);
  const longPressedRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const lastTypedRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const prevMessageIdsRef = useRef(new Set());

  const [showDetails, setShowDetails] = useState(false);

  const [customNickname, setCustomNickname] = useState(() => {
    return localStorage.getItem(`stugrow_nickname_${user?.id}_${conversation.user?.id}`) || '';
  });

  const [chatTheme, setChatTheme] = useState(() => {
    return localStorage.getItem(`stugrow_chat_theme_${conversation.id}`) || 'default';
  });

  useEffect(() => {
    setCustomNickname(localStorage.getItem(`stugrow_nickname_${user?.id}_${conversation.user?.id}`) || '');
    setChatTheme(localStorage.getItem(`stugrow_chat_theme_${conversation.id}`) || 'default');
  }, [conversation.user?.id, conversation.id, user?.id]);

  useEffect(() => {
    const handleNicknameChange = () => {
      setCustomNickname(localStorage.getItem(`stugrow_nickname_${user?.id}_${conversation.user?.id}`) || '');
    };
    const handleThemeChange = () => {
      setChatTheme(localStorage.getItem(`stugrow_chat_theme_${conversation.id}`) || 'default');
    };
    window.addEventListener('stugrow-nickname-changed', handleNicknameChange);
    window.addEventListener('stugrow-chat-theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('stugrow-nickname-changed', handleNicknameChange);
      window.removeEventListener('stugrow-chat-theme-changed', handleThemeChange);
    };
  }, [conversation.user?.id, conversation.id, user?.id]);

  // Click outside context menu to close it
  useEffect(() => {
    if (!contextMenuMessage) return;

    const handleOutsideClick = (e) => {
      const menuEl = document.getElementById('context-menu-container');
      if (menuEl && menuEl.contains(e.target)) return;

      // If clicked on another message bubble, let message onClick handle it
      if (e.target.closest('[id^="msg-"]')) return;

      // If clicked on select actions toolbar, do nothing
      if (e.target.closest('#select-actions-toolbar')) return;

      setContextMenuMessage(null);
      if (selectedMessageIds.length === 1 && selectedMessageIds[0] === contextMenuMessage.id) {
        setSelectedMessageIds([]);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [contextMenuMessage, selectedMessageIds]);

  // Keep contextMenuMessage and menuPosition in sync with selectedMessageIds when exactly 1 is selected
  useEffect(() => {
    if (selectedMessageIds.length === 1) {
      const singleId = selectedMessageIds[0];
      const msg = messages.find(m => m.id === singleId);
      if (msg) {
        if (contextMenuMessage?.id !== msg.id) {
          const element = document.getElementById(`msg-${singleId}`);
          if (element) {
            const bubbleElement = element.querySelector('.message-bubble') || element;
            const rect = bubbleElement.getBoundingClientRect();
            const containerRect = chatViewRef.current ? chatViewRef.current.getBoundingClientRect() : { top: 0, left: 0 };
            setMenuPosition({
              top: rect.top - containerRect.top,
              left: rect.left - containerRect.left,
              width: rect.width,
              height: rect.height,
              isMine: msg.senderId === user?.id
            });
            setContextMenuMessage(msg);
          }
        }
      }
    } else if (selectedMessageIds.length === 0) {
      if (contextMenuMessage) setContextMenuMessage(null);
    } else {
      // 2+ selected → close popup, enter pure multi-select mode
      if (contextMenuMessage) setContextMenuMessage(null);
    }
  }, [selectedMessageIds, messages, user?.id, contextMenuMessage]);

  // Details popstate interceptor to close details on back button instead of leaving the chat
  useEffect(() => {
    if (!showDetails) return;

    window.history.pushState({ detailsOpen: true }, '');

    const handlePopState = (e) => {
      setShowDetails(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.detailsOpen) {
        window.history.back();
      }
    };
  }, [showDetails]);

  const getThemeBgClass = () => {
    switch (chatTheme) {
      case 'indigo':
        return 'bg-gradient-to-br from-indigo-50/60 to-violet-50/60 dark:from-indigo-950/10 dark:to-purple-950/10';
      case 'rose':
        return 'bg-gradient-to-br from-rose-50/60 to-pink-50/60 dark:from-rose-950/10 dark:to-pink-950/10';
      case 'emerald':
        return 'bg-gradient-to-br from-emerald-50/60 to-teal-50/60 dark:from-emerald-950/10 dark:to-teal-950/10';
      case 'dark-night':
        return 'bg-slate-900';
      case 'default':
      default:
        return 'bg-slate-50/40 dark:bg-[#080b14]';
    }
  };

  // Sync recipient details when conversation changes and reset scrolling flags
  useEffect(() => {
    setRecipientUser(conversation.user);
    setHasScrolledToInitial(false);
    setSearchOpen(false);
    setThreadSearchQuery('');
  }, [conversation]);

  const refreshUnreadRef = useRef(refreshUnread);
  const refreshInboxRef = useRef(refreshInbox);

  useEffect(() => {
    refreshUnreadRef.current = refreshUnread;
    refreshInboxRef.current = refreshInbox;
  }, [refreshUnread, refreshInbox]);

  // Live polling for conversation DMs + active status + call state (every 3 seconds)
  useEffect(() => {
    // Delay initial database query and state update on mobile viewports to allow smooth sliding animation
    const isMobile = window.innerWidth < 640;
    const initialLoadTimer = setTimeout(() => {
      loadMessages(true);
    }, isMobile ? 350 : 0);

    // Mark as read and update own status on open
    markMessagesAsRead(conversation.id, user.id).then(() => {
      refreshUnreadRef.current?.();
      refreshInboxRef.current?.();
    }).catch(console.warn);
    updateUserLastActive(user.id).catch(console.warn);

    const interval = setInterval(async () => {
      loadMessages(false);
      
      // Update my own last active status periodically
      updateUserLastActive(user.id).catch(console.warn);
      
      // Poll other user's active status
      try {
        const u = await getUser(conversation.user.id);
        if (u) setRecipientUser(u);
      } catch (e) {
        console.warn('Failed to poll recipient status:', e);
      }

      // Poll for call status changes
      try {
        const call = await getActiveCall(conversation.id);
        if (call) {
          setActiveCall(prev => {
            if (!prev) {
              setCallRole(call.caller_id === user.id ? 'caller' : 'receiver');
            }
            return call;
          });
        } else {
          setActiveCall(prev => (prev ? null : prev));
          setCallRole(null);
        }
      } catch {}
    }, 3000);

    // Fast responsive polling for typing status (every 1.5 seconds)
    const typingInterval = setInterval(async () => {
      try {
        const typing = await getTypingStatus(conversation.id, conversation.user.id);
        setIsOtherTyping(typing);
      } catch (e) {
        console.warn('Failed to poll typing status:', e);
      }
    }, 1500);

    return () => {
      clearTimeout(initialLoadTimer);
      clearInterval(interval);
      clearInterval(typingInterval);
      // Clear own typing status when leaving
      setTypingStatus(conversation.id, user.id, false).catch(console.warn);
    };
  }, [conversation.id, user.id]);

  // Highlight scroll target logic for Starred Messages Jumping
  useEffect(() => {
    if (initialHighlightMessageId && messages.length > 0 && !hasScrolledToInitial) {
      const exists = messages.some(m => m.id === initialHighlightMessageId);
      if (exists) {
        setHasScrolledToInitial(true);
        setTimeout(() => {
          handleScrollToMessage(initialHighlightMessageId);
          clearInitialHighlightMessageId();
        }, 300);
      }
    }
  }, [messages, initialHighlightMessageId, hasScrolledToInitial]);

  const scrollToBottom = () => {
    if (!chatContainerRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'instant',
        });
      }
    }, 80);
  };

  // Scroll to bottom when new messages arrive (only if we are not jumping to a starred message)
  useEffect(() => {
    if (initialHighlightMessageId || loading) return;

    const lastMsg = messages[messages.length - 1];

    if (isFirstLoadRef.current) {
      scrollToBottom();
      isFirstLoadRef.current = false;
      prevMessageIdsRef.current = new Set(messages.map(m => m.id));
      return;
    }

    const container = chatContainerRef.current;
    if (container && lastMsg) {
      const isNewMessage = !prevMessageIdsRef.current.has(lastMsg.id);
      if (isNewMessage) {
        const sentByMe = lastMsg.senderId === user.id;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isScrollNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        if (sentByMe || isScrollNearBottom) {
          scrollToBottom();
        }
      }
    }

    prevMessageIdsRef.current = new Set(messages.map(m => m.id));
  }, [messages, initialHighlightMessageId, loading, user.id]);

  const loadMessages = async (firstTime = false) => {
    if (firstTime) setLoading(true);
    try {
      const msgs = await getMessages(conversation.id);
      // Filter out messages deleted for me (synced via DB & local storage fallback)
      const deletedKey = `stugrow_deleted_dm_messages_${user.id}`;
      const localDeleted = JSON.parse(localStorage.getItem(deletedKey)) || [];
      const dbDeleted = await getDeletedMessageIds(user.id).catch(() => []);
      
      // Upload any local deletions to DB that are missing in the DB (sync from offline/past deletions)
      const missingInDb = localDeleted.filter(id => !dbDeleted.includes(id));
      if (missingInDb.length > 0) {
        for (const id of missingInDb) {
          await deleteMessageForUser(user.id, id).catch(() => {});
        }
      }

      const combined = Array.from(new Set([...localDeleted, ...dbDeleted, ...missingInDb]));
      
      // Update local storage so it has the latest synced deletions
      localStorage.setItem(deletedKey, JSON.stringify(combined));

      const visible = msgs.filter(m => !combined.includes(m.id));
      setMessages(prev => {
        const isIdentical = prev.length === visible.length &&
          prev.every((msg, idx) => msg.id === visible[idx].id && msg.content === visible[idx].content && msg.read === visible[idx].read);
        return isIdentical ? prev : visible;
      });

      // Mark messages as read since we are actively viewing this conversation
      if (visible.some(m => m.senderId !== user.id && m.read === 0)) {
        await markMessagesAsRead(conversation.id, user.id);
        refreshUnread?.();
        refreshInbox?.();
      }
    } catch (e) {
      console.warn('Failed to load messages:', e);
    } finally {
      if (firstTime) setLoading(false);
    }
  };

  const handleScrollToMessage = (parentId) => {
    if (!parentId) return;
    const element = document.getElementById(`msg-${parentId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(parentId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500);
    } else {
      addToast("Original message not found", "info");
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const content = newMessage.trim();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingStatus(conversation.id, user.id, false).catch(console.warn);

    if (editingMessage) {
      const msgId = editingMessage.id;
      setEditingMessage(null);
      setNewMessage('');
      try {
        await editMessage(msgId, content);
        await loadMessages(false);
        addToast('Message edited successfully!', 'success');
      } catch (e) {
        addToast('Failed to edit message', 'error');
      }
      return;
    }

    const parentId = replyingTo ? replyingTo.id : null;
    setNewMessage('');
    setReplyingTo(null);
    setShowEmoji(false);

    try {
      await sendMessage(conversation.id, user.id, content, null, null, null, parentId);
      await loadMessages(false);
      if (conversation.user) {
        addNotification({
          userId: user.id,
          type: 'message',
          message: `You sent a message to ${conversation.user.name}`,
        });
      }
    } catch (e) {
      console.error('Failed to send message:', e);
      addToast('Failed to send message', 'error');
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    const now = Date.now();
    if (now - lastTypedRef.current > 2000) {
      lastTypedRef.current = now;
      setTypingStatus(conversation.id, user.id, true).catch(console.warn);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(conversation.id, user.id, false).catch(console.warn);
      lastTypedRef.current = 0;
    }, 3000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
    e.target.value = '';
  };

  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'dm-file-' + Math.random().toString(36).substr(2, 9);
    input.style.cssText = 'display:none;';
    input.addEventListener('change', function(e) {
      handleFileAttach(e);
      setTimeout(() => input.remove(), 100);
    });
    document.body.appendChild(input);
    input.click();
  };

  const openImagePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.id = 'dm-image-' + Math.random().toString(36).substr(2, 9);
    input.style.cssText = 'display:none;';
    input.addEventListener('change', function(e) {
      handleFileAttach(e);
      setTimeout(() => input.remove(), 100);
    });
    document.body.appendChild(input);
    input.click();
  };

  const handleFileUpload = async (file) => {
    const isImage = file.type.startsWith('image/');
    try {
      addToast('Uploading attachment...', 'info');
      const fileUrl = await uploadToCloudinary(file, 'stugrow/messages');
      const parentId = replyingTo ? replyingTo.id : null;
      setReplyingTo(null);
      await sendMessage(conversation.id, user.id, isImage ? '' : `File: ${file.name}`, fileUrl, file.name, file.type, parentId);
      await loadMessages(false);
      addToast('Attachment sent successfully!', 'success');
    } catch {
      addToast('Failed to upload file.', 'error');
    }
  };

  // --- Gestures & Context Actions ---
  const onTouchStart = (e, msgId) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setSwipingMessageId(msgId);
    setIsSwipeActive(false);
  };

  const onTouchMove = (e) => {
    if (!swipingMessageId) return;
    const diffX = e.touches[0].clientX - touchStartX;
    const diffY = e.touches[0].clientY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY) && diffX > 0) {
      e.preventDefault();
      setIsSwipeActive(true);
      setSwipeOffset(Math.min(diffX, 90));
    }
  };

  const onTouchEnd = (msg) => {
    if (isSwipeActive && swipeOffset > 55) {
      setReplyingTo(msg);
      if (window.navigator.vibrate) window.navigator.vibrate(15);
    }
    setSwipingMessageId(null);
    setSwipeOffset(0);
    setIsSwipeActive(false);
  };

  const toggleMessageSelection = (msgId) => {
    setSelectedMessageIds(prev => {
      if (prev.includes(msgId)) {
        return prev.filter(id => id !== msgId);
      } else {
        return [...prev, msgId];
      }
    });
  };

  // Positions the context menu relative to the chatView container (absolute positioning)
  const getMenuStyles = () => {
    if (!menuPosition) return {};
    const { top, left, width, height } = menuPosition;
    const menuWidth = 260;
    const emojiBarH = 48;
    const menuBodyH = 260; // estimated, shrinks for fewer items
    const totalH = emojiBarH + 8 + menuBodyH;
    const gap = 10;

    const containerW = chatViewRef.current ? chatViewRef.current.clientWidth : window.innerWidth;
    const containerH = chatViewRef.current ? chatViewRef.current.clientHeight : window.innerHeight;

    // Center horizontally on bubble, clamp strictly inside container
    let targetLeft = left + width / 2 - menuWidth / 2;
    targetLeft = Math.max(6, Math.min(containerW - menuWidth - 6, targetLeft));

    // Prefer below bubble; flip above if near bottom
    let targetTop = top + height + gap;
    if (targetTop + totalH > containerH - 20) {
      targetTop = top - totalH - gap;
    }
    targetTop = Math.max(56, Math.min(containerH - totalH - 6, targetTop));

    return { position: 'absolute', left: `${targetLeft}px`, top: `${targetTop}px`, width: `${menuWidth}px`, zIndex: 9990 };
  };

  const handleCopySelected = async () => {
    const selectedMsgs = messages.filter(m => selectedMessageIds.includes(m.id));
    selectedMsgs.sort((a, b) => a.timestamp - b.timestamp);
    const combinedText = selectedMsgs.map(m => m.content).filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(combinedText);
      addToast('Copied selected messages!', 'success');
    } catch {
      addToast('Failed to copy messages', 'error');
    }
    setSelectedMessageIds([]);
  };

  const handleDeleteSelected = async () => {
    try {
      const deletedKey = `stugrow_deleted_dm_messages_${user.id}`;
      const deletedRaw = localStorage.getItem(deletedKey);
      let deleted = [];
      try {
        deleted = deletedRaw ? JSON.parse(deletedRaw) : [];
        if (!Array.isArray(deleted)) deleted = [];
      } catch {
        deleted = [];
      }

      selectedMessageIds.forEach(id => {
        if (!deleted.includes(id)) {
          deleted.push(id);
        }
      });

      localStorage.setItem(deletedKey, JSON.stringify(deleted));
      await Promise.all(selectedMessageIds.map(id => deleteMessageForUser(user.id, id)));
      setMessages(prev => prev.filter(m => !selectedMessageIds.includes(m.id)));
      addToast('Selected messages deleted', 'success');
    } catch (err) {
      console.error('Error deleting messages:', err);
      addToast(`Failed to delete some messages: ${err.message}`, 'error');
    }
    setSelectedMessageIds([]);
  };

  const handlePressStart = (msg, element) => {
    if (selectedMessageIds.length > 0) return;
    longPressedRef.current = false;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      if (element) {
        const rowElement = (element && typeof element.closest === 'function')
          ? element.closest('[id^="msg-"]') || element
          : element;
        const bubbleElement = rowElement && typeof rowElement.querySelector === 'function'
          ? rowElement.querySelector('.message-bubble') || rowElement
          : rowElement;
        const rect = bubbleElement.getBoundingClientRect();
        const containerRect = chatViewRef.current ? chatViewRef.current.getBoundingClientRect() : { top: 0, left: 0 };
        setMenuPosition({
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          width: rect.width,
          height: rect.height,
          isMine: msg.senderId === user?.id
        });
      }
      setContextMenuMessage(msg);
      setSelectedMessageIds([msg.id]);
      if (window.navigator.vibrate) window.navigator.vibrate(20);
    }, 550);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (longPressedRef.current) {
      setTimeout(() => {
        longPressedRef.current = false;
      }, 150);
    }
  };

  const handleTouchMoveHold = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    if (selectedMessageIds.length > 0) return;
    const clickedElement = e.target;
    const rowElement = (clickedElement && typeof clickedElement.closest === 'function')
      ? clickedElement.closest('[id^="msg-"]') || e.currentTarget
      : e.currentTarget;
    const bubbleElement = rowElement && typeof rowElement.querySelector === 'function'
      ? rowElement.querySelector('.message-bubble') || rowElement
      : rowElement;
    const rect = bubbleElement.getBoundingClientRect();
    const containerRect = chatViewRef.current ? chatViewRef.current.getBoundingClientRect() : { top: 0, left: 0 };
    setMenuPosition({
      top: rect.top - containerRect.top,
      left: rect.left - containerRect.left,
      width: rect.width,
      height: rect.height,
      isMine: msg.senderId === user?.id
    });
    setContextMenuMessage(msg);
    setSelectedMessageIds([msg.id]);
  };

  const handleCopyMessage = async () => {
    if (!contextMenuMessage) return;
    try {
      await navigator.clipboard.writeText(contextMenuMessage.content);
      addToast('Message copied to clipboard!', 'success');
    } catch {
      addToast('Failed to copy text', 'error');
    }
    setContextMenuMessage(null);
  };

  const handleStarToggle = () => {
    if (!contextMenuMessage) return;
    const starredKey = `stugrow_starred_dm_messages_${user?.id}`;
    let starred = JSON.parse(localStorage.getItem(starredKey)) || [];
    const isAlreadyStarred = starred.some(m => (typeof m === 'object' ? m.id === contextMenuMessage.id : m === contextMenuMessage.id));
    if (isAlreadyStarred) {
      starred = starred.filter(m => (typeof m === 'object' ? m.id !== contextMenuMessage.id : m !== contextMenuMessage.id));
      addToast('Message unstarred', 'info');
    } else {
      const starredObj = {
        id: contextMenuMessage.id,
        senderId: contextMenuMessage.senderId,
        content: contextMenuMessage.content,
        timestamp: contextMenuMessage.timestamp,
        conversationId: conversation.id,
        otherUser: {
          id: conversation.user?.id,
          name: conversation.user?.name,
          avatar: conversation.user?.avatar,
          username: conversation.user?.username
        }
      };
      starred.push(starredObj);
      addToast('Message starred!', 'success');
    }
    localStorage.setItem(starredKey, JSON.stringify(starred));
    setContextMenuMessage(null);
  };

  const isStarred = (msgId) => {
    const starredKey = `stugrow_starred_dm_messages_${user?.id}`;
    const starred = JSON.parse(localStorage.getItem(starredKey)) || [];
    return starred.some(m => (typeof m === 'object' ? m.id === msgId : m === msgId));
  };

  const handleDeleteMe = async () => {
    if (!contextMenuMessage) return;
    const deletedKey = `stugrow_deleted_dm_messages_${user?.id}`;
    const deleted = JSON.parse(localStorage.getItem(deletedKey)) || [];
    if (!deleted.includes(contextMenuMessage.id)) {
      deleted.push(contextMenuMessage.id);
      localStorage.setItem(deletedKey, JSON.stringify(deleted));
    }
    try {
      await deleteMessageForUser(user?.id, contextMenuMessage.id);
    } catch (e) {
      console.warn('Failed to persist delete-for-me in database:', e);
    }
    addToast('Message deleted for you', 'info');
    setContextMenuMessage(null);
    loadMessages(false);
  };

  const handleDeleteEveryone = async () => {
    if (!contextMenuMessage) return;
    try {
      await deleteMessageEveryone(contextMenuMessage.id);
      addToast('Message deleted for everyone', 'success');
      loadMessages(false);
    } catch (e) {
      addToast('Failed to delete message', 'error');
    }
    setContextMenuMessage(null);
  };

  const handleReportMessage = () => {
    addToast('Message reported successfully.', 'success');
    setContextMenuMessage(null);
  };

  // ── Call handlers ──
  const startCall = useCallback(async (type) => {
    if (activeCall) { addToast('A call is already in progress', 'info'); return; }
    try {
      const { id, roomName } = await createCall(conversation.id, user.id, conversation.user.id, type);
      const newCall = { id, conversation_id: conversation.id, caller_id: user.id, receiver_id: conversation.user.id, type, status: 'ringing', room_name: roomName };
      setActiveCall(newCall);
      setCallRole('caller');
    } catch (e) {
      addToast('Could not start call. Please try again.', 'error');
    }
  }, [activeCall, conversation.id, conversation.user?.id, user.id, addToast]);

  const handleAcceptCall = useCallback(async () => {
    if (!activeCall) return;
    await updateCallStatus(activeCall.id, 'accepted');
    setActiveCall(prev => ({ ...prev, status: 'accepted' }));
  }, [activeCall]);

  const handleDeclineCall = useCallback(async (status = 'rejected') => {
    if (!activeCall) return;
    await updateCallStatus(activeCall.id, status);
    setActiveCall(null);
    setCallRole(null);
    if (status === 'rejected') addToast('Call declined', 'info');
    if (status === 'missed') addToast('Missed call', 'info');
  }, [activeCall, addToast]);

  const handleHangUp = useCallback(async () => {
    if (!activeCall) return;
    await updateCallStatus(activeCall.id, 'ended');
    setActiveCall(null);
    setCallRole(null);
    addToast('Call ended', 'info');
  }, [activeCall, addToast]);

  const filteredMessages = useMemo(() => {
    if (!threadSearchQuery.trim()) return messages;
    const q = threadSearchQuery.toLowerCase();
    return messages.filter(m => m.content?.toLowerCase().includes(q));
  }, [messages, threadSearchQuery]);

  const lastMyMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === user.id) {
        return messages[i].id;
      }
    }
    return null;
  }, [messages, user.id]);

  return (
    <div ref={chatViewRef} className="flex flex-col h-full min-h-0 bg-white dark:bg-[#080b14] relative overflow-hidden">

      {/* ── Call Screen Overlay ── */}
      {activeCall && (
        <CallScreen
          call={activeCall}
          currentUser={user}
          otherUser={conversation.user}
          role={callRole}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onHangUp={handleHangUp}
        />
      )}

      {/* Chat Header */}
      <div className="shrink-0 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 h-14 sm:h-[60px] border-b border-slate-200/60 dark:border-white/[0.04] bg-white dark:bg-[#0a0d14]">
        <button onClick={onBack} className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-105 dark:hover:bg-gray-800/60 active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-500" strokeWidth={2.5} />
        </button>
        <div 
          onClick={() => setShowDetails(true)}
          className="flex-1 flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer select-none active:opacity-75 transition-all py-1 rounded-xl"
        >
          <div className="relative shrink-0">
            <img src={recipientUser?.avatar} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800 shadow-sm" onError={(e) => handleAvatarError(e, recipientUser?.name)} />
            {isUserOnline(recipientUser?.lastActive) && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#0a0d14]" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white truncate leading-tight">
              {customNickname || recipientUser?.name}
            </h3>
            {isOtherTyping ? (
              <p className="text-[10px] sm:text-[11px] text-emerald-500 font-bold mt-0.5 animate-pulse">typing...</p>
            ) : (
              isUserOnline(recipientUser?.lastActive) ? (
                <p className="text-[10px] sm:text-[11px] text-emerald-500 font-bold mt-0.5">Online</p>
              ) : (
                <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                  {recipientUser?.lastActive ? `Active ${formatTimeAgo(recipientUser.lastActive)}` : 'Offline'}
                </p>
              )
            )}
          </div>
        </div>
        {/* Call Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => startCall('audio')}
            title="Audio Call"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-90 transition-all group"
          >
            <Phone className="w-[17px] h-[17px] text-slate-400 group-hover:text-emerald-500 transition-colors" strokeWidth={2} />
          </button>
          <button
            onClick={() => startCall('video')}
            title="Video Call"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-90 transition-all group"
          >
            <Video className="w-[17px] h-[17px] text-slate-400 group-hover:text-indigo-500 transition-colors" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Thread Search Bar */}
      {searchOpen && (
        <div className="shrink-0 px-3 sm:px-4 py-2 border-b border-slate-200/60 dark:border-white/[0.04] bg-slate-50/50 dark:bg-[#0a0d14]/50 animate-slide-down">
          <div className="relative">
            <input
              type="text"
              value={threadSearchQuery}
              onChange={(e) => setThreadSearchQuery(e.target.value)}
              placeholder="Search in this conversation..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white dark:bg-[#0c1018] border border-slate-250 dark:border-slate-800 text-[12px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            <Search className="w-3.5 h-3.5 text-slate-450 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {threadSearchQuery && (
              <button
                onClick={() => setThreadSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-150 dark:hover:bg-slate-800"
              >
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Messages */}
      <div
        ref={chatContainerRef}
        className={`flex-1 h-full overflow-y-auto -webkit-overflow-scrolling: touch overscroll-none px-3 sm:px-4 py-3 space-y-4 transition-colors duration-300 ${getThemeBgClass()}`}
        style={{ scrollBehavior: 'auto' }}
      >
        {showSpinner ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2 animate-fade-in">
            <div className="w-6 h-6 border-2 border-slate-350 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
            <p className="text-[11px] text-slate-400">Loading messages...</p>
          </div>
        ) : loading ? (
          <div className="h-full" />
        ) : (
          <div className="space-y-4 animate-fade-in" style={{ animationDuration: '200ms' }}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center min-h-[40vh] py-10">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#0c1018] border border-gray-200/60 dark:border-gray-700/40 flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Send className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Say hello! 👋</p>
                </div>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center min-h-[40vh] py-10">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-[13px] font-semibold text-gray-400 dark:text-gray-500">No matching messages found</p>
                  <p className="text-[11px] text-gray-550 dark:text-gray-600 mt-0.5">Try searching for different keywords</p>
                </div>
              </div>
            ) : (
              filteredMessages.map((message, i) => {
                const isMine = message.senderId === user?.id;
                const parentMsg = message.parentId ? messages.find(m => m.id === message.parentId) : null;
                const showAvatar = !isMine && (i === 0 || messages[i - 1]?.senderId !== message.senderId);
                const isThisSwiping = swipingMessageId === message.id;
                const isMenuOpen = contextMenuMessage?.id === message.id;

                return (
                  <div
                    key={message.id}
                    id={`msg-${message.id}`}
                    onClick={(e) => {
                      if (longPressedRef.current) {
                        longPressedRef.current = false;
                        e.stopPropagation();
                        return;
                      }
                      if (selectedMessageIds.length > 0) {
                        e.stopPropagation();
                        toggleMessageSelection(message.id);
                        // Don't close context menu — let it stay while multi-selecting
                      } else if (contextMenuMessage) {
                        e.stopPropagation();
                        setSelectedMessageIds([contextMenuMessage.id, message.id]);
                      }
                    }}
                    className={`flex items-center animate-fade-in group relative select-none no-swipe px-2 sm:px-4 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                      isMenuOpen ? 'z-40 relative' : ''
                    } ${
                      selectedMessageIds.includes(message.id)
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/10'
                        : 'hover:bg-slate-50/20 dark:hover:bg-white/[0.005]'
                    }`}
                    style={{ animationDuration: '0.2s' }}
                    onContextMenu={(e) => handleContextMenu(e, message)}
                    onTouchStart={(e) => {
                      onTouchStart(e, message.id);
                      const element = e.target;
                      handlePressStart(message, element);
                    }}
                    onTouchMove={(e) => {
                      onTouchMove(e);
                      handleTouchMoveHold();
                    }}
                    onTouchEnd={() => {
                      onTouchEnd(message);
                      handlePressEnd();
                    }}
                    onMouseDown={(e) => {
                      const element = e.target;
                      handlePressStart(message, element);
                    }}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                  >
                    {/* Checkbox for Multi-Select */}
                    {selectedMessageIds.length > 0 && (
                      <div className="shrink-0 mr-3 flex items-center justify-center select-none cursor-pointer">
                        <div className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all duration-200 ${
                          selectedMessageIds.includes(message.id)
                            ? 'bg-indigo-500 border-indigo-500 text-white scale-110 shadow-xs'
                            : 'border-slate-350 dark:border-slate-655 bg-transparent'
                        }`}>
                          {selectedMessageIds.includes(message.id) && (
                            <Check className="w-2.5 h-2.5 stroke-[3] text-white" />
                          )}
                        </div>
                      </div>
                    )}

                    <div className={`flex-1 flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {/* Swipe Reply Icon */}
                      {isThisSwiping && swipeOffset > 15 && (
                        <div
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-emerald-500 transition-opacity"
                          style={{
                            opacity: Math.min((swipeOffset - 15) / 40, 1),
                            transform: `scale(${Math.min(swipeOffset / 55, 1)})`,
                          }}
                        >
                          <CornerUpLeft className="w-5 h-5" />
                        </div>
                      )}

                      <div
                        className={`flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%] transition-transform duration-200 ${isMine ? 'flex-row-reverse' : ''}`}
                        style={{
                          transform: isThisSwiping ? `translateX(${swipeOffset}px)` : 'none',
                        }}
                      >
                        {!isMine && (
                          <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full overflow-hidden shadow-xs mt-1">
                            {showAvatar ? <img src={conversation.user?.avatar} alt="" className="w-full h-full object-cover" onError={(e) => handleAvatarError(e, conversation.user?.name)} /> : <div className="w-full h-full" />}
                          </div>
                        )}

                        <div className={`flex flex-col space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                          {/* Quoted parent message */}
                          {parentMsg && (
                            <button
                              type="button"
                              onClick={(e) => {
                                if (longPressedRef.current) {
                                  longPressedRef.current = false;
                                  e.stopPropagation();
                                  return;
                                }
                                if (selectedMessageIds.length > 0) {
                                  e.stopPropagation();
                                  toggleMessageSelection(message.id);
                                  if (contextMenuMessage) setContextMenuMessage(null);
                                } else {
                                  handleScrollToMessage(message.parentId);
                                }
                              }}
                              className={`text-[11px] p-2 bg-slate-100/50 dark:bg-white/[0.02] border-l-2 border-slate-400 dark:border-slate-600 rounded-r-xl max-w-full truncate text-left active:scale-[0.98] transition-all hover:bg-slate-200/55 dark:hover:bg-white/[0.04] cursor-pointer block w-full ${isMine ? 'text-right rounded-l-xl rounded-r-none border-l-0 border-r-2' : ''}`}
                            >
                              <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5 text-[10px]">
                                {parentMsg.senderId === user.id ? 'Replying to yourself' : `Replying to ${conversation.user?.name}`}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500 block truncate">
                                {parentMsg.content || 'Attachment'}
                              </span>
                            </button>
                          )}

                          <div
                            onDoubleClick={(e) => {
                              if (message.content === '🚫 This message was deleted') return;
                              e.stopPropagation();
                              handleMessageReact(message, '❤️');
                              // Show floating heart at tap position
                              const rect = e.currentTarget.getBoundingClientRect();
                              const heartId = `heart-float-${message.id}-${Date.now()}`;
                              const el = document.createElement('div');
                              el.id = heartId;
                              el.textContent = '❤️';
                              el.style.cssText = `position:fixed;left:${e.clientX - 16}px;top:${e.clientY - 16}px;font-size:32px;z-index:9999;pointer-events:none;animation:igHeartFloat 0.75s cubic-bezier(0.34,1.56,0.64,1) forwards;`;
                              document.body.appendChild(el);
                              setTimeout(() => el.remove(), 800);
                            }}
                            className={`message-bubble relative rounded-2xl transition-all duration-355 ${
                              highlightedMessageId === message.id ? 'highlight-msg-active' : ''
                            } ${
                              isMenuOpen
                                ? 'z-[9985] scale-[1.02] shadow-lg ring-1 ring-black/5 dark:ring-white/10'
                                : selectedMessageIds.includes(message.id)
                                ? 'scale-[1.01]'
                                : ''
                            }`}
                          >
                            {message.file && message.fileType?.startsWith('image/') ? (
                              <div className="rounded-2xl overflow-hidden shadow-xs border border-gray-200/60 dark:border-gray-700/40">
                                <img 
                                  src={message.file} 
                                  alt="Shared" 
                                  className="max-w-full max-h-48 sm:max-h-56 rounded-2xl cursor-pointer hover:opacity-95 transition-opacity" 
                                  onClick={(e) => {
                                    if (longPressedRef.current) {
                                      longPressedRef.current = false;
                                      e.preventDefault();
                                      return;
                                    }
                                    if (selectedMessageIds.length > 0) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleMessageSelection(message.id);
                                      if (contextMenuMessage) setContextMenuMessage(null);
                                    } else {
                                      setActiveImageView(message.file);
                                    }
                                  }}
                                  onLoad={() => {
                                    if (!initialHighlightMessageId && chatContainerRef.current) {
                                      const container = chatContainerRef.current;
                                      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 350;
                                      if (isNearBottom) {
                                        scrollToBottom();
                                      }
                                    }
                                  }}
                                  loading="lazy" 
                                />
                              </div>
                            ) : message.file ? (
                              <a 
                                href={selectedMessageIds.length > 0 ? '#' : message.file} 
                                download={message.fileName} 
                                onClick={(e) => {
                                  if (longPressedRef.current) {
                                    longPressedRef.current = false;
                                    e.preventDefault();
                                    return;
                                  }
                                  if (selectedMessageIds.length > 0) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleMessageSelection(message.id);
                                    if (contextMenuMessage) setContextMenuMessage(null);
                                  }
                                }}
                                className={`px-3 py-2.5 rounded-2xl shadow-xs border inline-flex items-center gap-2 ${isMine ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-[#0c1018] text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-800/60'}`}
                              >
                                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[12px] font-bold truncate max-w-[120px] sm:max-w-[160px]">{message.fileName}</span>
                              </a>
                            ) : (
                              <div className={`px-3.5 py-2.5 rounded-2xl shadow-xs border text-[13px] leading-relaxed break-words font-medium select-text ${isMine ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white rounded-tr-xs' : 'bg-white dark:bg-[#0c1018] text-slate-900 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/60 rounded-tl-xs'} ${message.content === '🚫 This message was deleted' ? 'text-slate-400 dark:text-slate-500 italic font-semibold border-slate-100 dark:border-slate-850/50 bg-slate-50 dark:bg-white/[0.01]' : ''}`}>
                                <p>{message.content}</p>
                              </div>
                            )}

                            {/* Reply Option Trigger on Hover */}
                            {selectedMessageIds.length === 0 && (
                              <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 z-10 ${isMine ? '-left-10' : '-right-10'}`}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReplyingTo(message);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-white dark:bg-[#0c1018] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-xs active:scale-90 transition-all"
                                  title="Reply to message"
                                >
                                  <CornerUpLeft className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Reaction bubble - shows actual emoji reacted */}
                            {message.reactions && message.reactions.length > 0 && (() => {
                              // Get unique emojis reacted (max 3 to show)
                              const uniqueEmojis = [...new Set(message.reactions.map(r => r.reaction))].slice(0, 3);
                              const total = message.reactions.length;
                              return (
                                <div
                                  className={`absolute -bottom-2 bg-white dark:bg-[#1a1d27] border border-slate-200/70 dark:border-slate-700/60 rounded-full shadow-sm z-20 flex items-center animate-scale-in ${isMine ? '-left-2' : '-right-2'}`}
                                  style={{ padding: '2px 5px 2px 4px', gap: 1 }}
                                >
                                  {uniqueEmojis.map(em => (
                                    <span key={em} style={{ fontSize: 11, lineHeight: 1 }}>{em}</span>
                                  ))}
                                  {total > 1 && (
                                    <span style={{ fontSize: 10, color: 'rgba(100,116,139,1)', fontWeight: 700, marginLeft: 2, lineHeight: 1 }}>{total}</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Timestamp & Star */}
                          <div className={`flex items-center gap-1 mt-0.5 justify-start ${isMine ? 'justify-end' : ''}`}>
                            {isStarred(message.id) && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0 animate-scale-in" />
                            )}
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{formatTimeAgo(message.timestamp)}</span>
                            {isMine && message.id === lastMyMessageId && (
                              <span className={`text-[9px] font-bold ml-1 animate-fade-in ${message.read === 1 ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                • {message.read === 1 ? 'Read' : 'Sent'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {isOtherTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%]">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full overflow-hidden shadow-xs mt-1">
                    {recipientUser?.avatar ? (
                      <img src={recipientUser.avatar} alt="" className="w-full h-full object-cover" onError={(e) => handleAvatarError(e, recipientUser?.name)} />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500">
                        {recipientUser?.name?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="bg-white dark:bg-[#0c1018] border border-slate-200/80 dark:border-slate-800/60 rounded-2xl rounded-tl-xs px-3.5 py-3 shadow-xs flex items-center gap-1 text-slate-400 dark:text-slate-500">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Multi-Select Toolbar (2+ messages) OR Input Bar (0 or 1 selected with popup) */}
      {selectedMessageIds.length > 1 ? (
        <div id="select-actions-toolbar" className="shrink-0 px-3 py-3 border-t border-slate-200/60 dark:border-white/[0.04] bg-white dark:bg-[#0a0d14] flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">
              {selectedMessageIds.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySelected}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/[0.03] text-xs font-bold text-slate-700 dark:text-slate-350 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-slate-450" />
              Copy
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-xs font-bold text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/30 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              Delete
            </button>
            <button
              onClick={() => setSelectedMessageIds([])}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/[0.03] text-xs font-bold text-slate-700 dark:text-slate-350 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 px-2.5 sm:px-3 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-slate-200/60 dark:border-white/[0.04] bg-white dark:bg-[#0a0d14]">
          {/* Reply indicator banner */}
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-slate-850/50 rounded-xl mb-2 text-xs animate-slide-up">
              <div className="flex items-center gap-1.5 min-w-0">
                <CornerUpLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-slate-400 font-semibold truncate">
                  Replying to <strong className="text-slate-700 dark:text-slate-300">{replyingTo.senderId === user.id ? 'yourself' : conversation.user?.name}</strong>: "{replyingTo.content || 'Attachment'}"
                </span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}

          {/* Editing indicator banner */}
          {editingMessage && (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-slate-850/50 rounded-xl mb-2 text-xs animate-slide-up">
              <div className="flex items-center gap-1.5 min-w-0">
                <Edit3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-slate-400 font-semibold truncate">
                  Editing message: <strong className="text-slate-700 dark:text-slate-300">"{editingMessage.content}"</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  setEditingMessage(null);
                  setNewMessage('');
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-1.5 sm:gap-2">
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={openFilePicker} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-90 transition-all">
                <Paperclip className="w-[17px] h-[17px] text-slate-500" strokeWidth={2} />
              </button>
              <button onClick={openImagePicker} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-90 transition-all">
                <ImageIcon className="w-[17px] h-[17px] text-slate-500" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 relative min-w-0">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder={editingMessage ? "Save edit..." : "Message..."}
                className="w-full pl-3.5 sm:pl-4 pr-11 sm:pr-12 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-slate-800/50 text-[13px] sm:text-[14px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-350 dark:focus:border-slate-700 transition-all duration-200"
              />
              <button onClick={() => setShowEmoji(!showEmoji)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-90 transition-all">
                <Smile className="w-[17px] h-[17px] text-slate-400" strokeWidth={2} />
              </button>
              {showEmoji && <EmojiPicker onSelect={(e) => setNewMessage(p => p + e)} onClose={() => setShowEmoji(false)} />}
            </div>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 active:scale-90 transition-all duration-150 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
            >
              <Send className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ── Instagram-style Message Context Menu ── */}
      {contextMenuMessage && menuPosition && (
        <>
          {/* Dim backdrop — pointer-events:none so taps pass through to messages */}
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 9980, background: 'rgba(0,0,0,0.22)', pointerEvents: 'none' }}
          />

          {/* Floating panel */}
          <div
            id="context-menu-container"
            style={{
              ...getMenuStyles(),
              animation: 'igMenuPop 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            {/* ── Emoji reaction row ── (Twemoji-style images, consistent cross-platform) */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-around',
              background: 'rgba(30,30,32,0.97)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              borderRadius: 28, padding: '8px 12px', marginBottom: 7,
              boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
              border: '0.5px solid rgba(255,255,255,0.10)',
            }}>
              {[
                { emoji: '❤️', cp: '2764' },
                { emoji: '😂', cp: '1f602' },
                { emoji: '😮', cp: '1f62e' },
                { emoji: '😢', cp: '1f622' },
                { emoji: '😠', cp: '1f620' },
                { emoji: '👍', cp: '1f44d' },
              ].map(({ emoji, cp }) => {
                const userReaction = contextMenuMessage.reactions?.find(r => r.userId === user?.id)?.reaction;
                const isSelected = userReaction === emoji;
                return (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMessageReact(contextMenuMessage, emoji);
                      setContextMenuMessage(null);
                      setSelectedMessageIds([]);
                    }}
                    title={emoji}
                    style={{
                      width: 40, height: 40, borderRadius: '50%', border: 'none',
                      background: isSelected ? 'rgba(255,255,255,0.15)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isSelected ? '0 0 0 1.5px rgba(255,255,255,0.35)' : 'none',
                      transition: 'transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                      flexShrink: 0,
                      outline: 'none',
                      padding: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.22) translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; }}
                    onTouchStart={e => { e.currentTarget.style.transform = 'scale(1.22) translateY(-3px)'; }}
                    onTouchEnd={e => { setTimeout(() => { if (e.currentTarget) e.currentTarget.style.transform = 'scale(1) translateY(0)'; }, 200); }}
                  >
                    <img
                      src={`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp}.svg`}
                      alt={emoji}
                      width={22}
                      height={22}
                      style={{ display: 'block', userSelect: 'none', filter: isSelected ? 'drop-shadow(0 0 3px rgba(255,255,255,0.4))' : 'none' }}
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>

            {/* ── Action menu body ── */}
            <div style={{
              background: 'rgba(30,30,32,0.97)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
              border: '0.5px solid rgba(255,255,255,0.10)',
            }}>
              {[
                {
                  icon: <CornerUpLeft size={16} />,
                  label: 'Reply',
                  action: () => { setReplyingTo(contextMenuMessage); setContextMenuMessage(null); setSelectedMessageIds([]); },
                  color: 'rgba(255,255,255,0.82)', show: true,
                },
                {
                  icon: <Copy size={16} />,
                  label: 'Copy',
                  action: handleCopyMessage,
                  color: 'rgba(255,255,255,0.82)',
                  show: contextMenuMessage.content !== '🚫 This message was deleted',
                },
                {
                  icon: <Star size={16} style={{ fill: isStarred(contextMenuMessage.id) ? '#f59e0b' : 'none' }} />,
                  label: isStarred(contextMenuMessage.id) ? 'Unstar' : 'Star',
                  action: handleStarToggle,
                  color: isStarred(contextMenuMessage.id) ? '#f59e0b' : 'rgba(255,255,255,0.82)',
                  show: true,
                },
                {
                  icon: <Edit3 size={16} />,
                  label: 'Edit',
                  action: () => { setEditingMessage(contextMenuMessage); setNewMessage(contextMenuMessage.content); setContextMenuMessage(null); setSelectedMessageIds([]); },
                  color: 'rgba(255,255,255,0.82)',
                  show: contextMenuMessage.senderId === user?.id && contextMenuMessage.content !== '🚫 This message was deleted',
                },
                {
                  icon: <ShieldAlert size={16} />,
                  label: 'Report',
                  action: handleReportMessage,
                  color: '#fb923c',
                  show: contextMenuMessage.senderId !== user?.id,
                },
                {
                  icon: <Trash2 size={16} />,
                  label: 'Delete for Everyone',
                  action: handleDeleteEveryone,
                  color: '#f87171',
                  show: contextMenuMessage.senderId === user?.id && contextMenuMessage.content !== '🚫 This message was deleted',
                },
                {
                  icon: <Trash2 size={16} />,
                  label: 'Delete for Me',
                  action: handleDeleteMe,
                  color: '#f87171',
                  show: true,
                },
              ].filter(item => item.show).map((item, idx, arr) => (
                <button
                  key={item.label}
                  onClick={(e) => { e.stopPropagation(); item.action(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 15px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                    borderBottom: idx < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.055)' : 'none',
                    transition: 'background 0.1s',
                    color: item.color,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.055)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  onTouchStart={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.055)'; }}
                  onTouchEnd={e => { setTimeout(() => { if (e.currentTarget) e.currentTarget.style.background = 'transparent'; }, 200); }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', color: item.color, flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: 500,
                    color: item.color,
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                  }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Keyframe animations */}
          <style>{`
            @keyframes igMenuPop {
              from { opacity:0; transform: scale(0.9) translateY(4px); }
              to   { opacity:1; transform: scale(1) translateY(0); }
            }
            @keyframes igHeartFloat {
              0%   { opacity:1; transform: scale(0.6); }
              50%  { opacity:1; transform: scale(1.4); }
              100% { opacity:0; transform: scale(1.1) translateY(-28px); }
            }
          `}</style>
        </>
      )}

      {/* Photo Viewer Modal */}
      {activeImageView && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveImageView(null)}
        >
          <button 
            onClick={() => setActiveImageView(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 z-[10001] shadow-lg border border-white/10"
            aria-label="Close image viewer"
          >
            <X className="w-5 h-5" />
          </button>
          <div 
            className="relative max-w-full max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900/40 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={activeImageView} 
              alt="View attachment" 
              className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-2xl" 
            />
          </div>
        </div>
      )}

      {/* Slide-out details page overlay */}
      <div 
        className={`absolute inset-0 z-50 bg-white dark:bg-[#080b14] flex flex-col ${
          showDetails ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          transition: 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform'
        }}
      >
        {showDetails && (
          <ChatDetails
            recipientUser={recipientUser}
            messages={messages}
            conversation={conversation}
            onBack={() => setShowDetails(false)}
            onSearch={() => {
              setShowDetails(false);
              setSearchOpen(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function Messages() {
  const { user, users, refreshUsers } = useAuth();
  const { refreshUnread, openConversation, closeConversation } = useMessages();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { setMobileNavHidden } = useLayout();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpenChat, setMobileOpenChat] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [initialHighlightMessageId, setInitialHighlightMessageId] = useState(null);

  const lastProcessedConversationIdRef = useRef(null);

  const handleSelectConversation = useCallback((id) => {
    setSelectedConversation(id);
    setMobileOpenChat(true);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      if (lastProcessedConversationIdRef.current !== selectedConversation) {
        lastProcessedConversationIdRef.current = selectedConversation;
        const conv = conversations.find(c => c.id === selectedConversation);
        const hadUnread = conv && conv.unread > 0;
        openConversation(selectedConversation, hadUnread);
        if (hadUnread) {
          setConversations(prev => prev.map(c => c.id === selectedConversation ? { ...c, unread: 0 } : c));
        }
      }
    } else {
      if (lastProcessedConversationIdRef.current !== null) {
        lastProcessedConversationIdRef.current = null;
        closeConversation();
      }
    }
  }, [selectedConversation, conversations, openConversation, closeConversation]);

  const refreshInbox = useCallback(async () => {
    if (!user?.id) return;
    try {
      const convs = await getConversations(user.id);
      setConversations(prev => {
        const updatedConvs = convs.map(c => c.id === selectedConversation ? { ...c, unread: 0 } : c);
        const isIdentical = prev.length === updatedConvs.length &&
          prev.every((c, idx) => c.id === updatedConvs[idx].id && c.lastMessage === updatedConvs[idx].lastMessage && c.unread === updatedConvs[idx].unread && c.timestamp === updatedConvs[idx].timestamp && c.user?.lastActive === updatedConvs[idx].user?.lastActive);
        return isIdentical ? prev : updatedConvs;
      });
    } catch (e) {
      console.warn('Failed to refresh inbox:', e);
    }
  }, [user?.id, selectedConversation]);

  const conversation = conversations.find(c => c.id === selectedConversation);

  useEffect(() => {
    setMobileNavHidden(mobileOpenChat);
    return () => setMobileNavHidden(false);
  }, [mobileOpenChat, setMobileNavHidden]);

  // Intercept phone browser/hardware back button to close the active chat on mobile instead of leaving the page
  useEffect(() => {
    if (!mobileOpenChat) return;

    window.history.pushState({ chatOpen: true }, '');

    const handlePopState = (e) => {
      setMobileOpenChat(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.chatOpen) {
        window.history.back();
      }
    };
  }, [mobileOpenChat]);

  // Ref-based polling to prevent unstable dependency re-runs/flickering
  const loadRef = useRef();
  loadRef.current = async (isFirst = false) => {
    if (isFirst) setLoading(true);
    try {
      await refreshUsers();
      await refreshInbox();
      refreshUnread?.();
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    } finally {
      if (isFirst) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadRef.current(true);
    const interval = setInterval(() => loadRef.current(false), 3000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const startChat = useCallback(async (targetUser) => {
    try {
      const convId = await createConversation(user.id, targetUser.id);
      const convs = await getConversations(user.id);
      setConversations(convs);
      setSelectedConversation(convId);
      setMobileOpenChat(true);
    } catch (e) { console.error('Failed to start chat:', e); }
  }, [user?.id]);

  useEffect(() => {
    if (location.state?.targetUser && !selectedConversation) {
      const foundConv = conversations.find(c => c.user?.id === location.state.targetUser.id);
      if (foundConv) {
        handleSelectConversation(foundConv.id);
      } else if (!loading && conversations.length > 0) {
        startChat(location.state.targetUser);
      }
    }
  }, [location.state?.targetUser, conversations, selectedConversation, loading, startChat, handleSelectConversation]);

  const handleStartChat = async (targetUser) => {
    await startChat(targetUser);
    setShowNewChat(false);
  };

  const handleStarredJump = (msg) => {
    setShowStarred(false);
    handleSelectConversation(msg.conversationId);
    setInitialHighlightMessageId(msg.id);
    setMobileOpenChat(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-[#080b14] overscroll-none messages-fullscreen">
      {showNewChat && <NewChatModal users={users} currentUser={user} onClose={() => setShowNewChat(false)} onStart={handleStartChat} />}
      {showStarred && <StarredMessagesModal currentUser={user} onClose={() => setShowStarred(false)} onJump={handleStarredJump} />}

      <div className="flex-1 flex min-h-0 overscroll-none relative overflow-hidden">
        <div 
          className={`w-full sm:w-80 flex-col shrink-0 h-full bg-white dark:bg-[#0a0d14] absolute sm:relative top-0 left-0 z-10 sm:z-0 flex ${
            mobileOpenChat 
              ? '-translate-x-[25%] opacity-60 sm:translate-x-0 sm:opacity-100' 
              : 'translate-x-0 opacity-100'
          }`}
          style={{
            transition: 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform, opacity'
          }}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation}
            onSelect={handleSelectConversation}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNewChat={() => setShowNewChat(true)}
            onOpenStarred={() => setShowStarred(true)}
            loading={loading}
          />
        </div>

        <div 
          className={`w-full sm:flex-1 flex-col h-full min-w-0 bg-white dark:bg-[#080b14] absolute sm:relative top-0 left-0 z-20 sm:z-0 flex shadow-[-8px_0_24px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_24px_rgba(0,0,0,0.25)] sm:shadow-none ${
            mobileOpenChat 
              ? 'translate-x-0' 
              : 'translate-x-full sm:translate-x-0'
          }`}
          style={{
            transition: 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform'
          }}
        >
          {conversation ? (
            <ChatView
              key={conversation.id}
              conversation={conversation}
              user={user}
              users={users}
              onBack={() => { setMobileOpenChat(false); }}
              addToast={addToast}
              addNotification={addNotification}
              initialHighlightMessageId={initialHighlightMessageId}
              clearInitialHighlightMessageId={() => setInitialHighlightMessageId(null)}
              refreshUnread={refreshUnread}
              refreshInbox={refreshInbox}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-[#080b14] h-full">
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/40 flex items-center justify-center mx-auto mb-5">
                  <Send className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1">No chat selected</h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5">Choose a conversation or start a new one</p>
                <button onClick={() => setShowNewChat(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-semibold active:scale-95 transition-all shadow-sm">
                  <Plus className="w-4 h-4" /> New Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
