import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { addNotification as addNotifToDb, getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications } from '../services/data';
import { getCurrentTimestamp } from '../utils/timeUtils';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user?.id && !loaded) {
      getNotifications(user.id)
        .then(notifs => { setNotifications(notifs); setLoaded(true); })
        .catch(e => console.warn('Failed to load notifications:', e));
    }
    if (!user) {
      return () => {
        setNotifications([]);
        setLoaded(false);
      };
    }
  }, [user?.id, loaded, user]);

  const addNotification = useCallback(async (notification) => {
    if (!user?.id) return;
    try {
      const id = await addNotifToDb(user.id, notification.type, notification.message);
      const newNotif = {
        id,
        userId: user.id,
        type: notification.type,
        message: notification.message,
        read: false,
        timestamp: getCurrentTimestamp(),
      };
      setNotifications(prev => [newNotif, ...prev]);
      return newNotif;
    } catch (e) {
      console.warn('Failed to add notification:', e);
    }
  }, [user]);

  const markAsRead = useCallback(async (notifId) => {
    try {
      await markNotificationRead(notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch (e) {
      console.warn('Failed to mark notification read:', e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.warn('Failed to mark all notifications read:', e);
    }
  }, [user]);

  const deleteNotif = useCallback(async (notifId) => {
    try {
      await deleteNotification(notifId);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (e) {
      console.warn('Failed to delete notification:', e);
    }
  }, []);

  const clearAll = useCallback(async () => {
    if (!user?.id) return;
    try {
      await clearAllNotifications(user.id);
      setNotifications([]);
    } catch (e) {
      console.warn('Failed to clear notifications:', e);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification: deleteNotif,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);