import { useState } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, FileText, BookOpen, Lightbulb, Trash2, CheckCheck, BellOff } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { formatTimeAgo } from '../utils/timeUtils';

const typeConfig = {
  like: { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  comment: { icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  link: { icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  message: { icon: MessageCircle, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  pyq: { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  book: { icon: BookOpen, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
  mentor: { icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  system: { icon: Bell, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20' },
};

const typeRoutes = {
  like: '/',
  comment: '/',
  link: '/connect',
  message: '/inbox',
  pyq: '/vault',
  book: '/library',
  mentor: '/mentor',
  system: '/',
};

function NotificationItem({ notification, onRead, onDelete, onNavigate }) {
  const config = typeConfig[notification.type] || typeConfig.system;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 sm:gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer hover:shadow-sm ${
        notification.read
          ? 'bg-white dark:bg-[#0e1322]'
          : 'bg-[#f5f3ef] dark:bg-[#111830]'
      }`}
      style={{ border: '1px solid #e8e5e0' }}
      onClick={() => {
        onRead(notification.id);
        onNavigate(notification.type);
      }}
    >
      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(notification.timestamp)}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!notification.read && (
          <button
            onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
            className="p-1.5 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors"
            title="Mark as read"
          >
            <CheckCheck className="w-4 h-4 text-slate-400" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-500" />
        </button>
      </div>
    </div>
  );
}

function EmptyNotifications() {
  return (
    <div className="card p-8 sm:p-12 text-center animate-slide-up">
      <div className="w-16 h-16 rounded-2xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center mx-auto mb-4 animate-float">
        <BellOff className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No notifications yet</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        When you get likes, comments, links, or messages, they'll show up here.
      </p>
    </div>
  );
}

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleNavigate = (type) => {
    const route = typeRoutes[type] || '/';
    navigate(route);
  };

  return (
    <div className="p-4 sm:p-8 overflow-x-hidden">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filter === 'unread'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322]'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="px-3 py-2 rounded-lg text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <div className="space-y-3">
            {filtered.map(notif => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onRead={markAsRead}
                onDelete={deleteNotification}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
