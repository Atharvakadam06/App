import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Paperclip, Image as ImageIcon, Smile, ArrowLeft, Inbox, X, Plus, Phone, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { uploadToCloudinary } from '../services/cloudinary';
import { getConversations, getMessages, sendMessage, createConversation } from '../services/data';
import { formatTimeAgo } from '../utils/timeUtils';
import ProfessionalSearch from '../components/ProfessionalSearch';

function EmojiPicker({ onSelect, onClose }) {
  const emojis = ['😀','😂','❤️','👍','👋','🎉','🔥','💯','😊','🤔','👏','🙏','💪','✨','🚀','📚','🎓','💡','⭐','🌟','😍','🥳','😎','🤝'];
  return (
    <div className="absolute bottom-20 left-2 right-2 sm:left-auto sm:right-0 sm:bottom-auto sm:top-full sm:mb-2 sm:w-72 bg-white dark:bg-[#0c1018] border border-gray-200/80 dark:border-gray-700/60 p-2.5 z-50 shadow-2xl dark:shadow-black/50 rounded-2xl animate-scale-in">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Emojis</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/70"><X className="w-3.5 h-3.5 text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {emojis.map(e => <button key={e} onClick={() => { onSelect(e); onClose(); }} className="h-9 flex items-center justify-center text-[18px] hover:bg-gray-100 dark:hover:bg-gray-800/70 rounded-lg active:scale-90 transition-all">{e}</button>)}
      </div>
    </div>
  );
}

