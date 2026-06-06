import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Search, X, MessageCircle, UserMinus, Link2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { toggleLink, getLinks, createConversation, getUser } from '../services/data';
import ProfessionalSearch from '../components/ProfessionalSearch';

export default function Bind() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [linkedUserData, setLinkedUserData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (user?.id) {
          const links = await getLinks(user.id);
          const linkedIds = Object.keys(links).filter(id => links[id]);
          const userData = await Promise.all(linkedIds.map(id => getUser(id)));
          setLinkedUserData(userData.filter(Boolean));
        }
      } catch (e) { console.warn('Failed to load binds:', e); }
      finally { setLoading(false); }
    };
    load();
  }, [user?.id]);

  const toggleBind = useCallback(async (userId) => {
    if (!user?.id) return;
    try {
      await toggleLink(user.id, userId);
      setLinkedUserData(prev => prev.filter(u => u.id !== userId));
      const target = linkedUserData.find(u => u.id === userId);
      if (target) {
        addNotification({ userId: user.id, type: 'link', message: `Unbound from ${target.name}` });
      }
    } catch (e) { console.error('Failed to unbind:', e); }
  }, [user?.id, linkedUserData, addNotification]);

  const navigateToInbox = useCallback(async (targetUser) => {
    if (!user?.id || !targetUser?.id) return;
    try {
      const conversationId = await createConversation(user.id, targetUser.id);
      navigate('/inbox', { state: { targetUser, conversationId } });
    } catch (e) {
      navigate('/inbox', { state: { targetUser } });
    }
  }, [user?.id, navigate]);

  const navigateToProfile = useCallback((userId) => {
    navigate(`/profile/${userId}`);
  }, [navigate]);

  const filtered = useMemo(() => {
    if (!searchQuery) return linkedUserData;
    return linkedUserData.filter(u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [linkedUserData, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-32" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-28" />
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#0e1322] rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Your Binds</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{linkedUserData.length} active connection{linkedUserData.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/connect')}
          className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <span className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Find Friends
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <ProfessionalSearch
          placeholder="Search connections..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          inputMode="search"
        />
      </div>

      {/* Content */}
      <div>
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="group flex items-center gap-4 p-4 bg-white dark:bg-[#0e1322] rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-sm transition-all duration-200"
              >
                {/* Avatar */}
                <button
                  onClick={() => navigateToProfile(u.id)}
                  className="relative shrink-0 focus:outline-none"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 p-[2px]">
                    <div className="w-full h-full rounded-full bg-white dark:bg-[#0e1322] flex items-center justify-center overflow-hidden">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{u.name?.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#0e1322]" />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0" onClick={() => navigateToProfile(u.id)}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {u.name}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                  {u.college && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{u.college}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigateToInbox(u); }}
                    className="p-2.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    aria-label="Message"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleBind(u.id); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Unbind</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No connections yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 text-center max-w-xs">
              Start building your network by connecting with other students
            </p>
            <button
              onClick={() => navigate('/connect')}
              className="px-6 py-2.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-sm"
            >
              Find Students
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
