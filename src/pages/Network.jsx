import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, Users, Search, X, MessageCircle, UserMinus, Compass, BadgeCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { toggleLink, getLinks, createConversation } from '../services/data';
import ProfessionalSearch from '../components/ProfessionalSearch';

export default function Network() {
  const { user, users, refreshUsers } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const isBindPage = location.pathname === '/bind';
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

  const { suggested, following } = useMemo(() => {
    const linkedIds = Object.keys(linkedUsers).filter(id => linkedUsers[id]);
    const followingList = otherUsers.filter(u => linkedIds.includes(u.id));

    const suggestedList = otherUsers
      .filter(u => !linkedIds.includes(u.id))
      .map(u => {
        let score = 0;
        let reason = '';
        if (u.college && user?.college && u.college === user.college) { score += 5; reason = `Same college`; }
        if (u.branch && user?.branch && u.branch === user.branch) { score += 3; reason = reason || `Same branch`; }
        if (u.year && user?.year && u.year === user.year) { score += 2; reason = reason || `Same year`; }
        if (!reason) reason = 'Suggested for you';
        return { ...u, score, reason };
      })
      .sort((a, b) => b.score - a.score);

    const filtered = searchQuery
      ? [...suggestedList, ...followingList].filter(u =>
          u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.username?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : { following: followingList, suggested: suggestedList };

    return {
      suggested: filtered.suggested || [],
      following: filtered.following || followingList
    };
  }, [otherUsers, linkedUsers, user, searchQuery]);

  const displayUsers = searchQuery ? [...suggested, ...following] : null;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse" style={{ borderRadius: '18px' }}>
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
      {/* Top Bar - Only on /bind */}
      {isBindPage && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700 -mx-3 sm:-mx-6 px-3 sm:px-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Your Binds</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{following.length} connections</p>
          </div>
          <button
            onClick={() => navigate('/connect')}
            className="px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200"
          >
            + Find Friends
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <ProfessionalSearch
          placeholder="Search by username..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full bg-white dark:bg-[#0e1322] border border-gray-200 dark:border-gray-700"
          inputMode="search"
        />
      </div>

      {/* Content */}
      <div className="mt-2">
        {searchQuery ? (
          displayUsers && displayUsers.length > 0 ? (
            <div className="space-y-2">
              {displayUsers.map((u, i) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-[#0e1322] rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationName: 'fadeInUp', animationDuration: '0.4s', animationFillMode: 'backwards' }}
                >
                  {/* Avatar with gradient ring */}
                  <div className="relative shrink-0">
                    <div className="p-[2px] rounded-full bg-gradient-to-r from-blue-400 to-blue-600">
                      <div className="bg-white dark:bg-[#0e1322] rounded-full p-0.5">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border-2 border-transparent" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#2d3748] flex items-center justify-center">
                            <span className="text-lg font-bold text-white">{u.name?.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                    {u.branch && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        {u.branch}
                      </span>
                    )}
                    {u.college && (
                      <span className="inline-block mt-1 ml-1 px-2 py-0.5 text-xs rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                        {u.college}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {isBindPage && !!linkedUsers[u.id] ? (
                      <button
                        onClick={() => toggleConnect(u.id)}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all duration-200 text-sm"
                      >
                        <UserMinus className="w-4 h-4" />
                        <span>Unbind</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleConnect(u.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Bind</span>
                      </button>
                    )}
                    <button
                      onClick={() => navigateToInbox(u)}
                      className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      aria-label="Message"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Compass className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No users found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Try searching with a different username</p>
            </div>
          )
        ) : isBindPage ? (
          // On /bind page: show grid of connections
          following.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {following.map((u, i) => (
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
                  </button>

                  {/* Profile Info */}
                  <div className="p-3">
                    <button onClick={() => navigateToProfile(u.id)} className="block text-left w-full">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                        {u.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                      {u.branch && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                          {u.branch}
                        </span>
                      )}
                    </button>
                    {/* Message button on mobile */}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigateToInbox(u); }}
                      className="md:hidden mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
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
          )
        ) : (
          // On /connect page: show suggestions
          !searchQuery && suggested.length === 0 ? (
            <div className="text-center py-16">
              <Compass className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Search for students</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter a username to find and bind with students</p>
            </div>
          ) : suggested.length > 0 ? (
            <div className="space-y-2">
              {suggested.map((u, i) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-[#0e1322] rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationName: 'fadeInUp', animationDuration: '0.4s', animationFillMode: 'backwards' }}
                >
                  {/* Avatar with gradient ring */}
                  <div className="relative shrink-0">
                    <div className="p-[2px] rounded-full bg-gradient-to-r from-blue-400 to-blue-600">
                      <div className="bg-white dark:bg-[#0e1322] rounded-full p-0.5">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border-2 border-transparent" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#2d3748] flex items-center justify-center">
                            <span className="text-lg font-bold text-white">{u.name?.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                    {u.reason && (
                      <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">{u.reason}</p>
                    )}
                    {u.college && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{u.college}</p>
                    )}
                  </div>

                  {/* Bind Button */}
                  <button
                    onClick={() => toggleConnect(u.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Bind</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <UserPlus className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No suggestions</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Check back later for new student suggestions</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
