import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, UserPlus, MessageCircle, UserMinus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { toggleLink, getLinks, createConversation, getUser } from '../services/data';
import ProfessionalSearch from '../components/ProfessionalSearch';

export default function Bind() {
  const { user, refreshUsers } = useAuth();
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
      // Optionally add notification for unbind
      // Could enhance with user name if needed
    } catch (e) { console.error('Failed to unbind:', e); }
  }, [user?.id]);

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
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700 -mx-3 sm:-mx-6 px-3 sm:px-6">
          <div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-28" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#0e1322] rounded-xl p-4 animate-pulse" style={{ borderRadius: '18px' }}>
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700 -mx-3 sm:-mx-6 px-3 sm:px-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Your Binds</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{linkedUserData.length} connections</p>
        </div>
        <button
          onClick={() => navigate('/connect')}
          className="px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200"
        >
          + Find Friends
        </button>
      </div>

      {/* Stories Row */}
      {linkedUserData.length > 0 && (
        <div className="stories-row flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 mb-4">
          {linkedUserData.map((u) => (
            <button key={u.id} onClick={() => navigateToProfile(u.id)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="relative">
                <div className="w-12 h-12 p-[2px] rounded-full bg-gradient-to-r from-blue-400 to-blue-600">
                  <div className="w-full h-full rounded-full bg-white dark:bg-[#0e1322] flex items-center justify-center">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{u.name?.charAt(0)}</span>
                    )}
                  </div>
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#0e1322]" />
              </div>
              <span className="text-xs text-gray-700 dark:text-gray-300 max-w-[48px] truncate">{u.name?.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <ProfessionalSearch
          placeholder="Search by username..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full bg-white dark:bg-[#0e1322] border border-gray-200 dark:border-gray-700 rounded-xl"
          inputMode="search"
        />
      </div>

      {/* Content */}
      <div className="mt-2">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((u, i) => (
              <div
                key={u.id}
                className="group bg-white dark:bg-[#0e1322] rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/50 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms`, animationName: 'scaleIn', animationDuration: '0.3s', animationFillMode: 'backwards' }}
              >
                {/* Profile Image */}
                <button
                  onClick={() => navigateToProfile(u.id)}
                  className="w-full aspect-square bg-gray-50 dark:bg-gray-800/50 relative overflow-hidden"
                  aria-label={`View ${u.name}'s profile`}
                >
                  {u.avatar ? (
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#2d3748] flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{u.name?.charAt(0)}</span>
                    </div>
                  )}
                  {/* Online dot */}
                  <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#0e1322]" />
                  {/* Message button on mobile */}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigateToInbox(u); }}
                    className="md:hidden absolute top-2 right-2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-md"
                    aria-label="Message"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                  </button>
                </button>

                {/* Profile Info */}
                <div className="p-3">
                  <button onClick={() => navigateToProfile(u.id)} className="block text-left w-full">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                      {u.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                  </button>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{u.college}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigateToInbox(u); }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBind(u.id); }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium"
                    >
                      <UserMinus className="w-4 h-4" />
                      Unbind
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No connections yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Start building your network</p>
            <button
              onClick={() => navigate('/connect')}
              className="px-6 py-2.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all"
            >
              Find Students
            </button>
          </div>
        )}
      </div>
    </div>
  );
}