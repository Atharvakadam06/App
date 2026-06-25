import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Paperclip, Image as ImageIcon, Smile, ArrowLeft, X, Globe, CornerUpLeft,
  MessageSquare, Trash2, Edit3, Copy, Star, AlertTriangle, ShieldAlert, Check, Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLayout } from '../context/LayoutContext';
import { uploadToCloudinary } from '../services/cloudinary';
import {
  getGlobalMessages, sendGlobalMessage, editGlobalMessage, deleteGlobalMessageEveryone,
  deleteMessageForUser, getDeletedMessageIds, toggleMessageReaction
} from '../services/data';
import { formatTimeAgo } from '../utils/timeUtils';

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

export default function GlobalChat() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { setMobileNavHidden } = useLayout();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Gesture / Context Menu States
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
  const isFirstLoadRef = useRef(true);
  const prevMessageIdsRef = useRef(new Set());

  // Poll for new messages every 3 seconds to keep it live
  useEffect(() => {
    loadMessages(true);
    const interval = setInterval(() => loadMessages(false), 3000);
    return () => clearInterval(interval);
  }, []);

  // Hide mobile nav when on chat view to maximize screen estate
  useEffect(() => {
    setMobileNavHidden(true);
    return () => setMobileNavHidden(false);
  }, [setMobileNavHidden]);

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

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    if (loading) return;

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
  }, [messages, loading, user.id]);

  const loadMessages = async (firstTime = false) => {
    if (firstTime) setLoading(true);
    try {
      const list = await getGlobalMessages();
      // Filter out messages deleted for the current user (Delete for me, synced via DB)
      const deletedKey = `stugrow_deleted_messages_${user.id}`;
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

      const visible = list.filter(m => !combined.includes(m.id));
      setMessages(prev => {
        const isIdentical = prev.length === visible.length &&
          prev.every((msg, idx) => msg.id === visible[idx].id && msg.content === visible[idx].content);
        return isIdentical ? prev : visible;
      });
    } catch (e) {
      console.warn('Failed to load global messages:', e);
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
        await editGlobalMessage(msgId, content);
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
      await sendGlobalMessage(user.id, content, null, null, null, parentId);
      await loadMessages(false);
    } catch (e) {
      console.error('Failed to send global message:', e);
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
    input.id = 'global-file-' + Math.random().toString(36).substr(2, 9);
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
    input.id = 'global-image-' + Math.random().toString(36).substr(2, 9);
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
      const fileUrl = await uploadToCloudinary(file, 'stugrow/global_chat');
      const parentId = replyingTo ? replyingTo.id : null;
      setReplyingTo(null);
      await sendGlobalMessage(user.id, isImage ? '' : `Shared File: ${file.name}`, fileUrl, file.name, file.type, parentId);
      await loadMessages(false);
      addToast('Attachment sent successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to upload file.', 'error');
    }
  };

  // --- Long Press / Swipe to Reply / Star / Delete Handlers ---
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

  const getMenuStyles = () => {
    if (!menuPosition) return {};
    const { top, left, width, height } = menuPosition;
    const menuWidth = 220;
    const menuHeight = 250; // Estimated height for clamping
    const gap = 6;
    
    // Center horizontally relative to the selected message bubble
    let targetLeft = left + (width / 2) - (menuWidth / 2);
    
    let targetTop = top + height + gap;
    
    // Get container dimensions
    const containerWidth = chatViewRef.current ? chatViewRef.current.clientWidth : window.innerWidth;
    const containerHeight = chatViewRef.current ? chatViewRef.current.clientHeight : window.innerHeight;
    
    if (targetTop + menuHeight > containerHeight - 16) {
      targetTop = top - menuHeight - gap;
    }
    
    // Clamp to container boundaries
    targetLeft = Math.max(16, Math.min(containerWidth - menuWidth - 16, targetLeft));
    targetTop = Math.max(70, Math.min(containerHeight - menuHeight - 16, targetTop));
    
    return {
      position: 'absolute',
      left: `${targetLeft}px`,
      top: `${targetTop}px`,
      width: `${menuWidth}px`,
    };
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
      const deletedKey = `stugrow_deleted_messages_${user.id}`;
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
      addToast('Selected messages deleted', 'success');
      loadMessages(false);
    } catch (err) {
      console.error('Error deleting global messages:', err);
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
        const bubbleElement = (element && typeof element.closest === 'function')
          ? element.closest('.message-bubble') || element
          : element;
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
    const bubbleElement = (clickedElement && typeof clickedElement.closest === 'function')
      ? clickedElement.closest('.message-bubble') || e.currentTarget.querySelector('.message-bubble') || e.currentTarget
      : e.currentTarget.querySelector('.message-bubble') || e.currentTarget;
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
    const starredKey = `stugrow_starred_messages_${user?.id}`;
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
    const starredKey = `stugrow_starred_messages_${user?.id}`;
    const starred = JSON.parse(localStorage.getItem(starredKey)) || [];
    return starred.includes(msgId);
  };

  const handleDeleteMe = async () => {
    if (!contextMenuMessage) return;
    const deletedKey = `stugrow_deleted_messages_${user?.id}`;
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
      await deleteGlobalMessageEveryone(contextMenuMessage.id);
      addToast('Message deleted for everyone', 'success');
      loadMessages(false);
    } catch (e) {
      addToast('Failed to delete message', 'error');
    }
    setContextMenuMessage(null);
  };

  const handleReportMessage = () => {
    addToast('Message reported successfully. Our moderation team will review it.', 'success');
    setContextMenuMessage(null);
  };

  return (
    <div ref={chatViewRef} className="flex flex-col h-full bg-[#fcfbf9] dark:bg-[#080b14] messages-fullscreen select-none relative">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 h-14 sm:h-[60px] border-b border-slate-200/60 dark:border-white/[0.04] bg-white/95 dark:bg-[#080b14]/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all"
            title="Go to Feed"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-500/10">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">Global Campus Room</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium">Public Campus Conversation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Feed */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/40 dark:bg-[#080b14]/50"
        style={{ scrollBehavior: 'auto' }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <div className="w-8 h-8 border-2 border-slate-350 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Connecting to global campus channel...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#0c1018] border border-slate-200/50 dark:border-slate-800/80 flex items-center justify-center shadow-xs">
              <Globe className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">Global Campus Chat</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start the conversation! Type a message below to broadcast to all campus students.</p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.senderId === user?.id;
            const parentMsg = msg.parentId ? messages.find(m => m.id === msg.parentId) : null;
            
            // Format nice grouped bubbles
            const showSenderHeader = !isMine && (i === 0 || messages[i - 1]?.senderId !== msg.senderId);
            const isThisSwiping = swipingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                onClick={(e) => {
                  if (longPressedRef.current) {
                    longPressedRef.current = false;
                    e.stopPropagation();
                    return;
                  }
                  if (selectedMessageIds.length > 0) {
                    e.stopPropagation();
                    toggleMessageSelection(msg.id);
                    if (contextMenuMessage) setContextMenuMessage(null);
                  } else if (contextMenuMessage) {
                    e.stopPropagation();
                    setSelectedMessageIds([contextMenuMessage.id, msg.id]);
                    setContextMenuMessage(null);
                  }
                }}
                className={`flex items-center animate-fade-in group relative select-none px-2 sm:px-4 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                  selectedMessageIds.includes(msg.id)
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/10'
                    : 'hover:bg-slate-50/20 dark:hover:bg-white/[0.005]'
                }`}
                style={{ animationDuration: '0.2s' }}
                onContextMenu={(e) => handleContextMenu(e, msg)}
                onTouchStart={(e) => {
                  onTouchStart(e, msg.id);
                  const element = e.target;
                  handlePressStart(msg, element);
                }}
                onTouchMove={(e) => {
                  onTouchMove(e);
                  handleTouchMoveHold();
                }}
                onTouchEnd={() => {
                  onTouchEnd(msg);
                  handlePressEnd();
                }}
                onMouseDown={(e) => {
                  const element = e.target;
                  handlePressStart(msg, element);
                }}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
              >
                {/* Checkbox for Multi-Select */}
                {selectedMessageIds.length > 0 && (
                  <div className="shrink-0 mr-3 flex items-center justify-center select-none cursor-pointer">
                    <div className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all duration-200 ${
                      selectedMessageIds.includes(msg.id)
                        ? 'bg-indigo-500 border-indigo-500 text-white scale-110 shadow-xs'
                        : 'border-slate-350 dark:border-slate-655 bg-transparent'
                    }`}>
                      {selectedMessageIds.includes(msg.id) && (
                        <Check className="w-2.5 h-2.5 stroke-[3] text-white" />
                      )}
                    </div>
                  </div>
                )}

                <div className={`flex-1 flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {/* Swipe Reply Icon Indicator */}
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
                    className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[70%] transition-transform duration-200 ${isMine ? 'flex-row-reverse' : ''}`}
                    style={{
                      transform: isThisSwiping ? `translateX(${swipeOffset}px)` : 'none',
                    }}
                  >
                    {/* Sender Avatar */}
                    {!isMine && (
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 shadow-xs mt-1">
                        {msg.sender?.avatar ? (
                          <img src={msg.sender.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                            {msg.sender?.name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                      {/* Sender details */}
                      {showSenderHeader && (
                        <div className="flex items-center gap-1.5 px-0.5">
                          <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                            {msg.sender?.name}
                          </span>
                          <span className="text-[9px] bg-slate-100 dark:bg-white/[0.04] text-slate-400 px-1.5 py-0.5 rounded-md font-bold truncate max-w-[120px]">
                            {msg.sender?.college || 'StuGrow'}
                          </span>
                        </div>
                      )}

                      {/* Quoted Parent Reply Message */}
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
                              toggleMessageSelection(msg.id);
                              if (contextMenuMessage) setContextMenuMessage(null);
                            } else {
                              handleScrollToMessage(msg.parentId);
                            }
                          }}
                          className={`text-[11px] p-2 bg-slate-100/50 dark:bg-white/[0.02] border-l-2 border-slate-400 dark:border-slate-600 rounded-r-xl max-w-full truncate text-left active:scale-[0.98] transition-all hover:bg-slate-200/55 dark:hover:bg-white/[0.04] cursor-pointer block w-full ${isMine ? 'text-right rounded-l-xl rounded-r-none border-l-0 border-r-2' : ''}`}
                        >
                          <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                            {parentMsg.sender?.name === user?.name ? 'Replying to yourself' : `Replying to ${parentMsg.sender?.name}`}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 block truncate">
                            {parentMsg.content || 'Attachment File'}
                          </span>
                        </button>
                      )}

                      {/* Main Bubble Content */}
                      <div
                        onDoubleClick={(e) => {
                          if (msg.content === '🚫 This message was deleted') return;
                          e.stopPropagation();
                          handleMessageReact(msg, '❤️');
                        }}
                        className={`message-bubble relative rounded-2xl transition-all duration-355 ${highlightedMessageId === msg.id ? 'highlight-msg-active' : ''} ${selectedMessageIds.includes(msg.id) ? 'scale-[1.01]' : ''}`}
                      >
                        {msg.file && msg.fileType?.startsWith('image/') ? (
                          <div className="rounded-2xl overflow-hidden shadow-xs border border-slate-200/50 dark:border-slate-800/80">
                            <img 
                              src={msg.file} 
                              alt="Shared Image" 
                              className="max-w-full max-h-48 sm:max-h-60 rounded-2xl cursor-pointer hover:opacity-95 transition-opacity" 
                              onClick={(e) => {
                                  if (longPressedRef.current) {
                                    longPressedRef.current = false;
                                    e.stopPropagation();
                                    return;
                                  }
                                  if (selectedMessageIds.length > 0) {
                                    e.stopPropagation();
                                    toggleMessageSelection(msg.id);
                                    if (contextMenuMessage) setContextMenuMessage(null);
                                  } else {
                                    setActiveImageView(msg.file);
                                  }
                              }}
                              onLoad={() => {
                                if (chatContainerRef.current) {
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
                        ) : msg.file ? (
                          <a
                            href={selectedMessageIds.length > 0 ? '#' : msg.file}
                            download={msg.fileName}
                            onClick={(e) => {
                              if (longPressedRef.current) {
                                longPressedRef.current = false;
                                e.preventDefault();
                                return;
                              }
                              if (selectedMessageIds.length > 0) {
                                e.preventDefault();
                                toggleMessageSelection(msg.id);
                                  if (contextMenuMessage) setContextMenuMessage(null);
                              }
                            }}
                            className={`px-3 py-2 rounded-2xl shadow-xs border inline-flex items-center gap-2 ${
                              isMine
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                                : 'bg-white dark:bg-[#0c1018] text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-800/60'
                            }`}
                          >
                            <Paperclip className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[12px] font-bold truncate max-w-[120px] sm:max-w-[180px]">{msg.fileName}</span>
                          </a>
                        ) : (
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl shadow-xs border text-[13px] leading-relaxed break-words font-medium select-text ${
                              isMine
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white rounded-tr-xs'
                                : 'bg-white dark:bg-[#0c1018] text-slate-900 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/60 rounded-tl-xs'
                            } ${msg.content === '🚫 This message was deleted' ? 'text-slate-400 dark:text-slate-500 italic font-semibold border-slate-100 dark:border-slate-850/50 bg-slate-50 dark:bg-white/[0.01]' : ''}`}
                          >
                            <p>{msg.content}</p>
                          </div>
                        )}

                        {/* Reply Option Trigger on Hover */}
                        {selectedMessageIds.length === 0 && (
                          <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 z-10 ${isMine ? '-left-10' : '-right-10'}`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyingTo(msg);
                              }}
                              className="w-7 h-7 rounded-lg bg-white dark:bg-[#0c1018] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-xs active:scale-90 transition-all"
                              title="Reply to message"
                            >
                              <CornerUpLeft className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Subtle Red Heart reaction */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`absolute bottom-1 bg-white dark:bg-[#161d2b] border border-slate-200 dark:border-slate-800 rounded-full p-1 shadow-xs z-25 flex items-center justify-center animate-scale-in ${isMine ? '-left-2' : '-right-2'}`}>
                            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>

                      {/* Timestamp & Star */}
                      <div className={`flex items-center gap-1 mt-0.5 justify-start ${isMine ? 'justify-end' : ''}`}>
                        {isStarred(msg.id) && (
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0 animate-scale-in" />
                        )}
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                          {formatTimeAgo(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input / Reply / Edit Editor Wrapper OR Multi-Select Toolbar */}
      {selectedMessageIds.length > 0 ? (
        <div id="select-actions-toolbar" className="shrink-0 px-3 py-3 border-t border-slate-200/60 dark:border-white/[0.04] bg-white dark:bg-[#080b14] flex items-center justify-between animate-slide-up">
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
              <Copy className="w-3.5 h-3.5 text-slate-455" />
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
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/[0.03] text-xs font-bold text-slate-700 dark:text-slate-355 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 px-3 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-slate-200/60 dark:border-white/[0.04] bg-white dark:bg-[#080b14]">
          {/* Reply Indicator banner */}
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-slate-850/50 rounded-xl mb-2 text-xs animate-slide-up">
              <div className="flex items-center gap-1.5 min-w-0">
                <CornerUpLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-slate-400 font-semibold truncate">
                  Replying to <strong className="text-slate-700 dark:text-slate-350">{replyingTo.sender?.name}</strong>: "{replyingTo.content || 'Attachment File'}"
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

          {/* Editing Indicator banner */}
          {editingMessage && (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-slate-850/50 rounded-xl mb-2 text-xs animate-slide-up">
              <div className="flex items-center gap-1.5 min-w-0">
                <Edit3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-slate-400 font-semibold truncate">
                  Editing message: <strong className="text-slate-700 dark:text-slate-350">"{editingMessage.content}"</strong>
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
            {/* File Picker Actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={openFilePicker}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-90 transition-all"
                title="Attach File"
              >
                <Paperclip className="w-[17px] h-[17px] text-slate-500" strokeWidth={2} />
              </button>
              <button
                onClick={openImagePicker}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-90 transition-all"
                title="Send Image"
              >
                <ImageIcon className="w-[17px] h-[17px] text-slate-500" strokeWidth={2} />
              </button>
            </div>

            {/* Text Input area */}
            <div className="flex-1 relative min-w-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={editingMessage ? "Save edit..." : "Post a campus message..."}
                className="w-full pl-3.5 sm:pl-4 pr-11 sm:pr-12 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-slate-800/80 text-[13px] sm:text-[14px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-white/10 focus:border-slate-350 dark:focus:border-slate-700 transition-all duration-200"
              />
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-90 transition-all"
              >
                <Smile className="w-[17px] h-[17px] text-slate-400" strokeWidth={2} />
              </button>
              {showEmoji && <EmojiPicker onSelect={(e) => setNewMessage(prev => prev + e)} onClose={() => setShowEmoji(false)} />}
            </div>

            {/* Send Trigger */}
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

      {/* Glassmorphic Option Context Menu */}
      {contextMenuMessage && menuPosition && (
        <>
          <div
            className="fixed inset-0 z-45 bg-slate-950/[0.01] dark:bg-black/[0.02]"
            onClick={(e) => {
              e.stopPropagation();
              setContextMenuMessage(null);
              setSelectedMessageIds([]);
            }}
          />
          <div
            id="context-menu-container"
            style={getMenuStyles()}
            className="fixed z-50 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0c1018]/95 shadow-xl p-1.5 space-y-0.5 animate-scale-in animate-duration-150"
          >
            {/* Reaction Bar */}
            <div className="flex items-center justify-between gap-1 pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-900/50 px-1 pt-0.5">
              {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(emoji => {
                const userReaction = contextMenuMessage.reactions?.find(r => r.userId === user?.id)?.reaction;
                const isSelected = userReaction === emoji;
                return (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMessageReact(contextMenuMessage, emoji);
                      setContextMenuMessage(null);
                    }}
                    className={`w-8 h-8 flex items-center justify-center text-base rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.08] active:scale-90 transition-all duration-200 ${
                      isSelected ? 'bg-indigo-50/80 dark:bg-indigo-950/40 ring-1.5 ring-indigo-500 scale-110' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setReplyingTo(contextMenuMessage);
                setContextMenuMessage(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all duration-150 active:scale-98 text-left"
            >
              <CornerUpLeft className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              Reply
            </button>

            <button
              onClick={handleCopyMessage}
              disabled={contextMenuMessage.content === '🚫 This message was deleted'}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all duration-150 active:scale-98 text-left disabled:opacity-40"
            >
              <Copy className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              Copy Text
            </button>

            <button
              onClick={() => setContextMenuMessage(null)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all duration-150 active:scale-98 text-left"
            >
              <Check className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              Select Multiple
            </button>

            <button
              onClick={handleStarToggle}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all duration-150 active:scale-98 text-left"
            >
              <Star className={`w-4 h-4 ${isStarred(contextMenuMessage.id) ? 'text-amber-500 fill-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
              {isStarred(contextMenuMessage.id) ? 'Unstar Message' : 'Star Message'}
            </button>

            {contextMenuMessage.senderId === user?.id && contextMenuMessage.content !== '🚫 This message was deleted' && (
              <>
                <button
                  onClick={() => {
                    setEditingMessage(contextMenuMessage);
                    setNewMessage(contextMenuMessage.content);
                    setContextMenuMessage(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all duration-150 active:scale-98 text-left"
                >
                  <Edit3 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  Edit Message
                </button>

                <button
                  onClick={handleDeleteEveryone}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-150 active:scale-98 text-left"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  Delete for Everyone
                </button>
              </>
            )}

            <button
              onClick={handleDeleteMe}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-150 active:scale-98 text-left"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              Delete for Me
            </button>

            {contextMenuMessage.senderId !== user?.id && (
              <button
                onClick={handleReportMessage}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all duration-150 active:scale-98 text-left"
              >
                <ShieldAlert className="w-4 h-4 text-amber-550" />
                Report Message
              </button>
            )}
          </div>
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
    </div>
  );
}
