import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toggleLink, getLinks, createConversation, getUser } from '../services/data';

export default function Bind() {
  const { user, refreshUsers } = useAuth();
  const navigate = useNavigate();
  const [linkedUserData, setLinkedUserData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (user?.id) {
          const links = await getLinks(user.id);
          const linkedUserIds = Object.entries(links).filter(([_, v]) => v).map(([id]) => id);
          const userData = await Promise.all(linkedUserIds.map(id => getUser(id)));
          setLinkedUserData(userData.filter(Boolean));
        }
      } catch (e) { console.warn('Failed to load:', e); }
      finally { setLoading(false); }
    };
    load();
  }, [user?.id]);

  const toggleBind = useCallback(async (userId) => {
    if (!user?.id) return;
    try {
      await toggleLink(user.id, userId);
      setLinkedUserData(prev => prev.filter(u => u.id !== userId));
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
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-8">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="text-center animate-pulse">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Binds</h1>
          <p className="text-sm text-gray-500 mt-1">{linkedUserData.length} {linkedUserData.length === 1 ? 'bind' : 'binds'}</p>
        </div>
        <button onClick={() => navigate('/connect')} className="text-sm font-semibold text-blue-500 hover:text-blue-600">
          Find Friends
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Instagram-style Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-8">
          {filtered.map((u, i) => (
            <InstagramCard 
              key={u.id} 
              user={u} 
              onProfile={() => navigateToProfile(u.id)}
              onMessage={() => navigateToInbox(u)}
              onUnbind={() => toggleBind(u.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No binds yet</h3>
          <p className="text-sm text-gray-500 mb-6">When you bind with friends, they'll show up here.</p>
          <button 
            onClick={() => navigate('/connect')}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Find Friends
          </button>
        </div>
      )}
    </div>
  );
}

function InstagramCard({ user, onProfile, onMessage, onUnbind }) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="text-center group relative">
      <button onClick={onProfile} className="block focus:outline-none">
        <div className="relative">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover mx-auto border-2 border-gray-100 dark:border-gray-800 group-hover:opacity-80 transition-opacity"
          />
          <button
            onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
            className="absolute bottom-0 right-2 w-6 h-6 rounded-full bg-gray-900 dark:bg-gray-700 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ··
          </button>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white mt-3 truncate">{user.username}</p>
      </button>

      {showMenu && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 min-w-[140px] z-50">
          <button onClick={() => { onProfile(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            View profile
          </button>
          <button onClick={() => { onMessage(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            Message
          </button>
          <button onClick={() => { onUnbind(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50">
            Unbind
          </button>
        </div>
      )}
    </div>
  );
}