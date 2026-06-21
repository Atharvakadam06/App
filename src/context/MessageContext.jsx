import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getConversations } from '../services/data';

const MessageContext = createContext();

export function MessageProvider({ children }) {
  const { user } = useAuth();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadMessageCount(0);
      return;
    }
    try {
      const convs = await getConversations(user.id);
      const total = convs.reduce((sum, c) => sum + (c.unread || 0), 0);
      setUnreadMessageCount(total);
    } catch (e) {
      // silently fail - badge will just show 0
    }
  }, [user?.id]);

  // Initial load + poll every 15 seconds for new messages
  useEffect(() => {
    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchUnreadCount]);

  // Expose a manual refresh so Messages page can trigger it after opening a chat
  const refreshUnread = fetchUnreadCount;

  return (
    <MessageContext.Provider value={{ unreadMessageCount, refreshUnread }}>
      {children}
    </MessageContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessageContext);
}
