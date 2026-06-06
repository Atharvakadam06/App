import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Search, Compass, MessageCircle } from 'lucide-react';
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
      <div className="max-w-[480px] mx-auto px-4 py-6">
        <div className="mb-3 h-10 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-full" />
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-100 dark:border-gray-800/70 bg-white dark:bg-[#0b0f1a] p-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800/60 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded-md w-28" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800/40 rounded-md w-20" />
                </div>
                <div className="h-9 w-20 rounded-full bg-gray-100 dark:bg-gray-800/60 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[520px] mx-auto px-4 py-6">
      <div className="space-y-3">
        {searchQuery ? (
          displayUsers && displayUsers.length > 0 ? (
            <div className="space-y-2.5">
              {displayUsers.map((u, i) => (
                <div
                  key={u.id}
                  className="group relative rounded-2xl border border-gray-100 dark:border-gray-800/70 bg-white dark:bg-[#0b0f1a]"
                  style={{
                    animationName: 'fadeInUp',
                    animationDuration: '0.35s',
                    animationFillMode: 'backwards',
                    animationDelay: `${Math.min(i * 40, 320)}ms`,
                    animationTimingFunction: 'ease-out',
                  }}
                >
                  <div className="p-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigateToProfile(u.id)}
                        className="relative shrink-0 focus:outline-none"
                      >
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800/70 ring-2 ring-white dark:ring-[#101520]">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700/70">
                              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                {u.name?.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>

                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigateToProfile(u.id)}
                      >
                        <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {u.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          @{u.username}
                        </p>
                        {u.college && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                            {u.college}
                          </p>
                        )}
                      </div>

                      {!linkedUsers[u.id] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleConnect(u.id);
                          }}
                          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200"
                          aria-label="Bind"
                        >
                          <UserPlus className="w-[18px] h-[18px]" strokeWidth={1.8} />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToInbox(u);
                        }}
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200"
                        aria-label="Message"
                      >
                        <MessageCircle className="w-[18px] h-[18px]" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800/70 bg-white dark:bg-[#0b0f1a] p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center mx-auto mb-3">
                <Compass className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No users found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Try searching with a different name
              </p>
            </div>
          )
        ) : !searchQuery && suggested.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800/70 bg-white dark:bg-[#0b0f1a] p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Search for students</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter a username to find and bind with students
            </p>
          </div>
        ) : suggested.length > 0 ? (
          <div className="space-y-2.5">
            {suggested.map((u, i) => (
              <div
                key={u.id}
                className="group relative rounded-2xl border border-gray-100 dark:border-gray-800/70 bg-white dark:bg-[#0b0f1a]"
                style={{
                  animationName: 'fadeInUp',
                  animationDuration: '0.35s',
                  animationFillMode: 'backwards',
                  animationDelay: `${Math.min(i * 40, 320)}ms`,
                  animationTimingFunction: 'ease-out',
                }}
              >
                <div className="p-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigateToProfile(u.id)}
                      className="relative shrink-0 focus:outline-none"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800/70 ring-2 ring-white dark:ring-[#101520]">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700/70">
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                              {u.name?.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigateToProfile(u.id)}
                    >
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {u.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        @{u.username}
                      </p>
                      {u.reason && (
                        <p className="text-[11px] text-blue-500 dark:text-blue-400 truncate mt-0.5">
                          {u.reason}
                        </p>
                      )}
                      {u.college && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {u.college}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleConnect(u.id);
                      }}
                      className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200"
                      aria-label="Bind"
                    >
                      <UserPlus className="w-[18px] h-[18px]" strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800/70 bg-white dark:bg-[#0b0f1a] p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center mx-auto mb-3">
              <Compass className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No suggestions</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Check back later for new student suggestions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
