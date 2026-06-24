import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getConversations } from '../services/data';

const MessageContext = createContext();

export function MessageProvider({ children }) {
  const { user } = useAuth();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const intervalRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadMessageCount(0);
      return;
    }
    try {
      const convs = await getConversations(user.id);
      // Filter out the active conversation from counting unread badge
      const total = convs.filter(c => c.id !== activeConversationId && (c.unread || 0) > 0).length;
      setUnreadMessageCount(total);
    } catch (e) {
      // silently fail - badge will just show 0
    }
  }, [user?.id, activeConversationId]);

  // Initial load + poll every 15 seconds for new messages
  useEffect(() => {
    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchUnreadCount]);

  const openConversation = useCallback((id, hadUnread) => {
    setActiveConversationId(id);
    if (hadUnread) {
      setUnreadMessageCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const closeConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  return (
    <MessageContext.Provider value={{ unreadMessageCount, refreshUnread: fetchUnreadCount, openConversation, closeConversation }}>
      {children}
    </MessageContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessageContext);
}
