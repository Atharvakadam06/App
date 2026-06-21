import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send, Paperclip, Image as ImageIcon, Smile, ArrowLeft, Inbox, X, Plus,
  CornerUpLeft, Star, Copy, Trash2, Edit3, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { useLayout } from '../context/LayoutContext';
import { uploadToCloudinary } from '../services/cloudinary';
import { getConversations, getMessages, sendMessage, createConversation, editMessage, deleteMessageEveryone } from '../services/data';
import { formatTimeAgo } from '../utils/timeUtils';
import ProfessionalSearch from '../components/ProfessionalSearch';

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

function ConversationList({ conversations, selectedId, onSelect, searchQuery, setSearchQuery, onNewChat }) {
  const filtered = conversations.filter(c => c.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0d14] sm:border-r border-gray-200/70 dark:border-gray-700/50 w-full sm:w-80">
      {/* Fixed Header */}
      <div className="shrink-0 p-4 sm:p-5 border-b border-gray-200/70 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">Messages</h2>
          <button onClick={onNewChat} className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center active:scale-90 transition-all shadow-sm">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        <ProfessionalSearch placeholder="Search..." value={searchQuery} onChange={setSearchQuery} className="bg-gray-50 dark:bg-[#0f131f] border-gray-200/70 dark:border-gray-700/50 rounded-xl text-[13px]" />
      </div>
      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling: touch overscroll-none">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center p-6 h-full">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">No conversations</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Start a new chat</p>
            </div>
          </div>
        ) : (
          filtered.map((conv, i) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className="w-full flex items-center gap-3 p-3 sm:p-4 transition-all border-b border-gray-100/60 dark:border-gray-800/40 last:border-0 active:scale-[0.98]"
              style={{ animationName: i === 0 ? 'none' : 'fadeInUp', animationDuration: '0.3s', animationFillMode: 'backwards', animationDelay: `${Math.min(i * 20, 200)}ms`, animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              <div className="relative shrink-0">
                <img src={conv.user?.avatar} alt={conv.user?.name} className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-white dark:ring-[#0a0d14] shadow-sm" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#0a0d14]" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{conv.user?.name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium ml-2 shrink-0">{formatTimeAgo(conv.timestamp)}</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{conv.lastMessage || 'Start a conversation'}</p>
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
  const filtered = users.filter(u => u.id !== currentUser?.id && u.name?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-[#0c1018] border border-gray-200/80 dark:border-gray-700/60 p-5 sm:p-6 w-full max-w-sm max-h-[60vh] sm:max-h-[70vh] flex flex-col rounded-t-2xl sm:rounded-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">New Conversation</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/70 flex items-center justify-center active:scale-90"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="mb-4">
          <ProfessionalSearch placeholder="Search students..." value={search} onChange={setUserSearch} className="bg-gray-50 dark:bg-[#0f131f] border-gray-200/70 dark:border-gray-700/50 rounded-xl text-[13px]" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {filtered.length === 0 ? <p className="text-[13px] text-gray-400 text-center py-8">No students found</p> : filtered.map(u => (
            <button key={u.id} onClick={() => onStart(u)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#0f131f]/60 transition-all active:scale-[0.98]">
              <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800" />
              <div className="text-left"><p className="text-[13px] font-semibold text-gray-900 dark:text-white">{u.name}</p><p className="text-[11px] text-gray-500 dark:text-gray-400">@{u.username}</p></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatView({ conversation, user, onBack, addToast, addNotification }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  // Gesture & Context Menu States
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [swipingMessageId, setSwipingMessageId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [contextMenuMessage, setContextMenuMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const pressTimerRef = useRef(null);

  // Live polling for conversation DMs (every 3 seconds)
  useEffect(() => {
    loadMessages(true);
    const interval = setInterval(() => loadMessages(false), 3000);
    return () => clearInterval(interval);
  }, [conversation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (firstTime = false) => {
    if (firstTime) setLoading(true);
    try {
      const msgs = await getMessages(conversation.id);
      // Filter out messages deleted for me locally
      const deletedKey = `stugrow_deleted_dm_messages_${user.id}`;
      const deletedIds = JSON.parse(localStorage.getItem(deletedKey)) || [];
      const visible = msgs.filter(m => !deletedIds.includes(m.id));
      setMessages(visible);
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
      addToast(`Reply to ${msg.senderId === user.id ? 'yourself' : conversation.user?.name}`, 'info');
    }
    setSwipingMessageId(null);
    setSwipeOffset(0);
    setIsSwipeActive(false);
  };

  const handlePressStart = (msg) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      setContextMenuMessage(msg);
      if (window.navigator.vibrate) window.navigator.vibrate(20);
    }, 550);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
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
    setContextMenuMessage(msg);
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
    const starredKey = `stugrow_starred_dm_messages_${user.id}`;
    let starred = JSON.parse(localStorage.getItem(starredKey)) || [];
    if (starred.includes(contextMenuMessage.id)) {
      starred = starred.filter(id => id !== contextMenuMessage.id);
      addToast('Message unstarred', 'info');
    } else {
      starred.push(contextMenuMessage.id);
      addToast('Message starred!', 'success');
    }
    localStorage.setItem(starredKey, JSON.stringify(starred));
    setContextMenuMessage(null);
  };

  const isStarred = (msgId) => {
    const starredKey = `stugrow_starred_dm_messages_${user.id}`;
    const starred = JSON.parse(localStorage.getItem(starredKey)) || [];
    return starred.includes(msgId);
  };

  const handleDeleteMe = () => {
    if (!contextMenuMessage) return;
    const deletedKey = `stugrow_deleted_dm_messages_${user.id}`;
    const deleted = JSON.parse(localStorage.getItem(deletedKey)) || [];
    deleted.push(contextMenuMessage.id);
    localStorage.setItem(deletedKey, JSON.stringify(deleted));
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

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#080b14]">
      {/* Chat Header */}
      <div className="shrink-0 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 h-14 sm:h-[60px] border-b border-slate-200/60 dark:border-white/[0.04] bg-white dark:bg-[#0a0d14]">
        <button onClick={onBack} className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800/60 active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-500" strokeWidth={2.5} />
        </button>
        <div className="relative shrink-0">
          <img src={conversation.user?.avatar} alt={conversation.user?.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800 shadow-sm" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#0a0d14]" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white truncate leading-tight">{conversation.user?.name}</h3>
          <p className="text-[10px] sm:text-[11px] text-emerald-500 font-bold mt-0.5 animate-pulse">Online</p>
        </div>
      </div>

      {/* Scrollable Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 h-full overflow-y-auto -webkit-overflow-scrolling: touch overscroll-none px-3 sm:px-4 py-3 space-y-4 bg-slate-50/40 dark:bg-[#080b14]"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <div className="w-6 h-6 border-2 border-slate-350 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
            <p className="text-[11px] text-slate-400">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#0c1018] border border-gray-200/60 dark:border-gray-700/40 flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Send className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Say hello! 👋</p>
            </div>
          </div>
        ) : (
          messages.map((message, i) => {
            const isMine = message.senderId === user?.id;
            const parentMsg = message.parentId ? messages.find(m => m.id === message.parentId) : null;
            const showAvatar = !isMine && (i === 0 || messages[i - 1]?.senderId !== message.senderId);
            const isThisSwiping = swipingMessageId === message.id;

            return (
              <div
                key={message.id}
                id={`msg-${message.id}`}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in group relative select-none`}
                style={{ animationDuration: '0.2s' }}
                onContextMenu={(e) => handleContextMenu(e, message)}
                onTouchStart={(e) => {
                  onTouchStart(e, message.id);
                  handlePressStart(message);
                }}
                onTouchMove={(e) => {
                  onTouchMove(e);
                  handleTouchMoveHold();
                }}
                onTouchEnd={() => {
                  onTouchEnd(message);
                  handlePressEnd();
                }}
                onMouseDown={() => handlePressStart(message)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
              >
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
                      {showAvatar ? <img src={conversation.user?.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                    </div>
                  )}

                  <div className="flex flex-col space-y-1">
                    {/* Quoted parent message */}
                    {parentMsg && (
                      <button
                        type="button"
                        onClick={() => handleScrollToMessage(message.parentId)}
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

                    <div className={`relative rounded-2xl transition-all duration-300 ${highlightedMessageId === message.id ? 'highlight-msg-active' : ''}`}>
                      {message.file && message.fileType?.startsWith('image/') ? (
                        <div className="rounded-2xl overflow-hidden shadow-xs border border-gray-200/60 dark:border-gray-700/40">
                          <img src={message.file} alt="Shared" className="max-w-full max-h-48 sm:max-h-56 rounded-2xl" loading="lazy" />
                        </div>
                      ) : message.file ? (
                        <a href={message.file} download={message.fileName} className={`px-3 py-2.5 rounded-2xl shadow-xs border inline-flex items-center gap-2 ${isMine ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white dark:bg-[#0c1018] text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-800/60'}`}>
                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[12px] font-bold truncate max-w-[120px] sm:max-w-[160px]">{message.fileName}</span>
                        </a>
                      ) : (
                        <div className={`px-3.5 py-2.5 rounded-2xl shadow-xs border text-[13px] leading-relaxed break-words font-medium ${isMine ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white rounded-tr-xs' : 'bg-white dark:bg-[#0c1018] text-slate-900 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/60 rounded-tl-xs'} ${message.content === '🚫 This message was deleted' ? 'text-slate-400 dark:text-slate-500 italic font-semibold border-slate-100 dark:border-slate-850/50 bg-slate-50 dark:bg-white/[0.01]' : ''}`}>
                          <p>{message.content}</p>
                        </div>
                      )}

                      {/* Reply Option Trigger on Hover */}
                      <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 z-10 ${isMine ? '-left-10' : '-right-10'}`}>
                        <button
                          onClick={() => setReplyingTo(message)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-[#0c1018] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-xs active:scale-90 transition-all"
                          title="Reply to message"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Timestamp & Star */}
                    <div className={`flex items-center gap-1 mt-0.5 justify-start ${isMine ? 'justify-end' : ''}`}>
                      {isStarred(message.id) && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0 animate-scale-in" />
                      )}
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{formatTimeAgo(message.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input / Reply / Edit Editor Bar */}
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
              onChange={(e) => setNewMessage(e.target.value)}
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

      {/* Glassmorphic Option Context Menu */}
      {contextMenuMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setContextMenuMessage(null)}
        >
          <div
            className="w-full max-w-[280px] rounded-3xl border border-white/20 dark:border-slate-800/85 bg-white/75 dark:bg-slate-950/70 backdrop-blur-xl shadow-2xl p-4 space-y-1 animate-scale-in animate-duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 mb-2 border-b border-slate-200/50 dark:border-slate-800/50 text-left">
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-500">
                Message Options
              </span>
              <p className="text-xs font-semibold text-slate-650 dark:text-slate-350 truncate mt-1">
                {contextMenuMessage.content || (contextMenuMessage.file ? 'Attached File' : '')}
              </p>
            </div>

            <button
              onClick={() => {
                setReplyingTo(contextMenuMessage);
                setContextMenuMessage(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition-colors active:scale-98 text-left"
            >
              <CornerUpLeft className="w-4 h-4 text-slate-400" />
              Reply
            </button>

            <button
              onClick={handleCopyMessage}
              disabled={contextMenuMessage.content === '🚫 This message was deleted'}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition-colors active:scale-98 text-left disabled:opacity-40"
            >
              <Copy className="w-4 h-4 text-slate-400" />
              Copy Text
            </button>

            <button
              onClick={handleStarToggle}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition-colors active:scale-98 text-left"
            >
              <Star className={`w-4 h-4 ${isStarred(contextMenuMessage.id) ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
              {isStarred(contextMenuMessage.id) ? 'Unstar Message' : 'Star Message'}
            </button>

            {contextMenuMessage.senderId === user.id && contextMenuMessage.content !== '🚫 This message was deleted' && (
              <>
                <button
                  onClick={() => {
                    setEditingMessage(contextMenuMessage);
                    setNewMessage(contextMenuMessage.content);
                    setContextMenuMessage(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition-colors active:scale-98 text-left"
                >
                  <Edit3 className="w-4 h-4 text-slate-400" />
                  Edit Message
                </button>

                <button
                  onClick={handleDeleteEveryone}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors active:scale-98 text-left"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  Delete for Everyone
                </button>
              </>
            )}

            <button
              onClick={handleDeleteMe}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors active:scale-98 text-left"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Delete for Me
            </button>

            {contextMenuMessage.senderId !== user.id && (
              <button
                onClick={handleReportMessage}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-bold text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors active:scale-98 text-left"
              >
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Report Message
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Messages() {
  const { user, users, refreshUsers } = useAuth();
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

  const conversation = conversations.find(c => c.id === selectedConversation);

  useEffect(() => {
    setMobileNavHidden(mobileOpenChat);
    return () => setMobileNavHidden(false);
  }, [mobileOpenChat, setMobileNavHidden]);

  useEffect(() => {
    const load = async () => {
      try {
        await refreshUsers();
        if (user?.id) {
          const convs = await getConversations(user.id);
          setConversations(convs);
        }
      } catch (e) { console.warn('Failed to load conversations:', e); }
      finally { setLoading(false); }
    };
    load();
  }, [user?.id, refreshUsers]);

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
        setSelectedConversation(foundConv.id);
        setMobileOpenChat(true);
      } else if (!loading && conversations.length > 0) {
        startChat(location.state.targetUser);
      }
    }
  }, [location.state?.targetUser, conversations, selectedConversation, loading, startChat]);

  const handleStartChat = async (targetUser) => {
    await startChat(targetUser);
    setShowNewChat(false);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-[#080b14] overscroll-none">
        <div className="shrink-0 p-4 sm:p-5 border-b border-gray-200/70 dark:border-gray-700/50">
          <div className="h-5 bg-gray-100 dark:bg-gray-800/60 rounded-lg w-24 mb-3" />
          <div className="h-10 bg-gray-100 dark:bg-gray-800/60 rounded-2xl w-full" />
        </div>
        <div className="flex-1 overflow-hidden p-4 space-y-3 overscroll-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${i % 2 === 0 ? 'order-2' : ''}`}>
                <div className="h-12 bg-gray-100 dark:bg-gray-800/60 rounded-2xl w-44" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-[#080b14] overscroll-none messages-fullscreen">
      {showNewChat && <NewChatModal users={users} currentUser={user} onClose={() => setShowNewChat(false)} onStart={handleStartChat} />}

      <div className="flex-1 flex min-h-0 overscroll-none">
        <div className={`${mobileOpenChat ? 'hidden' : 'flex'} sm:flex w-full sm:w-80 flex-col shrink-0 h-full`}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation}
            onSelect={(id) => { setSelectedConversation(id); setMobileOpenChat(true); }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNewChat={() => setShowNewChat(true)}
          />
        </div>

        <div className={`${mobileOpenChat ? 'flex' : 'hidden'} sm:flex flex-1 flex-col h-full w-full min-w-0 overscroll-none`}>
          {conversation ? (
            <ChatView
              conversation={conversation}
              user={user}
              onBack={() => { setMobileOpenChat(false); }}
              addToast={addToast}
              addNotification={addNotification}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-[#080b14]">
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
