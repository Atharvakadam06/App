import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send,
  FileText, Trash2, Edit3, Flag, ZoomIn, Paperclip, Download, X,
  Sparkles, MessageSquare, HelpCircle, Calendar, Megaphone, BookOpen,
  Search, PenLine
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getAllPostsWithDetails, deletePost, updatePost, likePost, savePost,
  addComment, getPostComments, deleteComment, createReport
} from '../services/data';
import { usePostLike } from '../context/PostLikeContext';
import { matchSearch } from '../utils/searchUtils';
import { usePostSave } from '../context/PostSaveContext';
import { formatTimeAgo } from '../utils/timeUtils';
import ProfessionalSearch from '../components/ProfessionalSearch';
import { handleAvatarError } from '../utils/avatarUtils';

/* ─── Category filter pill data ─── */
const categories = [
  { id: null,           label: 'All',          icon: Sparkles     },
  { id: 'general',      label: 'General',      icon: MessageSquare },
  { id: 'question',     label: 'Questions',    icon: HelpCircle    },
  { id: 'event',        label: 'Events',       icon: Calendar      },
  { id: 'announcement', label: 'Announce',     icon: Megaphone     },
  { id: 'study',        label: 'Study',        icon: BookOpen      },
  { id: 'lost',         label: 'Lost & Found', icon: Search        },
];

/* ─── Skeleton loader ─── */
function SkeletonPost() {
  return (
    <article className="bg-white dark:bg-[#0e1322] border-b border-slate-100 dark:border-[#151a28] animate-pulse">
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full skeleton shrink-0" />
        <div className="flex-1">
          <div className="h-3 skeleton rounded w-28 mb-1.5" />
          <div className="h-2.5 skeleton rounded w-20" />
        </div>
      </div>
      {/* image */}
      <div className="w-full aspect-square skeleton" />
      {/* actions */}
      <div className="flex gap-3 px-4 pt-3 pb-2">
        <div className="h-7 w-16 skeleton rounded-full" />
        <div className="h-7 w-16 skeleton rounded-full" />
        <div className="h-7 w-16 skeleton rounded-full" />
      </div>
      <div className="px-4 pb-4">
        <div className="h-3 skeleton rounded w-3/4 mb-2" />
        <div className="h-3 skeleton rounded w-1/2" />
      </div>
    </article>
  );
}

/* ─── Empty feed placeholder ─── */
function EmptyFeed({ onCreatePost }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-slate-100/70 dark:bg-[#121826]/40 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center mb-5 shadow-sm shadow-slate-200/10 dark:shadow-none animate-float transition-all duration-500 hover:scale-105 hover:bg-slate-200/50 dark:hover:bg-[#161d2e] hover:border-slate-350 dark:hover:border-slate-700 group cursor-pointer" onClick={onCreatePost}>
        <PenLine className="w-8 h-8 text-slate-400 dark:text-slate-500 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
      </div>
      <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">No posts yet</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed">
        Be the first to share something with your campus community!
      </p>
    </div>
  );
}