function ConversationList({ conversations, selectedId, onSelect, searchQuery, setSearchQuery, onNewChat }) {
  const filtered = conversations.filter(c => c.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  return (
    <div className="flex flex-col h-full flex-shrink-0 bg-white dark:bg-[#0a0d14] sm:border-r border-gray-200/70 dark:border-gray-700/50 w-full sm:w-80">
      <div className="p-4 sm:p-5 border-b border-gray-200/70 dark:border-gray-700/50 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">Messages</h2>
          <button onClick={onNewChat} className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center active:scale-90 transition-all shadow-sm">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        <ProfessionalSearch placeholder="Search..." value={searchQuery} onChange={setSearchQuery} className="bg-gray-50 dark:bg-[#0f131f] border-gray-200/70 dark:border-gray-700/50 rounded-xl text-[13px]" />
      </div>
      <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling: touch">
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
              className="w-full flex items-center gap-3 p-3 sm:p-4 transition-all border-b border-gray-100/60 dark:border-gray-800/40 last:border-0"
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

function ChatView({ conversation, user, chatMessages, messagesEndRef, onBack, onSend, onImagePicker, onFilePicker, onEmojiToggle, showEmoji, newMessage, setNewMessage, handleKeyPress }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#080b14]">
      {/* Fixed Chat Header */}
      <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 h-14 sm:h-[60px] border-b border-gray-200/70 dark:border-gray-700/50 bg-white dark:bg-[#0a0d14] shrink-0">
        <button onClick={onBack} className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-500" strokeWidth={2} />
        </button>
        <div className="relative shrink-0">
          <img src={conversation.user?.avatar} alt={conversation.user?.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800 shadow-sm" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#0a0d14]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] sm:text-[14px] font-semibold text-gray-900 dark:text-white truncate leading-tight">{conversation.user?.name}</h3>
          <p className="text-[10px] sm:text-[11px] text-emerald-500 font-medium mt-0.5">Online</p>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 active:scale-90 transition-all">
            <Phone className="w-[18px] h-[18px] text-gray-500" strokeWidth={2} />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 active:scale-90 transition-all">
            <Video className="w-[18px] h-[18px] text-gray-500" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Scrollable Messages Only */}
      <div className="flex-1 h-full overflow-y-auto -webkit-overflow-scrolling: touch px-3 sm:px-4 py-3 space-y-1.5 bg-gray-50/40 dark:bg-[#080b14]">
        {chatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#0c1018] border border-gray-200/60 dark:border-gray-700/40 flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Send className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Say hello! 👋</p>
            </div>
          </div>
        ) : (
          chatMessages.map((message, i) => {
            const isMine = message.senderId === user?.id;
            const showAvatar = !isMine && (i === 0 || chatMessages[i - 1]?.senderId !== message.senderId);
            return (
              <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in`} style={{ animationDuration: '0.2s' }}>
                <div className={`flex items-end gap-1.5 max-w-[80%] sm:max-w-[65%] ${isMine ? 'flex-row-reverse' : ''}`}>
                  {!isMine && (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full overflow-hidden">
                      {showAvatar ? <img src={conversation.user?.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                    </div>
                  )}
                  <div>
                    {message.file && message.fileType?.startsWith('image/') ? (
                      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200/60 dark:border-gray-700/40">
                        <img src={message.file} alt="Shared" className="max-w-full max-h-48 sm:max-h-56 rounded-2xl" loading="lazy" />
                      </div>
                    ) : message.file ? (
                      <a href={message.file} download={message.fileName} className={`px-3 py-2.5 rounded-2xl shadow-sm border inline-flex items-center gap-2 ${isMine ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white' : 'bg-white dark:bg-[#0c1018] text-gray-900 dark:text-white border-gray-200/80 dark:border-gray-700/60'}`}>
                        <Paperclip className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[12px] font-medium truncate max-w-[120px] sm:max-w-[160px]">{message.fileName}</span>
                      </a>
                    ) : (
                      <div className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl shadow-sm border ${isMine ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white rounded-br-sm' : 'bg-white dark:bg-[#0c1018] text-gray-900 dark:text-white border-gray-200/80 dark:border-gray-700/60 rounded-bl-sm'}`}>
                        <p className="text-[13px] leading-relaxed break-words">{message.content}</p>
                      </div>
                    )}
                    <p className={`text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium ${isMine ? 'text-right' : ''}`}>{formatTimeAgo(message.timestamp)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input Bar */}
      <div className="shrink-0 px-2.5 sm:px-3 pt-2 pb-2.5 sm:pb-3 border-t border-gray-200/70 dark:border-gray-700/50 bg-white dark:bg-[#0a0d14]">
        <div className="flex items-end gap-1.5 sm:gap-2">
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={onFilePicker} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 active:scale-90 transition-all">
              <Paperclip className="w-[17px] h-[17px] text-gray-500" strokeWidth={1.8} />
            </button>
            <button onClick={onImagePicker} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 active:scale-90 transition-all">
              <ImageIcon className="w-[17px] h-[17px] text-gray-500" strokeWidth={1.8} />
            </button>
          </div>
          <div className="flex-1 relative min-w-0">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Message..."
              className="w-full pl-3.5 sm:pl-4 pr-11 sm:pr-12 py-2.5 sm:py-3 rounded-[18px] sm:rounded-2xl bg-gray-50 dark:bg-[#0f131f] border border-gray-200/70 dark:border-gray-700/50 text-[13px] sm:text-[14px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/5 dark:focus:ring-white/10 focus:border-gray-300 dark:focus:border-gray-600 transition-all duration-200"
            />
            <button onClick={onEmojiToggle} className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/60 active:scale-90 transition-all">
              <Smile className="w-[17px] h-[17px] text-gray-400" strokeWidth={1.8} />
            </button>
            {showEmoji && <EmojiPicker onSelect={(e) => setNewMessage(p => p + e)} onClose={() => {}} />}
          </div>
          <button
            onClick={onSend}
            disabled={!newMessage.trim()}
            className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-[18px] sm:rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 active:scale-90 transition-all duration-150 shadow-sm disabled:opacity-40"
          >
            <Send className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const { user, users, refreshUsers } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpenChat, setMobileOpenChat] = useState(false);
  const messagesEndRef = useRef(null);

  const conversation = conversations.find(c => c.id === selectedConversation);

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

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversation) return;
      try { const msgs = await getMessages(selectedConversation); setChatMessages(msgs); } catch (e) { console.warn('Failed to load messages:', e); }
    };
    loadMessages();
  }, [selectedConversation]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage(selectedConversation, user.id, newMessage);
      const msgs = await getMessages(selectedConversation);
      setChatMessages(msgs);
      if (conversation?.user) addNotification({ userId: user.id, type: 'message', message: `You sent a message to ${conversation.user.name}` });
    } catch (e) { console.error('Failed to send message:', e); }
    setNewMessage('');
    setShowEmoji(false);
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
    e.target.value = '';
  };

  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'msgfile-' + Math.random().toString(36).substr(2, 9);
    input.style.cssText = 'display:block;position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
    input.addEventListener('change', function(e) { setTimeout(() => input.remove(), 100); handleFileAttach(e); });
    document.body.appendChild(input);
    input.click();
  };

  const openImagePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'msgimage-' + Math.random().toString(36).substr(2, 9);
    input.accept = 'image/*';
    input.style.cssText = 'display:block;position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
    input.addEventListener('change', function(e) { setTimeout(() => input.remove(), 100); handleFileAttach(e); });
    document.body.appendChild(input);
    input.click();
  };

  const handleFileUpload = async (file) => {
    const isImage = file.type.startsWith('image/');
    try {
      addToast('Uploading file...', 'info');
      const fileUrl = await uploadToCloudinary(file, 'stugrow/messages');
      await sendMessage(selectedConversation, user.id, isImage ? '' : `File: ${file.name}`, fileUrl, file.name, file.type);
      const msgs = await getMessages(selectedConversation);
      setChatMessages(msgs);
      addToast('File sent!', 'success');
    } catch { addToast('Failed to upload file.', 'error'); }
  };

  const handleStartChat = async (targetUser) => {
    await startChat(targetUser);
    setShowNewChat(false);
  };

  if (loading) {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-white dark:bg-[#080b14]">
        <div className="p-4 sm:p-5 border-b border-gray-200/70 dark:border-gray-700/50 shrink-0">
          <div className="h-5 bg-gray-100 dark:bg-gray-800/60 rounded-lg w-24 mb-3" />
          <div className="h-10 bg-gray-100 dark:bg-gray-800/60 rounded-2xl w-full" />
        </div>
        <div className="flex-1 overflow-hidden p-4 space-y-3">
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
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-white dark:bg-[#080b14] overscroll-none" onWheel={e => e.preventDefault()}>
      {showNewChat && <NewChatModal users={users} currentUser={user} onClose={() => setShowNewChat(false)} onStart={handleStartChat} />}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* List Panel */}
        <div className={`${mobileOpenChat ? 'hidden' : 'flex'} sm:flex w-full sm:w-80 flex-col shrink-0`}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation}
            onSelect={(id) => { setSelectedConversation(id); setMobileOpenChat(true); }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNewChat={() => setShowNewChat(true)}
          />
        </div>

        {/* Chat Panel */}
        <div className={`${mobileOpenChat ? 'flex' : 'hidden'} sm:flex flex-1 flex-col h-full w-full min-w-0`}>
          {conversation ? (
            <ChatView
              conversation={conversation}
              user={user}
              chatMessages={chatMessages}
              messagesEndRef={messagesEndRef}
              onBack={() => { setMobileOpenChat(false); setShowEmoji(false); }}
              onSend={handleSend}
              onImagePicker={openImagePicker}
              onFilePicker={openFilePicker}
              onEmojiToggle={() => setShowEmoji(!showEmoji)}
              showEmoji={showEmoji}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleKeyPress={handleKeyPress}
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
