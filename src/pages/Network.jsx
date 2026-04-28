import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Search, X, UserMinus } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('following'); // 'following' | 'discover'

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

  const { suggested, following, count } = useMemo(() => {
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
      following: filtered.following || followingList, 
      count: otherUsers.length 
    };
  }, [otherUsers, linkedUsers, user, searchQuery]);

  const displayUsers = searchQuery ? [...suggested, ...following] : null;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#0e1322] rounded-xl p-4 animate-pulse">
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
      {/* Header with Tabs */}
      <div className="sticky top-0 z-10 bg-white dark:bg-[#0e1322] border-b border-gray-200 dark:border-gray-700 -mx-3 sm:-mx-6 px-3 sm:px-6">
        {/* Search Bar - Only show when searching or in discover tab */}
        {(searchQuery || activeTab === 'discover') && (
          <div className="py-3">
            <ProfessionalSearch
              placeholder="Search students..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => { setActiveTab('following'); setSearchQuery(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'following'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Following</span>
            <span className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
              {following.length}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('discover'); setSearchQuery(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'discover'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Discover</span>
            <span className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
              {suggested.length}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-2">
        {searchQuery ? (
          displayUsers && displayUsers.length > 0 ? (
            <div className="space-y-2">
              {displayUsers.map((u, i) => (
                <UserCard
                  key={u.id}
                  user={u}
                  index={i}
                  isLinked={!!linkedUsers[u.id]}
                  onProfile={() => navigateToProfile(u.id)}
                  onConnect={() => toggleConnect(u.id)}
                  onMessage={() => navigateToInbox(u)}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={Search} title="No users found" description="Try searching with a different name" />
          )
        ) : activeTab === 'following' ? (
          following.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {following.map((u, i) => (
                <ProfileCard key={u.id} user={u} index={i} onProfile={() => navigateToProfile(u.id)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="No connections yet" description="Go to Discover to find students to bind with" />
          )
        ) : suggested.length > 0 ? (
          <div className="space-y-2">
            {suggested.map((u, i) => (
              <UserCard
                key={u.id}
                user={u}
                index={i}
                isLinked={false}
                onProfile={() => navigateToProfile(u.id)}
                onConnect={() => toggleConnect(u.id)}
                onMessage={() => navigateToInbox(u)}
                showReason
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={UserPlus} title="No suggestions" description="Check back later for new students" />
        )}
      </div>
    </div>
  );
}

function UserCard({ user, index, isLinked, onProfile, onConnect, onMessage, showReason = false }) {
  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#0e1322] border border-gray-100 dark:border-[#151a28] hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <button onClick={onProfile} className="shrink-0">
        <img
          src={user.avatar}
          alt={user.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
        />
      </button>
      <div className="flex-1 min-w-0">
        <button onClick={onProfile} className="block text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-blue-500 transition-colors">
            {user.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
          {showReason && user.reason && (
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">{user.reason}</p>
          )}
          {user.college && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{user.college}</p>
          )}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onConnect}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            isLinked
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-500 hover:border border-red-200'
              : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
          }`}
        >
          {isLinked ? (
            <>
              <UserMinus className="w-4 h-4" />
              <span className="hidden sm:inline">Unbind</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Bind</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ProfileCard({ user, index, onProfile }) {
  return (
    <div 
      className="group bg-white dark:bg-[#0e1322] rounded-xl border border-gray-100 dark:border-[#151a28] hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md transition-all duration-200 overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Profile Image */}
      <button onClick={onProfile} className="w-full aspect-square bg-gray-50 dark:bg-gray-800/50 overflow-hidden">
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </button>
      
      {/* Profile Info */}
      <div className="p-3">
        <button onClick={onProfile} className="block text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
            {user.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
        </button>
        {user.branch && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{user.branch}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">{description}</p>
    </div>
  );
}