/* ─── Individual Post Card ─── */
function PostCard({ post, onLike, onSave, onDelete, onComment, onDeleteComment, onUpdate, currentUserId, index }) {
  const [showMenu, setShowMenu]               = useState(false);
  const [showComments, setShowComments]       = useState(false);
  const [commentText, setCommentText]         = useState('');
  const [replyingTo, setReplyingTo]           = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingPost, setEditingPost]         = useState(false);
  const [editContent, setEditContent]         = useState(post.content);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  const lastTapRef      = useRef(0);
  const isAnimatingRef  = useRef(false);
  const menuRef         = useRef(null);
  const commentInputRef = useRef(null);

  const { user: currentUser } = useAuth();
  const isOwner = post.userId === currentUserId;
  const { addToast } = useToast();
  const navigate = useNavigate();

  /* Close menu on outside click */
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const triggerLikeAnimation = () => {
    setShowHeartOverlay(true);
    setIsLikeAnimating(true);
    setTimeout(() => { setShowHeartOverlay(false); setIsLikeAnimating(false); }, 900);
  };

  const doDoubleTap = () => {
    if (!currentUserId) return;
    if (!post.liked) onLike(post.id);
    triggerLikeAnimation();
  };

  const handleImageTap = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 380 && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      doDoubleTap();
      setTimeout(() => { isAnimatingRef.current = false; }, 900);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleLikeClick = () => {
    if (!currentUserId) return;
    onLike(post.id);
    if (!post.liked) {
      setIsLikeAnimating(true);
      setTimeout(() => setIsLikeAnimating(false), 600);
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'StuGrow', text: post.content, url: postUrl }); } catch { /* ignore */ }
    } else {
      await navigator.clipboard.writeText(`${post.content}\n\n${postUrl}`);
      addToast('Link copied to clipboard', 'success');
    }
    setShowMenu(false);
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

  const topLevelComments = useMemo(() => {
    return (post.comments || []).filter(c => !c.parentId);
  }, [post.comments]);

  const getRepliesForComment = (commentId) => {
    return (post.comments || []).filter(c => c.parentId === commentId);
  };

  const handleReplyClick = (comment) => {
    setReplyingTo(comment);
    setExpandedReplies(prev => ({ ...prev, [comment.id]: true }));
    const tag = `@${comment.name?.split(' ')[0]} `;
    if (!commentText.startsWith(tag)) {
      setCommentText(prev => prev.trim() ? `${tag}${prev}` : tag);
    }
    commentInputRef.current?.focus();
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText, replyingTo?.id);
    if (replyingTo?.id) {
      setExpandedReplies(prev => ({ ...prev, [replyingTo.id]: true }));
    }
    setCommentText('');
    setReplyingTo(null);
  };

  const handleProfileClick = () => {
    if (post.userId === currentUserId) navigate('/profile');
    else navigate(`/profile/${post.userId}`);
  };

  /* Category badge colour */
  const catColour = {
    general: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    question: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    event: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    announcement: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    study: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    lost: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  }[post.category] || '';

  const CAPTION_LIMIT = 120;
  const captionLong   = post.content && post.content.length > CAPTION_LIMIT;

  return (
    <article
      className="bg-white dark:bg-[#0a0d17] border-b border-slate-100/80 dark:border-white/[0.04] animate-reveal-up"
      style={{ animationDelay: `${Math.min(index * 0.05, 0.35)}s` }}
    >
      {/* ── Post Header ── */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3">
        <button onClick={handleProfileClick} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70 transition-opacity">
          {/* Clean avatar — no ring */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 bg-slate-100 dark:bg-slate-800">
            {post.user?.avatar ? (
              <img src={post.user.avatar} alt="" className="w-full h-full object-cover" onError={(e) => handleAvatarError(e, post.user?.name)} />
            ) : (
              <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <span className="text-slate-600 dark:text-slate-300 text-sm font-bold">{post.user?.name?.charAt(0)}</span>
              </div>
            )}
          </div>
          {/* Name + college */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13.5px] font-bold text-slate-900 dark:text-white truncate leading-tight">{post.user?.name}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
              {post.user?.college || 'StuGrow'} · {formatTimeAgo(post.timestamp)}
            </p>
          </div>
        </button>

        {/* Category chip (only if not general/null) */}
        {post.category && post.category !== 'general' && (
          <span className={`hidden sm:inline-flex text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mr-1 ${catColour}`}>
            {post.category}
          </span>
        )}

        {/* ··· menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/5 active:scale-90 transition-all"
          >
            <MoreHorizontal className="w-5 h-5 text-slate-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-11 bg-white dark:bg-[#0c1018] rounded-2xl shadow-2xl border border-slate-100 dark:border-[#151a28] p-1.5 z-30 min-w-[168px] animate-scale-in">
              <button onClick={handleShare} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                <Share2 className="w-4 h-4 shrink-0 text-slate-400" /> Share
              </button>
              {post.image && !isOwner && (
                <button onClick={() => { setShowImageLightbox(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <ZoomIn className="w-4 h-4 shrink-0 text-slate-400" /> View image
                </button>
              )}
              {isOwner && (
                <>
                  <button onClick={() => { setEditingPost(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                    <Edit3 className="w-4 h-4 shrink-0 text-slate-400" /> Edit post
                  </button>
                  <button onClick={() => { onDelete(post.id); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4 shrink-0" /> Delete
                  </button>
                </>
              )}
              {!isOwner && (
                <button onClick={() => { setShowReportModal(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors">
                  <Flag className="w-4 h-4 shrink-0" /> Report
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Media: Image ── */}
      {post.image && (
        <div
          className="relative w-full overflow-hidden bg-slate-50 dark:bg-slate-900 cursor-pointer select-none"
          onDoubleClick={handleImageTap}
          onClick={handleImageTap}
        >
          <img
            src={post.image}
            alt=""
            loading="lazy"
            onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
            className="w-full object-cover"
            style={{ maxHeight: '75vw', minHeight: '180px', objectFit: 'cover', display: 'block' }}
          />
          {/* Double-tap heart overlay */}
          {showHeartOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-2xl animate-elegant-heart" />
            </div>
          )}
        </div>
      )}

      {/* ── Video ── */}
      {post.video && (
        <div className="bg-black">
          <video src={post.video} controls playsInline className="w-full max-h-[560px]" />
        </div>
      )}

      {/* ── Text-only gradient card (no image) ── */}
      {!post.image && !post.video && post.content && (
        <div className="mx-3 sm:mx-4 rounded-2xl overflow-hidden mb-0.5">
          <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-5 py-8 sm:py-10 text-white text-center min-h-[140px] flex items-center justify-center">
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 0%, transparent 60%)'}} />
            <p className="text-lg sm:text-xl font-bold leading-snug z-10 relative line-clamp-6">{post.content}</p>
          </div>
        </div>
      )}

      {/* ── File attachment ── */}
      {post.file_url && (
        <div className="px-3 sm:px-4 pt-2">
          <a
            href={post.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-[#0c1018] border border-slate-100 dark:border-[#1a2035] rounded-2xl hover:bg-slate-100 dark:hover:bg-[#101624] transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Paperclip className="w-5 h-5 text-blue-500 group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                {post.file_name || 'Attached File'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Tap to download</p>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
          </a>
        </div>
      )}

      {/* ── Action Bar (Instagram layout) ── */}
      <div className="flex items-center justify-between px-3 sm:px-4 pt-2.5 pb-1">
        {/* Left: Like · Comment · Share */}
        <div className="flex items-center gap-1">
          {/* Like */}
          <button
            onClick={handleLikeClick}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl active:scale-90 transition-transform"
          >
            <Heart
              className={`w-[22px] h-[22px] transition-all duration-300 ${
                post.liked
                  ? 'text-rose-500 fill-rose-500 scale-110'
                  : 'text-slate-700 dark:text-slate-300'
              } ${isLikeAnimating ? 'animate-like-pop' : ''}`}
            />
            <span className={`text-[13px] font-bold tabular-nums transition-colors ${post.liked ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
              {post.likes || 0}
            </span>
          </button>

          {/* Comment */}
          <button
            onClick={() => {
              setShowComments(prev => {
                const next = !prev;
                if (next) setTimeout(() => commentInputRef.current?.focus(), 150);
                return next;
              });
            }}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl active:scale-90 transition-transform"
          >
            <MessageCircle className={`w-[22px] h-[22px] transition-colors ${showComments ? 'text-blue-500' : 'text-slate-700 dark:text-slate-300'}`} />
            <span className={`text-[13px] font-bold tabular-nums ${showComments ? 'text-blue-500' : 'text-slate-700 dark:text-slate-200'}`}>
              {post.comments?.length || 0}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl active:scale-90 transition-transform"
          >
            <Share2 className="w-[21px] h-[21px] text-slate-700 dark:text-slate-300" />
          </button>
        </div>

        {/* Right: Save */}
        <button
          onClick={() => onSave(post.id)}
          className="px-2.5 py-2 rounded-xl active:scale-90 transition-transform"
        >
          <Bookmark
            className={`w-[22px] h-[22px] transition-all duration-300 ${
              post.saved ? 'text-amber-500 fill-amber-500' : 'text-slate-700 dark:text-slate-300'
            }`}
          />
        </button>
      </div>

      {/* ── Caption & tags (below actions, like Instagram) ── */}
      <div className="px-3 sm:px-4 pb-3">
        {/* Likes summary */}
        {(post.likes || 0) > 0 && (
          <p className="text-[13px] font-bold text-slate-900 dark:text-white mb-1">
            {post.likes} {post.likes === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Caption — show for image/video posts */}
        {(post.image || post.video) && post.content && (
          <p className="text-[13.5px] text-slate-800 dark:text-slate-200 leading-snug">
            <span className="font-bold text-slate-900 dark:text-white mr-1.5 cursor-pointer" onClick={handleProfileClick}>
              {post.user?.name?.split(' ')[0]}
            </span>
            {editingPost ? null : (
              <>
                {captionLong && !showFullCaption
                  ? <>{post.content.slice(0, CAPTION_LIMIT)}<button onClick={() => setShowFullCaption(true)} className="text-slate-400 ml-1 font-semibold">... more</button></>
                  : post.content
                }
              </>
            )}
          </p>
        )}

        {/* Editing state */}
        {editingPost && (
          <div className="mt-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="input-field resize-none min-h-[80px] text-sm w-full"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleEdit} className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors active:scale-95">Save</button>
              <button onClick={() => { setEditingPost(false); setEditContent(post.content); }} className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {post.tags.map(tag => (
              <span key={tag} className="text-[13px] font-semibold text-blue-500 hover:text-blue-600 cursor-pointer">{`#${tag}`}</span>
            ))}
          </div>
        )}

        {/* View all comments link */}
        {!showComments && post.comments && post.comments.length > 0 && (
          <button
            onClick={() => setShowComments(true)}
            className="mt-1.5 text-[13px] text-slate-400 dark:text-slate-500 font-medium hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            View all {post.comments.length} comments
          </button>
        )}

        {/* Timestamp */}
        <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1 uppercase tracking-wider font-medium">
          {formatTimeAgo(post.timestamp)}
        </p>
      </div>

      {/* ── Comments Section ── */}
      {showComments && (
        <div className="border-t border-slate-100 dark:border-white/[0.04] px-3 sm:px-4 pt-3 pb-4 animate-slide-down">
          {/* Replying indicator */}
          {replyingTo && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/40 dark:border-blue-900/20 text-[11.5px] text-slate-500 dark:text-slate-400 rounded-2xl mb-2.5 animate-fade-in">
              <span>Replying to <span className="font-bold text-blue-500">@{replyingTo.name}</span></span>
              <button onClick={() => setReplyingTo(null)} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Comment input */}
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="relative shrink-0">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-white/10">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-xs font-black">
                      {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-full px-4 py-2.5">
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                placeholder={replyingTo ? `Reply to @${replyingTo.name?.split(' ')[0]}…` : "Add a comment…"}
                className="flex-1 bg-transparent text-[13.5px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="text-[13px] font-black text-blue-500 disabled:opacity-30 hover:text-blue-600 transition-colors active:scale-90"
              >
                Post
              </button>
            </div>
          </div>

          {/* Comments list */}
          {topLevelComments && topLevelComments.length > 0 && (
            <div className="space-y-3.5">
              {topLevelComments.map((c) => {
                const replies = getRepliesForComment(c.id);
                return (
                  <div key={c.id} className="animate-fade-in space-y-2.5">
                    {/* Top Level Comment */}
                    <div className="flex gap-2.5">
                      <img src={c.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-100 dark:border-white/10 mt-0.5" onError={(e) => handleAvatarError(e, c.name)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-[13px] text-slate-800 dark:text-slate-200 leading-snug">
                            <span className="font-bold mr-1.5">{c.name}</span>
                            {c.text}
                          </p>
                          {c.userId === currentUserId && (
                            <button onClick={() => onDeleteComment(post.id, c.id)} className="shrink-0 p-0.5 text-slate-300 hover:text-rose-400 transition-colors active:scale-90">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">{formatTimeAgo(c.timestamp)}</span>
                          <button
                            onClick={() => handleReplyClick(c)}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors active:scale-90"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies (Nested & Indented) */}
                    {replies.length > 0 && (
                      <div className="pl-9 space-y-2 mt-1">
                        <button
                          onClick={() => toggleReplies(c.id)}
                          className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-305 transition-colors active:scale-95"
                        >
                          <span className="w-4 h-px bg-slate-200 dark:bg-slate-800" />
                          {expandedReplies[c.id] ? 'Hide replies' : `View replies (${replies.length})`}
                        </button>

                        {expandedReplies[c.id] && (
                          <div className="space-y-3 border-l border-slate-100 dark:border-white/[0.05] pl-3.5 ml-2 mt-2.5 animate-fade-in">
                            {replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2.5 animate-fade-in">
                                <img src={reply.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-100 dark:border-white/10 mt-0.5" onError={(e) => handleAvatarError(e, reply.name)} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="text-[12.5px] text-slate-800 dark:text-slate-200 leading-snug">
                                      <span className="font-bold mr-1.5">{reply.name}</span>
                                      {reply.text}
                                    </p>
                                    {reply.userId === currentUserId && (
                                      <button onClick={() => onDeleteComment(post.id, reply.id)} className="shrink-0 p-0.5 text-slate-300 hover:text-rose-400 transition-colors active:scale-90">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-[10px] text-slate-400 font-medium">{formatTimeAgo(reply.timestamp)}</span>
                                    <button
                                      onClick={() => handleReplyClick(c)}
                                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors active:scale-90"
                                    >
                                      Reply
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Image Lightbox ── */}
      {showImageLightbox && post.image && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setShowImageLightbox(false)}>
          <button onClick={() => setShowImageLightbox(false)} className="absolute top-4 right-4 p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-90 z-10">
            <X className="w-6 h-6 text-white" />
          </button>
          <img src={post.image} alt="" className="max-w-[95vw] max-h-[92vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* ── Report Modal ── */}
      {showReportModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowReportModal(false)}>
          <div className="card p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Report Post</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Why are you reporting this post?</p>
            {['Spam or misleading', 'Inappropriate content', 'Harassment or bullying', 'False information', 'Other'].map(reason => (
              <button key={reason} onClick={() => handleReport(reason)} className="w-full text-left px-4 py-3 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-1 font-medium">
                {reason}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

/* ─── Main Feed component ─── */
export default function Feed() {
  const { user } = useAuth();
  const { likeMap, likesCountMap, toggleLike, syncAllPosts } = usePostLike();
  const { savedMap, toggleSave, syncAllPosts: syncAllSaves } = usePostSave();
  const [loading, setLoading]           = useState(true);
  const [allPosts, setAllPosts]         = useState([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchOpen, setSearchOpen]     = useState(false);
  const searchRef = useRef(null);
  const catRef    = useRef(null);

  // Poll for live likes and post details updates every 1.5 seconds
  useEffect(() => {
    if (!user?.id) return;
    loadPosts();
    const interval = setInterval(() => {
      loadPosts();
    }, 1500);
    return () => clearInterval(interval);
  }, [user?.id]);

  /* Drag-to-scroll on category strip */
  useEffect(() => {
    const el = catRef.current;
    if (!el) return;
    let isDown = false, startX = 0, scrollLeft = 0, isDragging = false;
    const onMouseDown = (e) => { isDown = true; isDragging = false; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; };
    const onMouseUp   = () => { isDown = false; };
    const onMouseMove = (e) => {
      if (!isDown) return;
      const walk = (e.pageX - el.offsetLeft - startX) * 1.5;
      if (Math.abs(walk) > 5) isDragging = true;
      el.scrollLeft = scrollLeft - walk;
    };
    const onClickCapture = (e) => { if (isDragging) { e.preventDefault(); e.stopPropagation(); } };
    const onWheel = (e) => { if (e.deltaY !== 0) { e.preventDefault(); el.scrollLeft += e.deltaY; } };
    el.addEventListener('mousedown',  onMouseDown);
    el.addEventListener('mouseup',    onMouseUp);
    el.addEventListener('mouseleave', onMouseUp);
    el.addEventListener('mousemove',  onMouseMove);
    el.addEventListener('click',      onClickCapture, true);
    el.addEventListener('wheel',      onWheel, { passive: false });
    return () => {
      el.removeEventListener('mousedown',  onMouseDown);
      el.removeEventListener('mouseup',    onMouseUp);
      el.removeEventListener('mouseleave', onMouseUp);
      el.removeEventListener('mousemove',  onMouseMove);
      el.removeEventListener('click',      onClickCapture, true);
      el.removeEventListener('wheel',      onWheel);
    };
  }, []);

  const loadPosts = async () => {
    try {
      const posts = await getAllPostsWithDetails(user?.id);
      setAllPosts(posts);
      
      // Update global context cache maps in background
      if (user?.id) {
        syncAllPosts(user.id).catch(console.warn);
        syncAllSaves(user.id).catch(console.warn);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = useMemo(() => {
    let list = allPosts;
    if (searchQuery) {
      list = list.filter(p => matchSearch(p.content, searchQuery) || matchSearch(p.user?.name, searchQuery));
    }
    if (activeCategory) list = list.filter(p => p.category === activeCategory);
    return list;
  }, [allPosts, searchQuery, activeCategory]);

  const handleLike = async (postId) => {
    if (!user?.id) return;
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    const wasLiked = post.liked || false;
    const newLiked = !wasLiked;
    const newLikes = newLiked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1);
    
    // 1. Optimistic update (instant response in UI)
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: newLiked, likes: newLikes } : p));
    
    // 2. Perform database write & context updates in background
    try {
      await likePost(postId, user.id);
      await toggleLike(postId, user.id, wasLiked, post.likes || 0);
    } catch (e) {
      console.error('Failed to save like:', e);
      // Revert state on failure
      setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: wasLiked, likes: post.likes } : p));
      addToast('Failed to like post. Please try again.', 'error');
    }
  };

  const handleSave = async (postId) => {
    if (!user?.id) return;
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    const wasSaved = post.saved || false;
    const newSaved = !wasSaved;
    
    // 1. Optimistic update
    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: newSaved } : p));
    
    // 2. Perform database write & context updates in background
    try {
      await savePost(postId, user.id);
      await toggleSave(postId, user.id, wasSaved);
    } catch (e) {
      console.error('Failed to save post:', e);
      // Revert state on failure
      setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: wasSaved } : p));
      addToast('Failed to save post. Please try again.', 'error');
    }
  };

  const handleDelete         = async (id) => { await deletePost(id); setAllPosts(prev => prev.filter(p => p.id !== id)); };
  const handleUpdate         = async (id, c) => { await updatePost(id, c); setAllPosts(prev => prev.map(p => p.id === id ? { ...p, content: c } : p)); };
  const handleComment        = async (id, t, parentId = null) => { await addComment(id, user.id, t, parentId); const comments = await getPostComments(id); setAllPosts(prev => prev.map(p => p.id === id ? { ...p, comments } : p)); };
  const handleDeleteComment  = async (id, cid) => { await deleteComment(cid); const comments = await getPostComments(id); setAllPosts(prev => prev.map(p => p.id === id ? { ...p, comments } : p)); };

  return (
    <div className="feed-root">
      {/* ── Mobile: Feed title ── */}
      <div className="lg:hidden px-4 pt-4 pb-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Feed</h2>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 font-medium mt-1.5">What's happening on campus</p>
          </div>
        </div>
      </div>

      {/* ── Posts ── */}
      {loading ? (
        <div className="max-w-2xl mx-auto lg:mt-2">
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="max-w-2xl mx-auto">
          <EmptyFeed />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto lg:py-2 lg:space-y-4">
          {filteredPosts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onSave={handleSave}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onComment={handleComment}
              onDeleteComment={handleDeleteComment}
              currentUserId={user?.id}
              index={i}
            />
          ))}
          {/* Bottom padding for mobile nav */}
          <div className="h-6 lg:hidden" />
        </div>
      )}
    </div>
  );
}
