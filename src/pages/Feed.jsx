import { useState, useEffect, useRef, useMemo } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send, FileText, Trash2, ChevronUp, Edit3, Flag, ZoomIn, Paperclip, Download, X, Sparkles, MessageSquare, HelpCircle, Calendar, Megaphone, BookOpen, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getAllPostsWithDetails, deletePost, updatePost, likePost, savePost, addComment, getPostComments, deleteComment, createReport } from '../services/data';
import { usePostLike } from '../context/PostLikeContext';
import { usePostSave } from '../context/PostSaveContext';
import { formatTimeAgo } from '../utils/timeUtils';
import ProfessionalSearch from '../components/ProfessionalSearch';

function PostCard({ post, onLike, onSave, onDelete, onComment, onDeleteComment, onUpdate, currentUserId, index }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const lastTapRef = useRef(0);
  const [editingPost, setEditingPost] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const isOwner = post.userId === currentUserId;
  const { addToast } = useToast();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'StuGrow', text: post.content, url: postUrl }); } catch { /* Ignore */ }
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
    if (!post.liked) onLike(post.id);
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
      className="bg-white dark:bg-[#0e1322] rounded-2xl border border-slate-100 dark:border-[#151a28] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 animate-reveal-up"
      style={{ animationDelay: `${Math.min(index * 0.06, 0.4)}s` }}
    >
      {/* Post Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={handleProfileClick} className="shrink-0 active:scale-95 transition-transform">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                {post.user?.avatar ? (
                  <img src={post.user.avatar} alt={post.user?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{post.user?.name?.charAt(0)}</span>
                  </div>
                )}
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <button
                onClick={handleProfileClick}
                className="font-bold text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate text-left"
              >
                {post.user?.name}
              </button>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {post.user?.college && <span>{post.user.college} · </span>}
                {formatTimeAgo(post.timestamp)}
              </p>
            </div>
          </div>

          {/* Menu */}
          <div className="relative shrink-0 ml-2" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-90"
            >
              <MoreHorizontal className="w-5 h-5 text-slate-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-11 bg-white dark:bg-[#0c1018] rounded-2xl shadow-xl border border-slate-100 dark:border-[#151a28] p-1.5 z-30 min-w-[172px] animate-scale-in">
                <button
                  onClick={() => { handleShare(); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  Share post
                </button>
                {post.image && !isOwner && (
                  <button
                    onClick={() => { setShowImageLightbox(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
                  >
                    <ZoomIn className="w-4 h-4 shrink-0" />
                    View image
                  </button>
                )}
                {isOwner && (
                  <>
                    <button
                      onClick={() => { setEditingPost(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
                    >
                      <Edit3 className="w-4 h-4 shrink-0" />
                      Edit post
                    </button>
                    <button
                      onClick={() => { onDelete(post.id); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      Delete post
                    </button>
                  </>
                )}
                {!isOwner && (
                  <button
                    onClick={() => { setShowReportModal(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                  >
                    <Flag className="w-4 h-4 shrink-0" />
                    Report post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Post Content */}
        {editingPost ? (
          <div className="mt-4">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="input-field resize-none min-h-[100px]"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEdit}
                className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors active:scale-95"
              >
                Save Changes
              </button>
              <button
                onClick={() => { setEditingPost(false); setEditContent(post.content); }}
                className="px-5 py-2.5 text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            onClick={handleContentTap}
            className="mt-3 text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-none"
          >
            {post.content}
          </p>
        )}
      </div>

      {/* Post Image */}
      {post.image && (
        <div className="relative bg-slate-50 dark:bg-slate-900">
          <img
            src={post.image}
            alt=""
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
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

      {/* Post Video */}
      {post.video && (
        <div className="relative bg-black">
          <video src={post.video} controls className="w-full max-h-[450px]" />
        </div>
      )}

      {/* File Attachment */}
      {post.file_url && (
        <div className="px-4 pb-3">
          <a
            href={post.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-[#0c1018] border border-slate-100 dark:border-[#1a2035] rounded-2xl hover:bg-slate-100 dark:hover:bg-[#101624] transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0">
              <Paperclip className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                {post.file_name || 'Attached File'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Click to view or download</p>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
          </a>
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {post.tags.map(tag => (
            <span key={tag} className="text-sm font-medium text-blue-500 hover:text-blue-600 cursor-pointer transition-colors">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="px-3 py-2 flex items-center justify-between border-t border-slate-50 dark:border-[#151a28]">
        <div className="flex items-center gap-1">
          {/* Like */}
          <button
            type="button"
            onClick={handleLikeClick}
            className={`post-action-btn ${
              post.liked
                ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
            }`}
          >
            <Heart className={`w-[18px] h-[18px] ${post.liked ? 'fill-current' : ''}`} />
            <span className="text-[13px] font-bold tabular-nums">{post.likes}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowComments(!showComments)}
            className={`post-action-btn ${
              showComments
                ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
          >
            <MessageCircle className="w-[18px] h-[18px]" />
            <span className="text-[13px] font-bold tabular-nums">{post.comments?.length || 0}</span>
          </button>

          {/* Share */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const btn = e.currentTarget;
              btn.classList.toggle('flipped');
              if (navigator.share) {
                navigator.share({ title: 'StuGrow Post', text: post.content, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
                addToast('Link copied!', 'success');
              }
              setTimeout(() => btn.classList.remove('flipped'), 1000);
            }}
            className="btn-share-flip ml-1"
            title="Share"
            aria-label="Share post"
          >
            <div className="flip-inner">
              <div className="flip-front">
                <Share2 className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flip-back">
                <Share2 className="w-4 h-4 text-white" />
              </div>
            </div>
          </button>
        </div>

        {/* Save */}
        <button
          onClick={() => onSave(post.id)}
          className={`post-action-btn ${
            post.saved
              ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
          }`}
        >
          <Bookmark className={`w-[18px] h-[18px] ${post.saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 animate-slide-down border-t border-slate-50 dark:border-[#151a28] pt-3">
          <div className="flex gap-2.5">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="Write a comment..."
              className="flex-1 text-sm py-2.5 px-4 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0c1018] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 text-white disabled:opacity-30 hover:bg-blue-600 transition-all active:scale-90 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {post.comments && post.comments.length > 0 && (
            <div className="mt-4 space-y-3">
              {post.comments.map((c, i) => (
                <div key={i} className="flex gap-2.5 animate-fade-in">
                  <img src={c.avatar} alt="" className="w-8 h-8 rounded-full shrink-0 border border-slate-100 dark:border-slate-800" />
                  <div className="flex-1 bg-slate-50 dark:bg-[#0c1018] rounded-2xl px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</span>
                        <span className="text-xs text-slate-400">{formatTimeAgo(c.timestamp)}</span>
                      </div>
                      {c.userId === currentUserId && (
                        <button
                          onClick={() => onDeleteComment(post.id, c.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-1 active:scale-90 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image Lightbox */}
      {showImageLightbox && post.image && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fade-in"
          onClick={() => setShowImageLightbox(false)}
        >
          <button
            onClick={() => setShowImageLightbox(false)}
            className="absolute top-4 right-4 p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-90"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={post.image}
            alt=""
            className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowReportModal(false)}
        >
          <div className="card p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Report Post</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Why are you reporting this post?</p>
            {['Spam or misleading', 'Inappropriate content', 'Harassment or bullying', 'False information', 'Other'].map(reason => (
              <button
                key={reason}
                onClick={() => handleReport(reason)}
                className="w-full text-left px-4 py-3.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors mb-1 font-medium"
              >
                {reason}
              </button>
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
      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No posts yet</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm">Be the first to share something with your campus!</p>
    </div>
  );
}

function SkeletonPost() {
  return (
    <div className="bg-white dark:bg-[#0e1322] rounded-2xl border border-slate-100 dark:border-[#151a28] p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full skeleton" />
        <div className="flex-1">
          <div className="h-3.5 skeleton rounded w-1/3 mb-2" />
          <div className="h-3 skeleton rounded w-1/4" />
        </div>
      </div>
      <div className="space-y-2.5 mb-4">
        <div className="h-3.5 skeleton rounded w-full" />
        <div className="h-3.5 skeleton rounded w-4/5" />
        <div className="h-3.5 skeleton rounded w-3/5" />
      </div>
      <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-[#151a28]">
        <div className="h-8 w-20 skeleton rounded-full" />
        <div className="h-8 w-20 skeleton rounded-full" />
        <div className="h-8 w-20 skeleton rounded-full" />
      </div>
    </div>
  );
}

const categories = [
  { id: null, label: 'All', icon: Sparkles },
  { id: 'general', label: 'General', icon: MessageSquare },
  { id: 'question', label: 'Questions', icon: HelpCircle },
  { id: 'event', label: 'Events', icon: Calendar },
  { id: 'announcement', label: 'Announcements', icon: Megaphone },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'lost', label: 'Lost & Found', icon: Search },
];

export default function Feed() {
  const { user } = useAuth();
  const { likeMap, likesCountMap, toggleLike, syncAllPosts } = usePostLike();
  const { savedMap, toggleSave, syncAllPosts: syncAllSaves } = usePostSave();
  const [loading, setLoading] = useState(true);
  const [allPosts, setAllPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { loadPosts(); }, []);

  useEffect(() => {
    const el = document.querySelector('[data-scroll-container]');
    if (!el) return;
    const handleScroll = () => setShowScrollTop(el.scrollTop > 500);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const loadPosts = async () => {
    try {
      if (user?.id) {
        await Promise.all([syncAllPosts(user.id), syncAllSaves(user.id)]);
      }
      const posts = await getAllPostsWithDetails(user?.id);
      const reconciled = posts.map(p => {
        const ctxLiked = likeMap[p.id];
        const ctxLikes = likesCountMap[p.id];
        const liked = ctxLiked !== undefined ? ctxLiked : p.liked;
        let likes = ctxLikes !== undefined ? ctxLikes : p.likes;
        if (liked && likes === 0) likes = 1;
        return { ...p, liked, likes };
      });
      setAllPosts(reconciled);
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setLoading(false), 300); }
  };

  const filteredPosts = useMemo(() => {
    let filtered = allPosts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.content.toLowerCase().includes(q) || p.user?.name?.toLowerCase().includes(q));
    }
    if (activeCategory) filtered = filtered.filter(p => p.category === activeCategory);
    return filtered;
  }, [allPosts, searchQuery, activeCategory]);

  const handleLike = async (postId) => {
    if (!user?.id) return;
    try {
      const post = allPosts.find(p => p.id === postId);
      if (!post) return;
      const wasLiked = post.liked || false;
      await likePost(postId, user.id);
      const result = await toggleLike(postId, user.id, wasLiked, post.likes || 0);
      setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: result.liked, likes: result.likes } : p));
    } catch (e) { console.error(e); }
  };

  const handleSave = async (postId) => {
    if (!user?.id) return;
    try {
      const post = allPosts.find(p => p.id === postId);
      if (!post) return;
      const currentSaved = post.saved || false;
      const newSaved = await toggleSave(postId, user.id, currentSaved);
      await savePost(postId, user.id);
      setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: newSaved } : p));
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
      <div className="p-4 sm:p-5">
        <div className="max-w-2xl mx-auto space-y-4">
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id || 'all'}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 shrink-0 border ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                    : 'bg-white dark:bg-[#0e1322] text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <ProfessionalSearch
          placeholder="Search posts..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Posts */}
        {filteredPosts.length === 0 ? (
          <EmptyFeed />
        ) : (
          filteredPosts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onSave={handleSave}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onComment={handleComment}
              onDeleteComment={handleDeleteComment}
              currentUserId={user.id}
              index={i}
            />
          ))
        )}
      </div>
    </div>
  );
}
