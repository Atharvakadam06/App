import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Paperclip, Image as ImageIcon, Smile, Phone, Video, Info, ArrowLeft, Inbox, X, Plus } from 'lucide-react';
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
    <div className="absolute bottom-12 right-0 card p-3 z-30 shadow-xl animate-scale-in w-64 max-w-[calc(100vw-3rem)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Emojis</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322]"><X className="w-3.5 h-3.5 text-slate-400" /></button>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
        {emojis.map(e => <button key={e} onClick={() => { onSelect(e); onClose(); }} className="p-1.5 text-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] rounded transition-colors">{e}</button>)}
      </div>
    </div>
  );
}

function ConversationList({ conversations, selectedId, onSelect, searchQuery, setSearchQuery, onNewChat }) {
  const filtered = conversations.filter(c => c.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  return (
    <div className="w-full sm:w-80 flex flex-col h-full flex-shrink-0" style={{borderRight: '1px solid #e8e5e0'}}>
      <div className="p-4" style={{borderBottom: '1px solid #e8e5e0'}}>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Messages</h2>
        </div>
        <ProfessionalSearch
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6"><div className="text-center"><Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" /><p className="text-sm text-slate-500 dark:text-slate-400">No conversations yet</p></div></div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filtered.map(conv => (
            <button key={conv.id} onClick={() => onSelect(conv.id)} className={`w-full flex items-center gap-3 p-4 hover:bg-[#f5f3ef] dark:hover:bg-[#0e1322]/50 transition-colors ${selectedId === conv.id ? 'bg-[#f5f3ef] dark:bg-[#0e1322]/50' : ''}`}>
              <div className="relative"><img src={conv.user?.avatar} alt={conv.user?.name} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm" /><div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div></div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold text-slate-900 dark:text-white truncate text-sm">{conv.user?.name}</span><span className="text-[10px] text-slate-400 font-medium">{formatTimeAgo(conv.timestamp)}</span></div>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{conv.lastMessage || 'Start a conversation'}</p>
              </div>
              {conv.unread > 0 && <span className="min-w-[20px] h-5 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-[10px] flex items-center justify-center font-semibold px-1.5">{conv.unread}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewChatModal({ users, currentUser, onClose, onStart }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u => u.id !== currentUser?.id && u.name?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full max-h-[70vh] flex flex-col animate-scale-in shadow-2xl">
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-slate-900 dark:text-white">New Conversation</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322]"><X className="w-5 h-5 text-slate-500" /></button></div>
        <div className="mb-4">
          <ProfessionalSearch
            placeholder="Search students..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No students found</p> : filtered.map(u => (
            <button key={u.id} onClick={() => onStart(u)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors">
              <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
              <div className="text-left"><p className="text-sm font-semibold text-slate-900 dark:text-white">{u.name}</p><p className="text-xs text-slate-400">@{u.username}</p></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex-1 flex items-center justify-center"><div className="text-center animate-slide-up"><div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center mx-auto mb-4 animate-float"><Send className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" /></div><h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No messages yet</h3><p className="text-sm text-slate-400 dark:text-slate-500">Connect with students to start chatting</p></div></div>
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
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const startChat = async (targetUser) => {
    try {
      const convId = await createConversation(user.id, targetUser.id);
      const convs = await getConversations(user.id);
      setConversations(convs);
      setSelectedConversation(convId);
    } catch (e) { console.error('Failed to start chat:', e); }
  };

  useEffect(() => {
    if (location.state?.targetUser && !selectedConversation) {
      const foundConv = conversations.find(c => c.user?.id === location.state.targetUser.id);
      if (foundConv) {
        setSelectedConversation(foundConv.id);
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
      if (conversation?.user) {
        addNotification({ userId: user.id, type: 'message', message: `You sent a message to ${conversation.user.name}` });
      }
    } catch (e) { console.error('Failed to send message:', e); }
    setNewMessage('');
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    try {
      addToast('Uploading file...', 'info');
      const fileUrl = await uploadToCloudinary(file, 'stugrow/messages');
      await sendMessage(selectedConversation, user.id, isImage ? '' : `File: ${file.name}`, fileUrl, file.name, file.type);
      const msgs = await getMessages(selectedConversation);
      setChatMessages(msgs);
      addToast('File sent!', 'success');
    } catch { addToast('Failed to upload file. Check Cloudinary config.', 'error'); }
    e.target.value = '';
  };

  const handleStartChat = async (targetUser) => {
    await startChat(targetUser);
    setShowNewChat(false);
  };

  if (loading) return <div className="p-4 sm:p-8"><div className="card p-6 animate-pulse"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" /></div></div>;

  return (
    <div className="h-[calc(100vh-49px)] sm:h-[calc(100vh-65px)] flex flex-col overflow-x-hidden">
      {showNewChat && <NewChatModal users={users} currentUser={user} onClose={() => setShowNewChat(false)} onStart={handleStartChat} />}
      <div className="flex-1 flex overflow-hidden">
        <div className={`${selectedConversation ? 'hidden sm:flex' : 'flex'} w-full sm:w-auto`}>
          <ConversationList conversations={conversations} selectedId={selectedConversation} onSelect={(id) => setSelectedConversation(id)} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onNewChat={() => setShowNewChat(true)} />
        </div>
        <div className={`${selectedConversation ? 'flex' : 'hidden sm:flex'} flex-1 flex-col h-full w-full`}>
          {conversation ? (
            <>
              <div className="flex items-center justify-between p-3 sm:p-4" style={{borderBottom: '1px solid #e8e5e0'}}>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedConversation(null)} className="sm:hidden p-1 -ml-1 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
                  <img src={conversation.user?.avatar} alt={conversation.user?.name} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm" />
                  <div><h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">{conversation.user?.name}</h3><p className="text-xs text-emerald-500 font-medium">Online</p></div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button onClick={() => addToast('Voice calls coming soon!', 'info')} className="p-2 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors"><Phone className="w-5 h-5 text-slate-500" /></button>
                  <button onClick={() => addToast('Video calls coming soon!', 'info')} className="p-2 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors hidden sm:block"><Video className="w-5 h-5 text-slate-500" /></button>
                  <button className="p-2 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors hidden sm:block"><Info className="w-5 h-5 text-slate-500" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full"><p className="text-sm text-slate-400">Start the conversation!</p></div>
                ) : (
                  chatMessages.map(message => {
                    const isMine = message.senderId === user?.id;
                    return (
                      <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] sm:max-w-[70%] ${isMine ? 'order-2' : 'order-1'}`}>
                          {!isMine && <img src={conversation.user?.avatar} alt="" className="w-8 h-8 rounded-full mb-1 border border-slate-200 dark:border-slate-700" />}
                          {message.file && message.fileType?.startsWith('image/') ? (
                            <div className="rounded-2xl overflow-hidden"><img src={message.file} alt="Shared" className="max-w-full max-h-48 rounded-2xl" /></div>
                          ) : message.file ? (
                            <a href={message.file} download={message.fileName} className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl block ${isMine ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-br-md' : 'bg-[#f3f1ed] dark:bg-[#0e1322] text-slate-900 dark:text-white rounded-bl-md'}`}>📎 {message.fileName}</a>
                          ) : (
                            <div className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl ${isMine ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-br-md' : 'bg-[#f3f1ed] dark:bg-[#0e1322] text-slate-900 dark:text-white rounded-bl-md'}`}><p className="text-sm">{message.content}</p></div>
                          )}
                          <p className={`text-[10px] text-slate-400 mt-1 font-medium ${isMine ? 'text-right' : ''}`}>{formatTimeAgo(message.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 sm:p-4" style={{borderTop: '1px solid #e8e5e0'}}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors hidden sm:block"><Paperclip className="w-5 h-5 text-slate-500" /></button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors hidden sm:block"><ImageIcon className="w-5 h-5 text-slate-500" /></button>
                  <div className="flex-1 relative">
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyPress} placeholder="Type a message..." className="input-field pr-10" />
                    <div className="relative"><button onClick={() => setShowEmoji(!showEmoji)} className="absolute right-3 top-1/2 -translate-y-1/2 p-0"><Smile className="w-5 h-5 text-slate-400" /></button>{showEmoji && <EmojiPicker onSelect={(e) => setNewMessage(prev => prev + e)} onClose={() => setShowEmoji(false)} />}</div>
                  </div>
                  <button onClick={handleSend} disabled={!newMessage.trim()} className="p-2.5 sm:p-3 rounded-xl bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-300 transition-all duration-200 disabled:opacity-50"><Send className="w-5 h-5" /></button>
                </div>
              </div>
            </>
          ) : <EmptyChat />}
        </div>
      </div>
    </div>
  );
}