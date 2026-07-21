import { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo, memo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send, ArrowLeft, Plus, X, Inbox, Trash2, Smile, CornerUpLeft, Search,
  Phone, Video, Copy, CheckSquare, Square, Check, Heart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLayout } from '../context/LayoutContext';
import { useMessages } from '../context/MessageContext';
import CallScreen from '../components/CallScreen';
import {
  getConversations, getMessages, sendMessage, markMessagesAsRead,
  updateUserLastActive, isUserOnline, deleteMessageEveryone, deleteMessageForUser,
  createConversation, createCall,
} from '../services/data';
import { formatTimeAgo } from '../utils/timeUtils';
import { handleAvatarError } from '../utils/avatarUtils';
import ProfessionalSearch from '../components/ProfessionalSearch';
import { matchSearch } from '../utils/searchUtils';

const EMOJIS = [
  '😀','😂','😊','😍','🥳','😎','🤔','😢','❤️','🔥',
  '👍','👏','🙏','💪','✨','🎉','🚀','💯','⭐','📚',
];

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

// ─── Inject CSS for chat animations ──────────────────────────────────────────
function injectChatCSS() {
  if (document.getElementById('sg-chat-css')) return;
  const s = document.createElement('style');
  s.id = 'sg-chat-css';
  s.textContent = `
    @keyframes sgHeartPop {
      0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
      40%  { transform: scale(1.5) rotate(5deg);  opacity: 1; }
      65%  { transform: scale(0.9) rotate(-3deg); opacity: 1; }
      80%  { transform: scale(1.1) rotate(2deg);  opacity: 1; }
      100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
    }
    @keyframes sgHeartFade {
      0%   { transform: scale(1.2); opacity: 1; }
      60%  { transform: scale(2.5); opacity: 0.6; }
      100% { transform: scale(3);   opacity: 0; }
    }
    @keyframes sgReactionIn {
      0%   { transform: scale(0.5) translateY(8px); opacity: 0; }
      60%  { transform: scale(1.1) translateY(-2px); opacity: 1; }
      100% { transform: scale(1)   translateY(0px);  opacity: 1; }
    }
    @keyframes sgPopIn {
      0%   { transform: scale(0.85) translateY(6px); opacity: 0; }
      70%  { transform: scale(1.02) translateY(-1px); opacity: 1; }
      100% { transform: scale(1)    translateY(0);    opacity: 1; }
    }
    @keyframes sgSlideUp {
      0%   { transform: translateY(10px); opacity: 0; }
      100% { transform: translateY(0);    opacity: 1; }
    }
    @keyframes sgMsgIn {
      0%   { transform: translateY(16px) scale(0.97); opacity: 0; }
      100% { transform: translateY(0)    scale(1);    opacity: 1; }
    }
    @keyframes sgEmojiHover {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.35) translateY(-4px); }
      100% { transform: scale(1.2) translateY(-3px); }
    }
    @keyframes sgBubbleTap {
      0%   { transform: scale(1); }
      40%  { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    .sg-msg-enter { animation: sgMsgIn 0.28s cubic-bezier(0.34,1.36,0.64,1) both; }
    .sg-reaction-pop { animation: sgReactionIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
    .sg-popover-in { animation: sgPopIn 0.22s cubic-bezier(0.34,1.2,0.64,1) both; }
    .sg-heart-pop { animation: sgHeartPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
    .sg-heart-fade { animation: sgHeartFade 0.6s ease-out forwards; }
    .sg-emoji-btn:hover { animation: sgEmojiHover 0.25s ease-out forwards; display: inline-flex; }
    .sg-bubble-tap { animation: sgBubbleTap 0.18s ease-out; }
    .sg-slide-up { animation: sgSlideUp 0.2s ease-out both; }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation List
// ─────────────────────────────────────────────────────────────────────────────
function ConversationList({ conversations, selectedId, onSelect, searchQuery, setSearchQuery, onNewChat, loading }) {
  const filtered = conversations.filter(c => matchSearch(c.user?.name || '', searchQuery));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0d14] border-r border-gray-100/80 dark:border-gray-800/40 w-full">
      {/* Header */}
      <div
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
        className="shrink-0 px-4 pb-3.5 border-b border-gray-100/80 dark:border-gray-800/40"
      >
        <div className="flex items-center justify-between mb-3.5">
          <h1 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">Messages</h1>
          <button
            onClick={onNewChat}
            className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 hover:opacity-80 active:scale-90 transition-all select-none cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400 dark:text-gray-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[13px] bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-gray-800/40 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-gray-200 dark:focus:border-gray-700 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-slate-200 dark:border-slate-700 border-t-slate-700 dark:border-t-slate-300 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-2" />
            <p className="text-[13px] text-gray-400 dark:text-gray-600 font-medium">
              {searchQuery ? 'No results found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filtered.map(conv => {
            const isActive = selectedId === conv.id;
            const isUnread = conv.unread > 0;
            const online = isUserOnline(conv.user?.lastActive);
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-50 dark:border-gray-800/20 last:border-0 select-none cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'bg-slate-50 dark:bg-white/[0.04]'
                    : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.02]'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={conv.user?.avatar}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover"
                    onError={(e) => handleAvatarError(e, conv.user?.name)}
                  />
                  {online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0a0d14]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[13px] truncate ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-slate-400'}`}>
                      {conv.user?.name}
                    </span>
                    <span className={`text-[10px] shrink-0 ml-2 ${isUnread ? 'text-gray-700 dark:text-gray-300 font-semibold' : 'text-gray-400 dark:text-gray-600'}`}>
                      {formatTimeAgo(conv.timestamp)}
                    </span>
                  </div>
                  <p className={`text-[11px] truncate ${isUnread ? 'text-gray-800 dark:text-slate-300 font-semibold' : 'text-gray-400 dark:text-gray-600'}`}>
                    {conv.lastMessage || 'Start a conversation'}
                  </p>
                </div>
                {isUnread && (
                  <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] flex items-center justify-center font-bold px-1">
                    {conv.unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Flying Heart (double-tap animation) ─────────────────────────────────────
function FlyingHeart({ x, y, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 750);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: 'fixed', left: x - 24, top: y - 24,
        width: 48, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 9999,
        animation: 'sgHeartFade 0.65s ease-out forwards',
      }}
    >
      ❤️
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat View
// ─────────────────────────────────────────────────────────────────────────────
const ChatView = memo(
  function ChatView({ conversation, user, onBack, addToast, refreshUnread, refreshInbox, isPageActive }) {
    const location = useLocation();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [activeMsg, setActiveMsg] = useState(null);
    const [selectedMsgs, setSelectedMsgs] = useState([]);
    const [activeCall, setActiveCall] = useState(location.state?.acceptedCall || null);
    const [flyingHearts, setFlyingHearts] = useState([]);

    // double-tap tracking
    const lastTapRef = useRef({});

    const bottomRef     = useRef(null);
    const inputRef      = useRef(null);
    const scrollAreaRef = useRef(null);
    const isPageActiveRef  = useRef(isPageActive !== false);
    const refreshUnreadRef = useRef(refreshUnread);
    const refreshInboxRef  = useRef(refreshInbox);
    const prevMsgCountRef  = useRef(0);
    const isNearBottomRef  = useRef(true);

    useEffect(() => { injectChatCSS(); }, []);

    useLayoutEffect(() => {
      isPageActiveRef.current = isPageActive !== false;
    }, [isPageActive]);

    useEffect(() => {
      refreshUnreadRef.current = refreshUnread;
      refreshInboxRef.current  = refreshInbox;
    }, [refreshUnread, refreshInbox]);

    useEffect(() => {
      setMessages([]);
      setLoading(true);
      setNewMessage('');
      setReplyingTo(null);
      setActiveMsg(null);
      setSelectedMsgs([]);
      setShowEmoji(false);
      isNearBottomRef.current  = true;
      prevMsgCountRef.current  = 0;
      lastTapRef.current = {};
    }, [conversation.id]);

    const loadMessages = useCallback(async (isFirst = false) => {
      if (!isPageActiveRef.current) return;
      try {
        const msgs = await getMessages(conversation.id);
        if (!isPageActiveRef.current) return;

        setMessages(prev => {
          if (prev.length !== msgs.length) return msgs;
          const same = prev.every((m, i) =>
            m.id === msgs[i].id &&
            m.content === msgs[i].content &&
            m.read === msgs[i].read
          );
          return same ? prev : msgs;
        });

        if (msgs.some(m => m.senderId !== user.id && m.read === 0)) {
          await markMessagesAsRead(conversation.id, user.id);
          if (!isPageActiveRef.current) return;
          refreshUnreadRef.current?.();
          refreshInboxRef.current?.();
        }
      } catch (e) {
        console.warn('Failed to load messages:', e);
      } finally {
        if (isFirst && isPageActiveRef.current) setLoading(false);
      }
    }, [conversation.id, user.id]);

    useEffect(() => {
      loadMessages(true);
      updateUserLastActive(user.id).catch(() => {});
      const interval = setInterval(() => {
        if (isPageActiveRef.current) loadMessages(false);
      }, 4000);
      return () => clearInterval(interval);
    }, [conversation.id, loadMessages, user.id]);

    useEffect(() => {
      if (!loading && messages.length > 0 && isNearBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' });
        prevMsgCountRef.current = messages.length;
      }
    }, [loading]);

    useEffect(() => {
      if (messages.length > prevMsgCountRef.current && !loading) {
        if (isNearBottomRef.current) {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMsgCountRef.current = messages.length;
      }
    }, [messages.length, loading]);

    const handleScroll = () => {
      const el = scrollAreaRef.current;
      if (!el) return;
      isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };

    const handleSend = async () => {
      const content = newMessage.trim();
      if (!content || sending) return;
      setSending(true);
      const parentId = replyingTo?.id ?? null;
      setNewMessage('');
      setReplyingTo(null);
      setShowEmoji(false);
      isNearBottomRef.current = true;
      try {
        await sendMessage(conversation.id, user.id, content, null, null, null, parentId);
        await loadMessages(false);
      } catch {
        addToast('Failed to send message', 'error');
        setNewMessage(content);
      } finally {
        setSending(false);
      }
    };

    const handleDelete = async (msg) => {
      setActiveMsg(null);
      try {
        if (msg.senderId === user.id) {
          await deleteMessageEveryone(msg.id);
        } else {
          await deleteMessageForUser(user.id, msg.id);
        }
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      } catch {
        addToast('Failed to delete message', 'error');
      }
    };

    const handleToggleReaction = (msg, emoji) => {
      setMessages(prev =>
        prev.map(m => {
          if (m.id !== msg.id) return m;
          const current = (m.reactions && typeof m.reactions === 'object' && !Array.isArray(m.reactions)) ? m.reactions : {};
          const rawUsers = current[emoji];
          const userList = Array.isArray(rawUsers) ? rawUsers : (typeof rawUsers === 'string' ? [rawUsers] : []);
          const hasReacted = userList.includes(user.id);
          const updated = hasReacted
            ? userList.filter(id => id !== user.id)
            : [...userList, user.id];
          const newReactions = { ...current };
          if (updated.length > 0) {
            newReactions[emoji] = updated;
          } else {
            delete newReactions[emoji];
          }
          return { ...m, reactions: newReactions };
        })
      );
      setActiveMsg(null);
    };

    // Double-tap to heart (Instagram style)
    const handleDoubleTap = (msg, clientX, clientY) => {
      handleToggleReaction(msg, '❤️');
      const id = Date.now();
      setFlyingHearts(prev => [...prev, { id, x: clientX, y: clientY }]);
    };

    const handleBubbleTap = (e, msg) => {
      e.stopPropagation();
      const now = Date.now();
      const last = lastTapRef.current[msg.id] || 0;
      if (now - last < 300) {
        // Double tap!
        lastTapRef.current[msg.id] = 0;
        handleDoubleTap(msg, e.clientX, e.clientY);
        return;
      }
      lastTapRef.current[msg.id] = now;
      // Single tap: toggle popover (with a small delay to allow double-tap detection)
      setTimeout(() => {
        if (lastTapRef.current[msg.id] === now) {
          if (inSelectionMode) {
            toggleSelectMsg(msg.id);
          } else {
            setActiveMsg(prev => prev?.id === msg.id ? null : msg);
            setShowEmoji(false);
          }
        }
      }, 220);
    };

    const toggleSelectMsg = (msgId) => {
      setSelectedMsgs(prev =>
        prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
      );
    };

    const handleCopySelected = () => {
      const text = messages
        .filter(m => selectedMsgs.includes(m.id))
        .map(m => m.content)
        .join('\n');
      if (text) {
        navigator.clipboard.writeText(text);
        addToast('Copied selected messages', 'success');
      }
      setSelectedMsgs([]);
    };

    const handleDeleteSelected = async () => {
      const toDelete = messages.filter(m => selectedMsgs.includes(m.id));
      for (const msg of toDelete) {
        try {
          if (msg.senderId === user.id) {
            await deleteMessageEveryone(msg.id);
          } else {
            await deleteMessageForUser(user.id, msg.id);
          }
        } catch {}
      }
      setMessages(prev => prev.filter(m => !selectedMsgs.includes(m.id)));
      addToast(`Deleted ${selectedMsgs.length} message(s)`, 'success');
      setSelectedMsgs([]);
    };

    const handleStartCall = async (type) => {
      try {
        const callData = await createCall(conversation.id, user.id, conversation.user.id, type);
        setActiveCall({
          id: callData.id,
          conversation_id: conversation.id,
          caller_id: user.id,
          receiver_id: conversation.user.id,
          type,
          status: 'ringing',
          room_name: callData.roomName,
        });
      } catch (e) {
        console.warn('Failed to start call:', e);
        addToast('Failed to initiate call', 'error');
      }
    };

    const online = isUserOnline(conversation.user?.lastActive);
    const inSelectionMode = selectedMsgs.length > 0;

    return (
      <div
        className="flex flex-col h-full"
        style={{ background: 'var(--sg-chat-bg, #ffffff)' }}
        onClick={() => { setActiveMsg(null); setShowEmoji(false); }}
      >
        {/* Flying hearts portal */}
        {flyingHearts.map(h => (
          <FlyingHeart key={h.id} x={h.x} y={h.y} onDone={() => setFlyingHearts(prev => prev.filter(f => f.id !== h.id))} />
        ))}

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}
          className="shrink-0 flex items-center gap-3 px-4 pb-3.5 border-b border-gray-100/80 dark:border-gray-800/40 bg-white/95 dark:bg-[#080b14]/95 backdrop-blur-sm"
        >
          {inSelectionMode ? (
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMsgs([])}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 select-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-[14px] font-bold text-gray-900 dark:text-white">
                  {selectedMsgs.length} selected
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopySelected}
                  className="p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 transition-all select-none cursor-pointer"
                  title="Copy selected"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 active:scale-95 transition-all select-none cursor-pointer"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                className="sm:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors select-none cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="relative shrink-0">
                <img
                  src={conversation.user?.avatar}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                  onError={(e) => handleAvatarError(e, conversation.user?.name)}
                />
                {online && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-[#080b14]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
                  {conversation.user?.name}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-600">
                  {online ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Active now
                    </span>
                  ) : `Active ${formatTimeAgo(conversation.user?.lastActive)}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleStartCall('audio')}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 transition-all select-none cursor-pointer"
                  title="Audio Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleStartCall('video')}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 transition-all select-none cursor-pointer"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Messages ────────────────────────────────────────────────────── */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto px-3 py-4"
          style={{ background: 'transparent' }}
          onScroll={handleScroll}
          onClick={() => { setActiveMsg(null); setShowEmoji(false); }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-slate-200 dark:border-slate-700 border-t-slate-700 dark:border-t-slate-300 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center mb-3 shadow-sm">
                <Send className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-500">
                Say hi to {conversation.user?.name}!
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1">
                Double-tap any message to ❤️ it
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {messages.map((msg, idx) => {
                const isMine      = msg.senderId === user.id;
                const prevMsg     = messages[idx - 1];
                const nextMsg     = messages[idx + 1];
                const isGrouped   = prevMsg && prevMsg.senderId === msg.senderId;
                const isGroupedNext = nextMsg && nextMsg.senderId === msg.senderId;
                const isActive    = activeMsg?.id === msg.id;
                const isSelected  = selectedMsgs.includes(msg.id);
                const parent      = msg.parentId ? messages.find(m => m.id === msg.parentId) : null;
                const hasReactions = msg.reactions && typeof msg.reactions === 'object' && Object.keys(msg.reactions).length > 0;

                // Instagram-style bubble radius
                const myRadius = isGrouped && isGroupedNext
                  ? '18px 4px 4px 18px'
                  : isGrouped
                  ? '18px 4px 18px 18px'
                  : isGroupedNext
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px';

                const theirRadius = isGrouped && isGroupedNext
                  ? '4px 18px 18px 4px'
                  : isGrouped
                  ? '4px 18px 18px 18px'
                  : isGroupedNext
                  ? '18px 18px 4px 4px'
                  : '18px 18px 18px 4px';

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-[2px]' : 'mt-3'}`}
                  >
                    {/* Avatar - only for others, only on last in group */}
                    {!isMine && (
                      <div className={`w-6 h-6 rounded-full overflow-hidden shrink-0 self-end ${isGroupedNext ? 'opacity-0' : 'opacity-100'}`}>
                        <img
                          src={conversation.user?.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => handleAvatarError(e, conversation.user?.name)}
                        />
                      </div>
                    )}

                    <div className={`relative flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[72%]`}>
                      {/* Selection checkbox */}
                      {inSelectionMode && (
                        <div className={`flex items-center gap-2 mb-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelectMsg(msg.id); }}
                            className="shrink-0 text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 select-none cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-slate-900 dark:text-white" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Reply preview */}
                      {parent && (
                        <div className={`text-[10px] px-2.5 py-1.5 mb-1 rounded-xl border-l-2 truncate max-w-full ${
                          isMine
                            ? 'bg-slate-100 dark:bg-white/[0.06] border-slate-400/60 text-gray-500 dark:text-gray-500'
                            : 'bg-gray-100 dark:bg-white/[0.04] border-gray-300/70 text-gray-500 dark:text-gray-500'
                        }`}>
                          {parent.content}
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={`relative group ${isSelected ? 'scale-[0.97] opacity-80' : ''}`}
                        style={{ transition: 'transform 0.15s ease, opacity 0.15s ease' }}
                        onClick={(e) => handleBubbleTap(e, msg)}
                        onDoubleClick={(e) => { e.stopPropagation(); handleDoubleTap(msg, e.clientX, e.clientY); }}
                      >
                        <div
                          style={{
                            borderRadius: isMine ? myRadius : theirRadius,
                            padding: '10px 14px',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            cursor: 'pointer',
                            userSelect: 'text',
                            wordBreak: 'break-word',
                            transition: 'background 0.15s ease',
                            ...(isMine
                              ? {
                                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                                color: '#fff',
                                boxShadow: '0 2px 12px rgba(15,52,96,0.3)',
                              }
                              : {
                                background: 'var(--sg-other-bubble, #f0f0f0)',
                                color: 'var(--sg-other-bubble-text, #1a1a1a)',
                              }
                            ),
                          }}
                          className={`dark:${isMine ? '' : '[--sg-other-bubble:#1e2333] [--sg-other-bubble-text:#e8eaf0]'}`}
                        >
                          {msg.content}
                          {msg.edited && <span style={{ fontSize: '9px', opacity: 0.4, marginLeft: '4px' }}>(edited)</span>}
                        </div>

                        {/* Hover quick-react hint — subtle heart on hover */}
                        {!inSelectionMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDoubleTap(msg, e.clientX, e.clientY); }}
                            className={`absolute top-1/2 -translate-y-1/2 ${isMine ? '-left-7' : '-right-7'} opacity-0 group-hover:opacity-60 transition-opacity duration-150 hover:!opacity-100 hover:scale-125 text-[14px] select-none cursor-pointer`}
                            title="React with ❤️"
                          >
                            ❤️
                          </button>
                        )}
                      </div>

                      {/* Instagram-style reactions floating pill */}
                      {hasReactions && (
                        <div
                          className={`flex items-center gap-0.5 mt-1 ${isMine ? 'self-end' : 'self-start'}`}
                          style={{
                            background: 'var(--sg-reaction-bg, rgba(255,255,255,0.95))',
                            borderRadius: 99,
                            padding: '2px 6px',
                            boxShadow: '0 1px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
                            gap: '2px',
                          }}
                        >
                          {Object.entries(msg.reactions).map(([emoji, rawUsers]) => {
                            const userList = Array.isArray(rawUsers) ? rawUsers : (typeof rawUsers === 'string' ? [rawUsers] : []);
                            if (userList.length === 0) return null;
                            const reacted = userList.includes(user.id);
                            return (
                              <button
                                key={emoji}
                                onClick={(e) => { e.stopPropagation(); handleToggleReaction(msg, emoji); }}
                                className="sg-reaction-pop select-none cursor-pointer flex items-center"
                                style={{
                                  fontSize: '13px',
                                  padding: '1px 2px',
                                  borderRadius: 99,
                                  background: reacted ? 'rgba(99,102,241,0.12)' : 'transparent',
                                  fontWeight: reacted ? 700 : 400,
                                  transition: 'background 0.15s',
                                  outline: 'none',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                {emoji}
                                {userList.length > 1 && (
                                  <span style={{ fontSize: '9px', color: '#888', fontWeight: 600 }}>{userList.length}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Timestamp */}
                      {!isGroupedNext && (
                        <div className={`flex mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span style={{ fontSize: '9px', color: '#9ca3af' }}>
                            {formatTimeAgo(msg.timestamp)}
                            {isMine && msg.read ? (
                              <span style={{ marginLeft: '3px', color: '#6366f1' }}>✓✓</span>
                            ) : isMine ? (
                              <span style={{ marginLeft: '3px' }}>✓</span>
                            ) : null}
                          </span>
                        </div>
                      )}

                      {/* Instagram-style floating reaction + action popover */}
                      {isActive && !inSelectionMode && (
                        <div
                          onClick={e => e.stopPropagation()}
                          className={`absolute z-30 sg-popover-in ${isMine ? 'right-0' : 'left-0'} bottom-full mb-2`}
                          style={{
                            background: 'var(--sg-popover-bg, rgba(255,255,255,0.98))',
                            borderRadius: '20px',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06)',
                            overflow: 'visible',
                            minWidth: '220px',
                          }}
                        >
                          {/* Reaction row — Instagram style */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {QUICK_REACTIONS.map((emoji, i) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg, emoji)}
                                className="sg-emoji-btn"
                                style={{
                                  width: 34, height: 34,
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '20px',
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  borderRadius: '50%',
                                  animationDelay: `${i * 0.04}s`,
                                  WebkitTapHighlightColor: 'transparent',
                                  transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.3) translateY(-4px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 4px' }}>
                            {/* Reply */}
                            <button
                              onClick={() => { setReplyingTo(msg); setActiveMsg(null); inputRef.current?.focus(); }}
                              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 12, transition: 'background 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                            >
                              <CornerUpLeft style={{ width: 16, height: 16, color: '#6b7280' }} />
                              <span style={{ fontSize: 9.5, color: '#9ca3af', fontWeight: 500 }}>Reply</span>
                            </button>

                            {/* Copy */}
                            <button
                              onClick={() => { navigator.clipboard.writeText(msg.content); addToast('Copied', 'success'); setActiveMsg(null); }}
                              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 12, transition: 'background 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                            >
                              <Copy style={{ width: 16, height: 16, color: '#6b7280' }} />
                              <span style={{ fontSize: 9.5, color: '#9ca3af', fontWeight: 500 }}>Copy</span>
                            </button>

                            {/* Select */}
                            <button
                              onClick={() => { toggleSelectMsg(msg.id); setActiveMsg(null); }}
                              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 12, transition: 'background 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                            >
                              <CheckSquare style={{ width: 16, height: 16, color: '#6b7280' }} />
                              <span style={{ fontSize: 9.5, color: '#9ca3af', fontWeight: 500 }}>Select</span>
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(msg)}
                              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 12, transition: 'background 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                            >
                              <Trash2 style={{ width: 16, height: 16, color: '#ef4444' }} />
                              <span style={{ fontSize: 9.5, color: '#ef4444', fontWeight: 500 }}>Delete</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} style={{ height: 8 }} />
            </div>
          )}
        </div>

        {/* ── Reply Banner ─────────────────────────────────────────────────── */}
        {replyingTo && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border-t border-gray-100/80 dark:border-gray-800/40 sg-slide-up">
            <CornerUpLeft className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="flex-1 text-[12px] text-gray-500 dark:text-gray-500 truncate">
              <span className="font-semibold text-gray-700 dark:text-gray-400">
                {replyingTo.senderId === user.id ? 'You' : conversation.user?.name}:{' '}
              </span>
              {replyingTo.content}
            </p>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors select-none cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        )}

        {/* ── Emoji Tray ───────────────────────────────────────────────────── */}
        {showEmoji && (
          <div
            className="shrink-0 px-3 py-2 border-t border-gray-100/80 dark:border-gray-800/40 sg-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { setNewMessage(m => m + e); setShowEmoji(false); inputRef.current?.focus(); }}
                  className="w-9 h-9 flex items-center justify-center text-[18px] hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all hover:scale-110 select-none cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input Bar ────────────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:pb-2.5 border-t border-gray-100/80 dark:border-gray-800/40 bg-white/95 dark:bg-[#080b14]/95 backdrop-blur-sm"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setShowEmoji(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 select-none cursor-pointer"
          >
            <Smile className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Message ${conversation.user?.name || ''}…`}
            className="flex-1 bg-gray-50 dark:bg-white/[0.05] border border-gray-200/80 dark:border-gray-800/50 rounded-2xl px-4 py-2.5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-indigo-300/60 dark:focus:border-indigo-700/60 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-30 select-none cursor-pointer active:scale-90"
            style={{
              background: newMessage.trim()
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              color: '#fff',
              boxShadow: newMessage.trim() ? '0 4px 14px rgba(102,126,234,0.4)' : 'none',
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* ── Call Screen Modal Overlay ──────────────────────────────────────── */}
        {activeCall && (
          <CallScreen
            call={activeCall}
            currentUserId={user.id}
            otherUser={conversation.user}
            onHangUp={() => setActiveCall(null)}
          />
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.conversation?.id === next.conversation?.id &&
    prev.conversation?.user?.lastActive === next.conversation?.user?.lastActive &&
    prev.isPageActive === next.isPageActive
);

// ─────────────────────────────────────────────────────────────────────────────
// Messages Page (default export)
// ─────────────────────────────────────────────────────────────────────────────
export default function Messages() {
  const { user, users } = useAuth();
  const { addToast } = useToast();
  const { setMobileNavHidden } = useLayout();
  const { refreshUnread, openConversation, closeConversation } = useMessages();
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [selectedId,   setSelectedId]   = useState(null);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [loading,      setLoading]      = useState(true);
  const [chatOpen,     setChatOpen]     = useState(false);
  const [showNewChat,  setShowNewChat]  = useState(false);

  const isPageActiveRef = useRef(location.pathname === '/inbox');
  useLayoutEffect(() => {
    isPageActiveRef.current = location.pathname === '/inbox';
  }, [location.pathname]);

  // Show/hide mobile bottom nav when chat panel opens/closes
  useEffect(() => {
    setMobileNavHidden(chatOpen);
    return () => setMobileNavHidden(false);
  }, [chatOpen, setMobileNavHidden]);

  // ── Dedup helper: returns prev state if data is identical ────────────────
  const dedupConversations = useCallback((prev, next) => {
    if (prev.length !== next.length) return next;
    const same = prev.every((c, i) =>
      c.id === next[i].id &&
      c.lastMessage === next[i].lastMessage &&
      c.unread === next[i].unread &&
      c.timestamp === next[i].timestamp
    );
    return same ? prev : next;
  }, []);

  // ── Load conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async (isFirst = false) => {
    if (!user?.id) return;
    try {
      const convs = await getConversations(user.id);
      setConversations(prev => dedupConversations(prev, convs));
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    } finally {
      if (isFirst) setLoading(false);
    }
  }, [user?.id, dedupConversations]);

  // ── Polling for conversation list (8s) — only when on /inbox ─────────────
  useEffect(() => {
    if (!user?.id || location.pathname !== '/inbox') return;
    loadConversations(true);
    const interval = setInterval(() => {
      if (isPageActiveRef.current) loadConversations(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [user?.id, location.pathname, loadConversations]);

  // ── Clear conversation after navigating away (after animation) ────────────
  useEffect(() => {
    if (location.pathname !== '/inbox') {
      const t1 = setTimeout(() => setSelectedId(null), 520);
      const t2 = setTimeout(() => setChatOpen(false), 500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [location.pathname]);

  // ── Stable conversation reference ─────────────────────────────────────────
  // useMemo prevents a new object reference on every parent render.
  // Combined with the memo() comparator on ChatView, this eliminates the
  // "re-render ChatView every 8s even when data is identical" bug.
  const conversation = useMemo(
    () => (selectedId ? conversations.find(c => c.id === selectedId) ?? null : null),
    [conversations, selectedId]
  );

  // ── refreshInbox (called by ChatView after sending/marking messages) ──────
  // Uses the same dedup check to avoid cascading re-renders.
  const refreshInbox = useCallback(async () => {
    if (!user?.id) return;
    try {
      const convs = await getConversations(user.id);
      setConversations(prev => dedupConversations(prev, convs));
    } catch { /* ignore */ }
  }, [user?.id, dedupConversations]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setChatOpen(true);
    const conv = conversations.find(c => c.id === id);
    openConversation(id, conv?.unread > 0);
    if (conv?.unread > 0) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    }
  };

  const handleBack = () => {
    setChatOpen(false);
    closeConversation();
  };

  // App.jsx dispatches 'messages-back' when the user swipes right while a chat is open.
  // We use a ref so the listener always calls the latest handleBack without re-registering.
  const handleBackRef = useRef(null);
  handleBackRef.current = handleBack;
  useEffect(() => {
    const listener = () => handleBackRef.current?.();
    window.addEventListener('messages-back', listener);
    return () => window.removeEventListener('messages-back', listener);
  }, []);

  return (
    <div className="messages-fullscreen flex h-full overflow-hidden">
      {/* ── Conversation List ──────────────────────────────────────────────── */}
      {/* w-full on mobile (chatOpen=false), fixed 280px on desktop */}
      <div className={`flex-col h-full shrink-0 w-full sm:w-[280px] ${chatOpen ? 'hidden sm:flex' : 'flex'}`}>
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNewChat={() => setShowNewChat(true)}
          loading={loading}
        />
      </div>

      {/* ── Chat View ──────────────────────────────────────────────────────── */}
      <div className={`flex-col h-full min-w-0 ${chatOpen ? 'flex flex-1' : 'hidden sm:flex sm:flex-1'}`}>
        {conversation ? (
          <ChatView
            conversation={conversation}
            user={user}
            onBack={handleBack}
            addToast={addToast}
            refreshUnread={refreshUnread}
            refreshInbox={refreshInbox}
            isPageActive={location.pathname === '/inbox'}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mb-4">
              <Send className="w-7 h-7 text-slate-400 dark:text-slate-600" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-gray-700 dark:text-gray-300 mb-1">No chat selected</p>
            <p className="text-[13px] text-gray-400 dark:text-gray-600 mb-5">
              Choose a conversation or start a new one
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[13px] font-semibold rounded-2xl hover:opacity-80 active:scale-95 transition-all flex items-center gap-2 select-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
        )}
      </div>

      {/* ── New Chat Modal ─────────────────────────────────────────────────── */}
      {showNewChat && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowNewChat(false)}
        >
          <div
            className="bg-white dark:bg-[#0c1018] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl border border-gray-100 dark:border-gray-800/80"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800/60">
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">New Message</h3>
              <button
                onClick={() => setShowNewChat(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors select-none cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <ProfessionalSearch
                users={(users || []).filter(u => u.id !== user?.id)}
                placeholder="Search people…"
                onSelect={async (selectedUser) => {
                  setShowNewChat(false);
                  try {
                    const convId = await createConversation(user.id, selectedUser.id);
                    await loadConversations(false);
                    handleSelect(convId);
                  } catch {
                    addToast('Failed to start conversation', 'error');
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
