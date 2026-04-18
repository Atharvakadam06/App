import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { toggleLink, getLinks, createConversation } from '../services/data';
import ProfessionalSearch from '../components/ProfessionalSearch';

export default function Network() {
  const { user, users, refreshUsers } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [linkedUsers, setLinkedUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await refreshUsers();
        if (user?.id) {
          const links = await getLinks(user.id);
          setLinkedUsers(links);
        }
      } catch (e) { console.warn('Failed to load network:', e); }
      finally { setLoading(false); }
    };
    load();
  }, [user?.id, refreshUsers]);

  const toggleConnect = useCallback(async (userId) => {
    if (!user?.id) return;
    try {
      const isNowLinked = await toggleLink(user.id, userId);
      setLinkedUsers(prev => ({ ...prev, [userId]: isNowLinked }));
      if (isNowLinked) {
        const linkedUser = users.find(u => u.id === userId);
        if (linkedUser) addNotification({ userId: user.id, type: 'link', message: `You're now connected with ${linkedUser.name} (@${linkedUser.username})` });
      }
    } catch (e) { console.error('Failed to toggle connection:', e); }
  }, [user?.id, users, addNotification]);

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

  const otherUsers = useMemo(() => users.filter(u => u.id !== user?.id), [users, user?.id]);

  const { suggested, count } = useMemo(() => {
    const arr = otherUsers.map(u => {
      let score = 0;
      let reason = '';
      if (u.college && user?.college && u.college === user.college) { score += 5; reason = `Same college`; }
      if (u.branch && user?.branch && u.branch === user.branch) { score += 3; reason = reason || `Same branch`; }
      if (u.year && user?.year && u.year === user.year) { score += 2; reason = reason || `Same year`; }
      if (!reason) reason = 'Suggested for you';
      if (linkedUsers[u.id]) { score = 0; reason = 'Binded'; }
      return { ...u, score, reason };
    });
    const sug = arr.filter(u => u.score > 0).sort((a, b) => b.score - a.score);
    const others = arr.filter(u => u.score === 0);
    const filtered = searchQuery ? [...sug, ...others].filter(u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [...sug, ...others];
    return { suggested: filtered, count: arr.length };
  }, [otherUsers, linkedUsers, user, searchQuery]);

  const displayUsers = searchQuery ? suggested : [];

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
      {/* Search Bar */}
      <div className="mb-6">
        <ProfessionalSearch
          placeholder="Search by username..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full"
        />
      </div>

      {/* Results - only show when searching */}
      {searchQuery ? (
        displayUsers.length > 0 ? (
          <div className="space-y-3">
            {displayUsers.map((u, i) => (
              <SuggestionRow 
                key={u.id} 
                user={u} 
                delay={i * 30}
                onProfile={() => navigateToProfile(u.id)}
                onConnect={() => toggleConnect(u.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Compass className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No users found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Try searching with a different username</p>
          </div>
        )
      ) : (
        <div className="text-center py-16">
          <Compass className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Search for students</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Enter a username to find and bind with students</p>
        </div>
      )}
    </div>
  );
}

function SuggestionRow({ user, delay, onProfile, onConnect }) {
  return (
    <div 
      className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#0e1322] border border-gray-100 dark:border-[#151a28] hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button onClick={onProfile} className="shrink-0">
        <img
          src={user.avatar}
          alt={user.name}
          className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
        />
      </button>
      <div className="flex-1 min-w-0">
        <button onClick={onProfile} className="block text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-blue-500 transition-colors">{user.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
          {user.reason && (
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{user.reason}</p>
          )}
        </button>
      </div>
      <button
        onClick={onConnect}
        className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-95 transition-all duration-200"
      >
        <UserPlus className="w-4 h-4" />
        Bind
      </button>
    </div>
  );
}