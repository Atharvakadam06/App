import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark,
  X, Paperclip, Download, Send, MoreHorizontal,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePostLike } from '../context/PostLikeContext';
import { usePostSave } from '../context/PostSaveContext';
import {
  getAllPostsWithDetails, likePost, savePost,
  addComment, getPostComments, getUser
} from '../services/data';
import { formatTimeAgo } from '../utils/timeUtils';
import { handleAvatarError } from '../utils/avatarUtils';

/* ══════════════════════════════════════════════
   COMMENT BOTTOM SHEET
══════════════════════════════════════════════ */
function CommentSheet({ post, currentUser, onClose, onAddComment }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const topComments = useMemo(() =>
    (post.comments || []).filter(c => !c.parentId),
    [post.comments]
  );

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const send = () => {
    if (!text.trim()) return;
    onAddComment(post.id, text.trim());
    setText('');
  };

  return (
    <div
      className="fixed inset-0 z-[80]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col"
        style={{
          maxHeight: '70dvh',
          borderRadius: '20px 20px 0 0',
          background: '#111318',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600 }}>
            {post.comments?.length || 0} {(post.comments?.length || 0) === 1 ? 'Comment' : 'Comments'}
          </p>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ minHeight: 0 }}>
          {topComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <MessageCircle style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.2)' }} />
              </div>
              <div className="text-center">
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500 }}>No comments yet</p>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 3 }}>Start the conversation</p>
              </div>
            </div>
          ) : (
            topComments.map(c => (
              <div key={c.id} className="flex gap-3 items-start">
                {c.avatar ? (
                  <img src={c.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={(e) => handleAvatarError(e, c.name)} />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700
                  }}>{c.name?.[0]}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, marginRight: 6 }}>{c.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.68)', fontWeight: 400 }}>{c.text}</span>
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4 }}>{formatTimeAgo(c.timestamp)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={(e) => handleAvatarError(e, currentUser?.name)} />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700
            }}>{currentUser?.name?.[0]}</div>
          )}
          <div
            className="flex-1 flex items-center gap-2"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 99,
              padding: '8px 16px',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Add a comment…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'rgba(255,255,255,0.85)', fontSize: 13,
                caretColor: 'white',
              }}
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              style={{
                border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                color: text.trim() ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                transition: 'color 0.15s',
                display: 'flex', alignItems: 'center',
              }}
            >
              <Send style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>

        {/* safe area */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SINGLE POST CARD
══════════════════════════════════════════════ */
function PostCard({ post, profileUser, currentUser, onLike, onSave, onShare, onOpenComments, cardRef }) {
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: '50%', y: '50%' });
  const lastTap = useRef(0);

  const handleTap = useCallback((e) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // double tap
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches?.[0] || e;
      setHeartPos({
        x: `${touch.clientX - rect.left}px`,
        y: `${touch.clientY - rect.top}px`,
      });
      if (!post.liked) onLike(post.id);
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 900);
    }
    lastTap.current = now;
  }, [post.liked, post.id, onLike]);

  const commentCount = post.comments?.length || 0;

  return (
    <div
      ref={cardRef}
      style={{ height: '100dvh', scrollSnapAlign: 'start', flexShrink: 0, position: 'relative', background: '#000' }}
    >
      {/* ── MEDIA ── */}
      <div
        className="absolute inset-0"
        onClick={handleTap}
        onTouchStart={handleTap}
      >
        {post.image ? (
          <>
            {/* ambient blurred bg */}
            <div
              style={{
                position: 'absolute', inset: -20,
                backgroundImage: `url(${post.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(40px) brightness(0.25) saturate(1.4)',
                transform: 'scale(1.1)',
              }}
            />
            <img
              src={post.image}
              alt=""
              loading="lazy"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'contain',
                zIndex: 1,
              }}
            />
          </>
        ) : post.file_url ? (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(160deg, #0c1020 0%, #111827 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Paperclip style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.5)' }} />
            </div>
            <div style={{ textAlign: 'center', padding: '0 40px' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 500 }}>{post.file_name || 'Document'}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 6 }}>Shared resource</p>
            </div>
            <a
              href={post.file_url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 99,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
            >
              <Download style={{ width: 14, height: 14 }} /> Download
            </a>
          </div>
        ) : (
          /* Text-only */
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(160deg, #0a0d17 0%, #0f1623 50%, #0a0e18 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '60px 40px',
          }}>
            {/* Subtle grid decoration */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.03,
              backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 340 }}>
              <p style={{
                color: 'rgba(255,255,255,0.06)',
                fontSize: 120, fontFamily: 'Georgia, serif',
                lineHeight: 0.8, position: 'absolute', top: -40, left: -20,
                userSelect: 'none', pointerEvents: 'none',
              }}>"</p>
              <p style={{
                color: 'rgba(255,255,255,0.88)', fontSize: 20, fontWeight: 400,
                lineHeight: 1.65, letterSpacing: '-0.01em',
              }}>
                {post.content}
              </p>
            </div>
          </div>
        )}

        {/* Double-tap heart animation */}
        {showHeartPop && (
          <div style={{
            position: 'absolute', left: heartPos.x, top: heartPos.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 20, pointerEvents: 'none',
          }}>
            <Heart
              fill="white"
              style={{
                width: 72, height: 72, color: 'white',
                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4))',
                animation: 'postHeartPop 0.85s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
              }}
            />
          </div>
        )}
      </div>

      {/* ── BOTTOM GRADIENT ── */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
          height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── POST INFO (bottom-left) ── */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 80, zIndex: 10,
          padding: '0 20px 28px',
        }}
      >
        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {profileUser?.avatar ? (
            <img
              src={profileUser.avatar} alt=""
              style={{
                width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
                border: '1.5px solid rgba(255,255,255,0.3)',
              }}
            />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.1)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 13, fontWeight: 700,
            }}>{profileUser?.name?.[0]}</div>
          )}
          <div>
            <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
              {profileUser?.name}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 1 }}>
              {formatTimeAgo(post.timestamp)}
            </p>
          </div>
          {post.category && (
            <span style={{
              padding: '2px 8px', borderRadius: 99,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600,
              textTransform: 'capitalize', letterSpacing: '0.03em',
            }}>{post.category}</span>
          )}
        </div>

        {/* Caption */}
        {(post.image || post.file_url) && post.content && (
          <p style={{
            color: 'rgba(255,255,255,0.75)', fontSize: 13,
            lineHeight: 1.55, marginBottom: 8,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginRight: 6 }}>
              {profileUser?.name?.split(' ')[0]}
            </span>
            {post.content}
          </p>
        )}

        {/* Comment preview */}
        {commentCount > 0 && (
          <button
            onClick={() => onOpenComments(post)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'left',
            }}
          >
            View all {commentCount} comment{commentCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* ── ACTION RAIL (bottom-right) ── */}
      <div
        style={{
          position: 'absolute', bottom: 20, right: 16, zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
        }}
      >
        {/* Like */}
        <ActionBtn
          onClick={() => onLike(post.id)}
          icon={<Heart style={{ width: 22, height: 22 }} fill={post.liked ? 'currentColor' : 'none'} />}
          label={post.likes || 0}
          active={post.liked}
          activeColor="#ff4d6d"
        />

        {/* Comment */}
        <ActionBtn
          onClick={() => onOpenComments(post)}
          icon={<MessageCircle style={{ width: 22, height: 22 }} />}
          label={commentCount}
        />

        {/* Save */}
        <ActionBtn
          onClick={() => onSave(post.id)}
          icon={<Bookmark style={{ width: 22, height: 22 }} fill={post.saved ? 'currentColor' : 'none'} />}
          active={post.saved}
          activeColor="#f59e0b"
        />

        {/* Share */}
        <ActionBtn
          onClick={() => onShare(post)}
          icon={<Share2 style={{ width: 20, height: 20 }} />}
        />
      </div>
    </div>
  );
}

/* ── Reusable icon action button ── */
function ActionBtn({ onClick, icon, label, active = false, activeColor = 'white' }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        color: active ? activeColor : 'rgba(255,255,255,0.85)',
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1), color 0.15s',
        filter: active ? 'drop-shadow(0 0 8px currentColor)' : 'none',
      }}
    >
      {icon}
      {label !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.01em' }}>
          {label}
        </span>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function PostViewer() {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const { toggleLike, getLikeState } = usePostLike();
  const { toggleSave, getSaveState } = usePostSave();

  const startPostId = location.state?.postId;
  const passedPosts = location.state?.posts;
  const passedProfileUser = location.state?.profileUser;

  const [posts, setPosts] = useState(passedPosts || []);
  const [profileUser, setProfileUser] = useState(passedProfileUser || null);
  const [loading, setLoading] = useState(!passedPosts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentPost, setCommentPost] = useState(null); // post whose comments are open
  const containerRef = useRef(null);
  const cardRefs = useRef([]);

  /* ── Load if not passed ── */
  useEffect(() => {
    if (passedPosts && passedProfileUser) { setLoading(false); return; }
    const load = async () => {
      try {
        const targetId = userId || currentUser?.id;
        if (!targetId) return;
        const [allPosts, user] = await Promise.all([
          getAllPostsWithDetails(currentUser?.id),
          getUser(targetId),
        ]);
        const userPosts = allPosts
          .filter(p => p.userId === targetId)
          .map(p => ({
            ...p,
            liked: getLikeState(p.id).liked ?? p.liked,
            likes: getLikeState(p.id).likes ?? p.likes,
            saved: getSaveState(p.id) ?? p.saved,
          }));
        setPosts(userPosts);
        setProfileUser(user);
      } catch (e) {
        console.warn('PostViewer load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Jump to starting post ── */
  useEffect(() => {
    if (!startPostId || posts.length === 0) return;
    const idx = posts.findIndex(p => p.id === startPostId);
    if (idx >= 0) {
      requestAnimationFrame(() => {
        cardRefs.current[idx]?.scrollIntoView({ behavior: 'instant', block: 'start' });
        setCurrentIndex(idx);
      });
    }
  }, [startPostId, posts]);

  /* ── IntersectionObserver to track current card ── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = cardRefs.current.indexOf(entry.target);
            if (idx >= 0) setCurrentIndex(idx);
          }
        });
      },
      { threshold: 0.6 }
    );
    cardRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [posts]);

  /* ── Actions ── */
  const handleLike = useCallback(async (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !currentUser?.id) return;
    await likePost(postId, currentUser.id);
    const result = await toggleLike(postId, currentUser.id, post.liked || false, post.likes || 0);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: result.liked, likes: result.likes } : p));
    setCommentPost(prev => prev?.id === postId ? { ...prev, liked: result.liked, likes: result.likes } : prev);
  }, [posts, currentUser, toggleLike]);

  const handleSave = useCallback(async (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !currentUser?.id) return;
    const newSaved = await toggleSave(postId, currentUser.id, post.saved || false);
    await savePost(postId, currentUser.id);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: newSaved } : p));
  }, [posts, currentUser, toggleSave]);

  const handleComment = useCallback(async (postId, text) => {
    if (!currentUser?.id || !text.trim()) return;
    try {
      await addComment(postId, currentUser.id, text);
      const comments = await getPostComments(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments } : p));
      setCommentPost(prev => prev?.id === postId ? { ...prev, comments } : prev);
    } catch (e) { console.warn('Comment error:', e); }
  }, [currentUser]);

  const handleShare = useCallback((post) => {
    const url = `${window.location.origin}/#/post/${post.id}`;
    if (navigator.share) navigator.share({ title: 'StuGrow', text: post.content, url });
    else { navigator.clipboard.writeText(url); addToast('Link copied', 'success'); }
  }, [addToast]);

  const openComments = useCallback(async (post) => {
    // Refresh comments before opening
    try {
      const comments = await getPostComments(post.id);
      const fresh = { ...post, comments };
      setCommentPost(fresh);
      setPosts(prev => prev.map(p => p.id === post.id ? fresh : p));
    } catch {
      setCommentPost(post);
    }
  }, []);

  /* ── Keyboard nav ── */
  useEffect(() => {
    const handler = (e) => {
      if (commentPost) { if (e.key === 'Escape') setCommentPost(null); return; }
      if (e.key === 'Escape') navigate(-1);
      if (e.key === 'ArrowDown') cardRefs.current[Math.min(currentIndex + 1, posts.length - 1)]?.scrollIntoView({ behavior: 'smooth' });
      if (e.key === 'ArrowUp') cardRefs.current[Math.max(currentIndex - 1, 0)]?.scrollIntoView({ behavior: 'smooth' });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, posts.length, navigate, commentPost]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.7)', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 50 }}>

      {/* ── Scroll container ── */}
      <div
        ref={containerRef}
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          overscrollBehavior: 'contain',
        }}
      >
        {posts.map((post, i) => (
          <PostCard
            key={post.id}
            post={post}
            profileUser={profileUser}
            currentUser={currentUser}
            onLike={handleLike}
            onSave={handleSave}
            onShare={handleShare}
            onOpenComments={openComments}
            cardRef={el => (cardRefs.current[i] = el)}
          />
        ))}
      </div>

      {/* ── Top bar: back + counter ── */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '52px 16px 16px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px 7px 10px',
            borderRadius: 99,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
            pointerEvents: 'auto',
            transition: 'background 0.15s',
          }}
        >
          <ArrowLeft style={{ width: 15, height: 15 }} />
          {profileUser?.name || 'Back'}
        </button>

        {/* Post counter */}
        {posts.length > 1 && (
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 99,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12, fontWeight: 500,
            }}
          >
            {currentIndex + 1} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span> {posts.length}
          </div>
        )}
      </div>

      {/* ── Side dot indicator ── */}
      {posts.length > 1 && posts.length <= 30 && (
        <div
          style={{
            position: 'fixed', right: 6, top: '50%', transform: 'translateY(-50%)',
            zIndex: 60, display: 'flex', flexDirection: 'column', gap: 5,
            alignItems: 'center',
          }}
        >
          {posts.map((_, i) => (
            <button
              key={i}
              onClick={() => cardRefs.current[i]?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                width: i === currentIndex ? 3 : 3,
                height: i === currentIndex ? 18 : 4,
                borderRadius: 99,
                backgroundColor: i === currentIndex
                  ? 'rgba(255,255,255,0.85)'
                  : 'rgba(255,255,255,0.22)',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Comments sheet ── */}
      {commentPost && (
        <CommentSheet
          post={commentPost}
          currentUser={currentUser}
          onClose={() => setCommentPost(null)}
          onAddComment={handleComment}
        />
      )}

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes postHeartPop {
          0%   { opacity: 1; transform: scale(0.3); }
          40%  { opacity: 1; transform: scale(1.3); }
          70%  { opacity: 0.9; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.25); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
