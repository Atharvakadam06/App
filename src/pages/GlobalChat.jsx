import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Paperclip, Image as ImageIcon, Smile, ArrowLeft, X, Globe, CornerUpLeft, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLayout } from '../context/LayoutContext';
import { uploadToCloudinary } from '../services/cloudinary';
import { getGlobalMessages, sendGlobalMessage } from '../services/data';
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
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

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

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (firstTime = false) => {
    if (firstTime) setLoading(true);
    try {
      const list = await getGlobalMessages();
      setMessages(list);
    } catch (e) {
      console.warn('Failed to load global messages:', e);
    } finally {
      if (firstTime) setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !replyingTo) return;
    const content = newMessage.trim();
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

  return (
    <div className="flex flex-col h-full bg-[#fcfbf9] dark:bg-[#080b14] messages-fullscreen select-none">
      {/* Header (Back option for Mobile) */}
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

            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in group relative`}
              >
                <div className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[70%] ${isMine ? 'flex-row-reverse' : ''}`}>
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

                  <div className="flex flex-col space-y-1">
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
                      <div className={`text-[11px] p-2 bg-slate-100/50 dark:bg-white/[0.02] border-l-2 border-slate-400 dark:border-slate-600 rounded-r-xl max-w-full truncate ${isMine ? 'text-right rounded-l-xl rounded-r-none border-l-0 border-r-2' : ''}`}>
                        <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                          {parentMsg.sender?.name === user?.name ? 'Replying to yourself' : `Replying to ${parentMsg.sender?.name}`}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 block truncate">
                          {parentMsg.content || 'Attachment File'}
                        </span>
                      </div>
                    )}

                    {/* Main Bubble Content */}
                    <div className="relative">
                      {msg.file && msg.fileType?.startsWith('image/') ? (
                        <div className="rounded-2xl overflow-hidden shadow-xs border border-slate-200/50 dark:border-slate-800/80">
                          <img src={msg.file} alt="Shared Image" className="max-w-full max-h-48 sm:max-h-60 rounded-2xl" loading="lazy" />
                        </div>
                      ) : msg.file ? (
                        <a
                          href={msg.file}
                          download={msg.fileName}
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
                          className={`px-3.5 py-2.5 rounded-2xl shadow-xs border text-[13px] leading-relaxed break-words font-medium ${
                            isMine
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white rounded-tr-xs'
                              : 'bg-white dark:bg-[#0c1018] text-slate-900 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/60 rounded-tl-xs'
                          }`}
                        >
                          <p>{msg.content}</p>
                        </div>
                      )}

                      {/* Reply Option Trigger on Hover */}
                      <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 z-10 ${isMine ? '-left-10' : '-right-10'}`}>
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-[#0c1018] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-xs active:scale-90 transition-all"
                          title="Reply to message"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span className={`text-[9px] text-slate-400 dark:text-slate-500 px-1 font-semibold ${isMine ? 'text-right' : ''}`}>
                      {formatTimeAgo(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input / Reply Editor Wrapper */}
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
              placeholder="Post a campus message..."
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
    </div>
  );
}
