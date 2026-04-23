import { useState, useEffect, useRef, useMemo } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Image, Send, FileText, Trash2, Video, ChevronUp, Filter, Edit3, Flag, ZoomIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getAllPosts, deletePost, updatePost, likePost, isPostLiked, savePost, isPostSaved, addComment, getPostComments, deleteComment, createReport } from '../services/data';
import { usePostLike } from '../context/PostLikeContext';
import { formatTimeAgo } from '../utils/timeUtils';
import ProfessionalSearch from '../components/ProfessionalSearch';

function PostCard({ post, onLike, onSave, onDelete, onComment, onDeleteComment, onUpdate, currentUserId, index }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const lastTapRef = useRef(0);
  const [editingPost, setEditingPost] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const isOwner = post.userId === currentUserId;
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
      if (navigator.share) {
        try { await navigator.share({ title: 'StuGrow', text: post.content, url: postUrl }); } catch { /* Ignore share errors */ }
      } else {
      await navigator.clipboard.writeText(`${post.content}\n\n${postUrl}`);
      addToast('Link copied to clipboard', 'success');
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    await onUpdate(post.id, editContent);
    setEditingPost(false);
    setShowMenu(false);
    addToast('Post updated', 'success');
  };

  const handleReport = async (reason) => {
    await createReport(currentUserId, post.id, 'post', reason);
    setShowReportModal(false);
    setShowMenu(false);
    addToast('Post reported', 'success');
  };

  const handleLikeClick = () => {
    if (!currentUserId) return;
    onLike(post.id);
  };

  const doDoubleTap = () => {
    if (!currentUserId) return;
    if (!post.liked) {
      onLike(post.id);
    }
    setShowHeartOverlay(true);
    setTimeout(() => setShowHeartOverlay(false), 1000);
  };

  const handleContentTap = (e) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      doDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const isAnimatingRef = useRef(false);

  const handleImageTap = (e) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapRef.current < 400 && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      doDoubleTap();
      setTimeout(() => { isAnimatingRef.current = false; }, 1000);
    }
    lastTapRef.current = now;
  };

  const handleProfileClick = () => {
    if (post.userId === currentUserId) navigate('/profile');
    else navigate(`/profile/${post.userId}`);
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText('');
  };

  return (
    <article 
      className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden animate-reveal-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleProfileClick} className="shrink-0">
              <img src={post.user?.avatar} alt={post.user?.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
            </button>
            <div className="flex-1 min-w-0">
              <button onClick={handleProfileClick} className="font-semibold text-sm text-gray-900 dark:text-white hover:opacity-70 transition-opacity block truncate">{post.user?.name}</button>
              <p className="text-xs text-gray-500 truncate">{post.user?.college} · {formatTimeAgo(post.timestamp)}</p>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-12 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-gray-100 dark:border-gray-800 p-2 z-30 min-w-[160px] animate-scale-in">
                <button onClick={() => { handleShare(); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Share2 className="w-4 h-4" />Share post
                </button>
                {post.image && !isOwner && (
                  <button onClick={() => { setShowImageLightbox(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <ZoomIn className="w-4 h-4" />View image
                  </button>
                )}
                {isOwner && (
                  <>
                    <button onClick={() => { setEditingPost(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />Edit post
                    </button>
                    <button onClick={() => { onDelete(post.id); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />Delete post
                    </button>
                  </>
                )}
                {!isOwner && (
                  <button onClick={() => { setShowReportModal(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                    <Flag className="w-4 h-4" />Report post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {editingPost ? (
          <div className="mt-4">
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white resize-none" autoFocus />
            <div className="flex gap-3 mt-3">
              <button onClick={handleEdit} className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">Save Changes</button>
              <button onClick={() => { setEditingPost(false); setEditContent(post.content); }} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <p onClick={handleContentTap} className="mt-3 text-[15px] text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}
      </div>

      {post.image && (
        <div className="relative bg-gray-100 dark:bg-gray-900">
          <img 
            src={post.image} 
            alt="" 
            loading="lazy"
            className="w-full max-h-[500px] object-contain cursor-pointer" 
            onClick={handleImageTap}
          />
          {showHeartOverlay && (
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
              <Heart className="w-20 h-20 sm:w-28 sm:h-28 text-rose-500 fill-current animate-elegant-heart drop-shadow-lg" />
            </div>
          )}
        </div>
      )}

      {post.video && (
        <div className="relative">
          <video src={post.video} controls className="w-full max-h-[450px]" />
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {post.tags.map(tag => (
            <span key={tag} className="text-sm font-medium text-blue-500 hover:text-blue-600 cursor-pointer transition-colors">#{tag}</span>
          ))}
        </div>
      )}

      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1">
          <button type="button" style={{zIndex: 100}} onClick={handleLikeClick} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${post.liked ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'text-gray-600 dark:text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'}`}>
            <Heart className={`w-[19px] h-[19px] ${post.liked ? 'fill-current' : ''} ${likeAnimating ? 'animate-like-pop' : ''}`} />
            <span className="text-sm font-semibold">{post.likes}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${showComments ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}>
            <MessageCircle className="w-[19px] h-[19px]" />
            <span className="text-sm font-semibold">{post.comments?.length || 0}</span>
          </button>
          <button onClick={handleShare} className="btn-share-flip" title="Share">
            <div className="flip-inner">
              <div className="flip-front">
                <Share2 className="w-4 h-4 text-[#1a6fa8]" />
              </div>
              <div className="flip-back">
                <Share2 className="w-4 h-4 text-white" />
              </div>
            </div>
          </button>
        </div>
        <button onClick={() => onSave(post.id)} className={`p-2.5 rounded-full transition-all duration-300 ${post.saved ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-600 dark:text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}>
          <Bookmark className={`w-[19px] h-[19px] ${post.saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {showComments && (
        <div className="px-4 pb-4 animate-slide-down">
          <div className="flex gap-3">
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleComment()} placeholder="Add a comment..." className="flex-1 text-sm py-2.5 px-4 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500" />
            <button onClick={handleComment} disabled={!commentText.trim()} className="text-blue-500 font-medium text-sm disabled:opacity-40 hover:opacity-80 transition-opacity">
              Post
            </button>
          </div>
          {post.comments && post.comments.length > 0 && (
            <div className="mt-4 space-y-4">
              {post.comments.map((c, i) => (
                <div key={i} className="flex gap-3 animate-fade-in">
                  <img src={c.avatar} alt="" className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{c.name}</span>
                      <span className="text-xs text-gray-500">{formatTimeAgo(c.timestamp)}</span>
                    </div>
                    {c.userId === currentUserId && (
                      <button onClick={() => onDeleteComment(post.id, c.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showImageLightbox && post.image && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setShowImageLightbox(false)}>
          <button onClick={() => setShowImageLightbox(false)} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all">
            <X className="w-6 h-6 text-white" />
          </button>
          <img src={post.image} alt="" className="max-w-[92vw] max-h-[92vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowReportModal(false)}>
          <div className="card p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Report Post</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Why are you reporting this post?</p>
            {['Spam or misleading', 'Inappropriate content', 'Harassment or bullying', 'False information', 'Other'].map(reason => (
              <button key={reason} onClick={() => handleReport(reason)} className="w-full text-left px-4 py-3.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors mb-1">{reason}</button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function EmptyFeed() {
  return (
    <div className="card p-12 text-center animate-reveal-up">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-5">
        <FileText className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No posts yet</h3>
      <p className="text-slate-500 dark:text-slate-400">Be the first to share something with your campus!</p>
    </div>
  );
}

function SkeletonPost() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" /><div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" /></div>
      </div>
      <div className="space-y-3 mb-5"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" /><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/5" /><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/5" /></div>
      <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700"><div className="h-9 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" /><div className="h-9 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" /><div className="h-9 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" /></div>
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const { likeMap, likesCountMap, toggleLike, getLikeState, syncAllPosts, initialized } = usePostLike();
  const [loading, setLoading] = useState(true);
  const [allPosts, setAllPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [sortBy] = useState('latest');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const categories = [
    { id: null, label: 'All' },
    { id: 'general', label: 'General' },
    { id: 'question', label: 'Questions' },
    { id: 'event', label: 'Events' },
    { id: 'announcement', label: 'Announcements' },
    { id: 'study', label: 'Study' },
    { id: 'lost', label: 'Lost & Found' },
  ];

  useEffect(() => { loadPosts(); }, []);
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadPosts = async () => {
    try {
      if (user?.id && !initialized) {
        await syncAllPosts(user.id);
      }
      const posts = await getAllPosts();
      const enriched = await Promise.all(posts.map(async (p) => {
        const comments = await getPostComments(p.id);
        const { liked, likes } = getLikeState(p.id);
        const dbLiked = await isPostLiked(p.id, user?.id);
        const actualLikes = likesCountMap[p.id] ?? p.likes ?? 0;
        return {
          ...p,
          liked: liked ?? dbLiked,
          likes: actualLikes,
          saved: await isPostSaved(p.id, user?.id),
          comments
        };
      }));
      setAllPosts(enriched);
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setLoading(false), 400); }
  };

  const filteredPosts = useMemo(() => {
    let filtered = allPosts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.content.toLowerCase().includes(q) || p.user?.name?.toLowerCase().includes(q));
    }
    if (activeCategory) filtered = filtered.filter(p => p.category === activeCategory);
    if (sortBy === 'popular') filtered = [...filtered].sort((a, b) => b.likes - a.likes);
    return filtered;
  }, [allPosts, searchQuery, activeCategory, sortBy]);

  const handleLike = async (postId) => {
    if (!user?.id) return;
    try {
      const post = allPosts.find(p => p.id === postId);
      if (!post) return;
      const wasLiked = post.liked || false;
      
      await likePost(postId, !wasLiked);
      const result = await toggleLike(postId, user.id, wasLiked, post.likes || 0);
      
      setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: result.liked, likes: result.likes } : p));
    } catch (e) { console.error(e); }
  };

  const handleSave = async (postId) => {
    try {
      const isSaved = await savePost(postId, user.id);
      setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: isSaved } : p));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (postId) => {
    await deletePost(postId);
    setAllPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleUpdate = async (postId, newContent) => {
    await updatePost(postId, newContent);
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent } : p));
  };

  const handleComment = async (postId, text) => {
    await addComment(postId, user.id, text);
    const comments = await getPostComments(postId);
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, comments } : p));
  };

  const handleDeleteComment = async (postId, commentId) => {
    await deleteComment(commentId);
    const comments = await getPostComments(postId);
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, comments } : p));
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6"><div className="max-w-2xl mx-auto space-y-5"><SkeletonPost /><SkeletonPost /><SkeletonPost /></div></div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button key={cat.id || 'all'} onClick={() => setActiveCategory(cat.id)} className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${activeCategory === cat.id ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              {cat.label}
            </button>
          ))}
        </div>

        <ProfessionalSearch
          placeholder="Search posts..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {filteredPosts.length === 0 ? <EmptyFeed /> : filteredPosts.map((post, i) => (
          <PostCard key={post.id} post={post} onLike={handleLike} onSave={handleSave} onDelete={handleDelete} onUpdate={handleUpdate} onComment={handleComment} onDeleteComment={handleDeleteComment} currentUserId={user.id} index={i} />
        ))}

        {showScrollTop && (
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-6 right-6 p-3.5 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 z-40">
            <ChevronUp className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
