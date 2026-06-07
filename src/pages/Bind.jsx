import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, MessageCircle, UserMinus, Link2, UserPlus } from 'lucide-react';
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
      } catch (e) {
        console.warn('Failed to load binds:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const toggleBind = useCallback(
    async (userId) => {
      if (!user?.id) return;
      try {
        await toggleLink(user.id, userId);
        const target = linkedUserData.find((u) => u.id === userId);
        setLinkedUserData((prev) => prev.filter((u) => u.id !== userId));
        if (target) {
          addNotification({ userId: user.id, type: 'link', message: `Unbound from ${target.name}` });
        }
      } catch (e) {
        console.error('Failed to unbind:', e);
      }
    },
    [user?.id, linkedUserData, addNotification]
  );

  const navigateToInbox = useCallback(
    async (targetUser) => {
      if (!user?.id || !targetUser?.id) return;
      try {
        const conversationId = await createConversation(user.id, targetUser.id);
        navigate('/inbox', { state: { targetUser, conversationId } });
      } catch (e) {
        navigate('/inbox', { state: { targetUser } });
      }
    },
    [user?.id, navigate]
  );

  const navigateToProfile = useCallback((userId) => {
    navigate(`/profile/${userId}`);
  }, [navigate]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return linkedUserData;
    const q = searchQuery.toLowerCase().trim();
    return linkedUserData.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q)
    );
  }, [linkedUserData, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-[520px] mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6 px-1">
          <div>
            <div className="h-6 bg-gray-100 dark:bg-gray-800/80 rounded-lg w-24 mb-2" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded w-16" />
          </div>
          <div className="h-9 bg-gray-100 dark:bg-gray-800/80 rounded-full w-24" />
        </div>
        <div className="h-11 bg-gray-100 dark:bg-gray-800/80 rounded-2xl mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-100 dark:border-gray-800/50 bg-white dark:bg-[#0b0f1a] p-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800/70 shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-3.5 bg-gray-100 dark:bg-gray-800/70 rounded-lg w-28" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800/50 rounded-lg w-20" />
                </div>
                <div className="flex gap-2">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[520px] mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-5 px-1">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Binds
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
            {linkedUserData.length} connection{linkedUserData.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/connect')}
          className="h-9 px-4 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-semibold hover:opacity-80 active:scale-[0.97] transition-all duration-150"
        >
          Find Friends
        </button>
      </div>

      <div className="mb-4">
        <ProfessionalSearch
          placeholder="Search connections..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full bg-gray-50 dark:bg-[#0f131f] border border-gray-200/60 dark:border-gray-700/50 rounded-2xl text-[13px]"
          inputMode="search"
        />
      </div>

      <div className="space-y-1.5">
        {filtered.length > 0 ? (
          filtered.map((u, i) => (
            <div
              key={u.id}
              className="group relative rounded-2xl bg-white dark:bg-[#0d111c] border border-gray-100 dark:border-gray-800/60"
              style={{
                animationName: 'fadeInUp',
                animationDuration: '0.4s',
                animationFillMode: 'backwards',
                animationDelay: `${Math.min(i * 35, 350)}ms`,
                animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div className="p-3 flex items-center gap-3.5">
                <button
                  onClick={() => navigateToProfile(u.id)}
                  className="relative shrink-0 focus:outline-none"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800/70 ring-2 ring-white dark:ring-[#0d111c] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700/80">
                        <span className="text-base font-semibold text-gray-600 dark:text-gray-300">
                          {u.name?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-[10px] h-[10px] bg-emerald-500 rounded-full ring-[2px] ring-white dark:ring-[#0d111c]" />
                </button>

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigateToProfile(u.id)}
                >
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                    {u.name}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    @{u.username}
                  </p>
                  {u.college && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5 font-normal">
                      {u.college}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToInbox(u);
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 active:scale-90 transition-all duration-150"
                    aria-label="Message"
                  >
                    <MessageCircle className="w-[17px] h-[17px]" strokeWidth={1.8} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBind(u.id);
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-90 transition-all duration-150"
                    aria-label="Unbind"
                  >
                    <UserMinus className="w-[17px] h-[17px]" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : searchQuery.trim() ? (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800/60 bg-white dark:bg-[#0d111c] py-12 text-center">
            <div className="w-11 h-11 rounded-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">No connections found</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Try searching with a different name</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800/60 bg-white dark:bg-[#0d111c] py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center mx-auto mb-3">
              <Link2 className="w-5 h-5 text-gray-400" strokeWidth={1.6} />
            </div>
            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">No connections yet</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Start building your student network
            </p>
            <button
              onClick={() => navigate('/connect')}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-semibold hover:opacity-80 active:scale-[0.97] transition-all duration-150"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Discover Students
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
