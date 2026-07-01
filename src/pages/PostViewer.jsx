import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark,
  MoreHorizontal, Paperclip, Download, Send, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePostLike } from '../context/PostLikeContext';
import { usePostSave } from '../context/PostSaveContext';
import {
  getAllPostsWithDetails, likePost, savePost,
  addComment, getPostComments, getUser,
} from '../services/data';
import { formatTimeAgo } from '../utils/timeUtils';
import { handleAvatarError } from '../utils/avatarUtils';

/* ═══════════════════════════════════════════════════
   AVATAR
═══════════════════════════════════════════════════ */
function Av({ src, name, size = 32 }) {
  if (src) {
    return (
      <img
        src={src} alt=""
        onError={e => handleAvatarError(e, name)}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          background: '#222',
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#2c2c2e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700,
      color: 'rgba(255,255,255,0.65)',
      letterSpacing: '-0.01em',
    }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   INLINE COMMENT SHEET  (slides up inside the page)
═══════════════════════════════════════════════════ */
function CommentSheet({ post, currentUser, onClose, onSend }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const comments = useMemo(() =>
    (post.comments || []).filter(c => !c.parentId), [post.comments]);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 150); }, []);

  const send = () => {
    if (!text.trim()) return;
    onSend(post.id, text.trim());
    setText('');
  };

  return (
    <div
      className="pv-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="pv-sheet"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="pv-sheet-handle" />

        {/* Header */}
        <div className="pv-sheet-header">
          <span className="pv-sheet-title">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
          <button className="pv-sheet-close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* List */}
        <div className="pv-sheet-list">
          {comments.length === 0 ? (
            <div className="pv-no-comments">
              <MessageCircle size={28} style={{ opacity: 0.25, marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>No comments yet</p>
            </div>
          ) : comments.map(c => (
            <div key={c.id} className="pv-comment-row">
              <Av src={c.avatar} name={c.name} size={30} />
              <div className="pv-comment-body">
                <p className="pv-comment-text">
                  <span className="pv-comment-name">{c.name}</span>
                  {c.text}
                </p>
                <p className="pv-comment-time">{formatTimeAgo(c.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="pv-sheet-input-row">
          <Av src={currentUser?.avatar} name={currentUser?.name} size={30} />
          <div className="pv-sheet-input-wrap">
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Add a comment…"
              className="pv-sheet-input"
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              className="pv-sheet-post-btn"
              style={{ opacity: text.trim() ? 1 : 0.35 }}
            >
              Post
            </button>
          </div>
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 12px)' }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SINGLE POST CARD  (Instagram-style)
═══════════════════════════════════════════════════ */
function PostCard({ post, profileUser, currentUser, onLike, onSave, onShare, onOpenComments }) {
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: '50%', y: '50%' });
  const [expanded, setExpanded] = useState(false);
  const lastTap = useRef(0);

  const caption = post.content || '';
  const CAPTION_LIMIT = 125;
  const captionLong = caption.length > CAPTION_LIMIT;

  const comments = useMemo(() =>
    (post.comments || []).filter(c => !c.parentId), [post.comments]);

  const handleDoubleTap = useCallback((e) => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
      const cy = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
      setHeartPos({ x: `${cx}px`, y: `${cy}px` });
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
      if (!post.liked) onLike(post.id);
    }
    lastTap.current = now;
  }, [post.liked, post.id, onLike]);

  return (
    <article className="pv-card">

      {/* ── HEADER ── */}
      <div className="pv-card-header">
        <div className="pv-card-header-left">
          <Av src={profileUser?.avatar} name={profileUser?.name} size={36} />
          <div className="pv-card-author">
            <p className="pv-author-name">{profileUser?.name}</p>
            <p className="pv-author-sub">
              {profileUser?.college || 'StuGrow'}
              {post.category && post.category !== 'general' ? ` · ${post.category}` : ''}
            </p>
          </div>
        </div>
        <button className="pv-more-btn">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* ── MEDIA ── */}
      <div
        className="pv-media-wrap"
        onClick={handleDoubleTap}
        onTouchStart={handleDoubleTap}
      >
        {post.image ? (
          <img
            src={post.image}
            alt=""
            loading="lazy"
            className="pv-media-img"
          />
        ) : post.file_url ? (
          <div className="pv-file-block">
            <div className="pv-file-icon">
              <Paperclip size={22} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </div>
            <p className="pv-file-name">{post.file_name || 'Document'}</p>
            <p className="pv-file-sub">Shared resource</p>
            <a
              href={post.file_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="pv-file-dl"
            >
              <Download size={13} /> Download
            </a>
          </div>
        ) : (
          <div className="pv-text-block">
            <p className="pv-text-quote">"</p>
            <p className="pv-text-content">{caption}</p>
          </div>
        )}

        {/* Double-tap heart */}
        {showHeart && (
          <div
            className="pv-heart-pop"
            style={{ left: heartPos.x, top: heartPos.y }}
          >
            <Heart fill="white" className="pv-heart-icon" />
          </div>
        )}
      </div>

      {/* ── ACTIONS ── */}
      <div className="pv-actions">
        <div className="pv-actions-left">
          <HeartBtn liked={post.liked} onClick={() => onLike(post.id)} />
          <button className="pv-action-btn" onClick={() => onOpenComments(post)}>
            <MessageCircle size={23} />
          </button>
          <button className="pv-action-btn" onClick={() => onShare(post)}>
            <Share2 size={21} />
          </button>
        </div>
        <SaveBtn saved={post.saved} onClick={() => onSave(post.id)} />
      </div>

      {/* ── LIKES ── */}
      {(post.likes || 0) > 0 && (
        <div className="pv-likes">
          {post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}
        </div>
      )}

      {/* ── CAPTION ── */}
      {(post.image || post.file_url) && caption ? (
        <div className="pv-caption">
          <span className="pv-caption-name">{profileUser?.name?.split(' ')[0]}</span>
          {expanded || !captionLong ? (
            <span className="pv-caption-text">{caption}</span>
          ) : (
            <>
              <span className="pv-caption-text">{caption.slice(0, CAPTION_LIMIT)}… </span>
              <button className="pv-more-text" onClick={() => setExpanded(true)}>more</button>
            </>
          )}
        </div>
      ) : null}

      {/* ── COMMENTS PREVIEW ── */}
      {comments.length > 0 && (
        <button className="pv-view-comments" onClick={() => onOpenComments(post)}>
          View all {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </button>
      )}

      {/* ── TOP COMMENT PREVIEW ── */}
      {comments.length > 0 && (
        <div className="pv-comment-preview">
          <span className="pv-caption-name">{comments[0].name}</span>
          <span className="pv-caption-text"> {comments[0].text}</span>
        </div>
      )}

      {/* ── TIMESTAMP ── */}
      <div className="pv-timestamp">{formatTimeAgo(post.timestamp)}</div>

      {/* ── INLINE COMMENT INPUT ── */}
      <div className="pv-inline-input-row">
        <Av src={currentUser?.avatar} name={currentUser?.name} size={28} />
        <button
          className="pv-inline-input-fake"
          onClick={() => onOpenComments(post)}
        >
          Add a comment…
        </button>
        <button className="pv-emoji-btn">😊</button>
      </div>
    </article>
  );
}

/* Animated heart button */
function HeartBtn({ liked, onClick }) {
  const [burst, setBurst] = useState(false);
  const handle = () => {
    setBurst(true);
    setTimeout(() => setBurst(false), 450);
    onClick();
  };
  return (
    <button
      className="pv-action-btn"
      onClick={handle}
      style={{ color: liked ? '#ef4444' : undefined }}
    >
      <Heart
        size={23}
        fill={liked ? 'currentColor' : 'none'}
        style={{
          transform: burst ? 'scale(1.35)' : 'scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), color 0.12s',
          filter: liked ? 'drop-shadow(0 0 6px #ef444499)' : 'none',
        }}
      />
    </button>
  );
}

/* Animated bookmark button */
function SaveBtn({ saved, onClick }) {
  return (
    <button
      className="pv-action-btn"
      onClick={onClick}
      style={{ color: saved ? '#f59e0b' : undefined }}
    >
      <Bookmark
        size={23}
        fill={saved ? 'currentColor' : 'none'}
        style={{
          transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), color 0.12s',
          filter: saved ? 'drop-shadow(0 0 5px #f59e0b88)' : 'none',
        }}
      />
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
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
  const [commentPost, setCommentPost] = useState(null);

  const startRef = useRef(null);
  const cardRefs = useRef({});

  /* ── Load posts if not passed ── */
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
    const el = cardRefs.current[startPostId];
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      });
    }
  }, [startPostId, posts]);

  /* ── Keyboard ── */
  useEffect(() => {
    const handler = e => {
      if (commentPost && e.key === 'Escape') { setCommentPost(null); return; }
      if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, commentPost]);

  /* ── Actions ── */
  const handleLike = useCallback(async (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !currentUser?.id) return;
    await likePost(postId, currentUser.id);
    const result = await toggleLike(postId, currentUser.id, post.liked || false, post.likes || 0);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: result.liked, likes: result.likes } : p));
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
    else { navigator.clipboard.writeText(url); addToast('Link copied!', 'success'); }
  }, [addToast]);

  const openComments = useCallback(async (post) => {
    try {
      const comments = await getPostComments(post.id);
      const fresh = { ...post, comments };
      setCommentPost(fresh);
      setPosts(prev => prev.map(p => p.id === post.id ? fresh : p));
    } catch {
      setCommentPost(post);
    }
  }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="pv-loading">
        <div className="pv-spinner" />
      </div>
    );
  }

  return (
    <>
      {/* ═══ PAGE SHELL ═══ */}
      <div className="pv-page">

        {/* ── Top nav bar ── */}
        <header className="pv-topbar">
          <button className="pv-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={22} />
          </button>
          <h1 className="pv-topbar-title">Posts</h1>
        </header>

        {/* ── Feed ── */}
        <div className="pv-feed" ref={startRef}>
          {posts.map(post => (
            <div
              key={post.id}
              ref={el => { if (el) cardRefs.current[post.id] = el; }}
            >
              <PostCard
                post={post}
                profileUser={profileUser}
                currentUser={currentUser}
                onLike={handleLike}
                onSave={handleSave}
                onShare={handleShare}
                onOpenComments={openComments}
              />
            </div>
          ))}

          {posts.length === 0 && (
            <div className="pv-empty">
              <p>No posts yet.</p>
            </div>
          )}

          <div style={{ height: 'env(safe-area-inset-bottom, 32px)' }} />
        </div>
      </div>

      {/* ── Comment sheet overlay ── */}
      {commentPost && (
        <CommentSheet
          post={commentPost}
          currentUser={currentUser}
          onClose={() => setCommentPost(null)}
          onSend={handleComment}
        />
      )}

      {/* ── Global styles for this page ── */}
      <style>{`

        /* ── PAGE ── */
        .pv-page {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: #000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── TOPBAR ── */
        .pv-topbar {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 14px;
          height: 52px;
          padding-top: env(safe-area-inset-top, 0px);
          background: #000;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .pv-back-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.88);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 50%;
          transition: background 0.15s;
        }
        .pv-back-btn:hover { background: rgba(255,255,255,0.07); }
        .pv-topbar-title {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          margin: 0;
          letter-spacing: -0.01em;
        }

        /* ── FEED ── */
        .pv-feed {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        /* Thin scrollbar */
        .pv-feed::-webkit-scrollbar { width: 3px; }
        .pv-feed::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 99px; }
        .pv-feed::-webkit-scrollbar-track { background: transparent; }

        /* ── CARD ── */
        .pv-card {
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-bottom: 4px;
        }

        /* ── CARD HEADER ── */
        .pv-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
        }
        .pv-card-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pv-card-author {}
        .pv-author-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #fff;
          line-height: 1.2;
          margin: 0;
        }
        .pv-author-sub {
          font-size: 11.5px;
          color: rgba(255,255,255,0.38);
          margin: 2px 0 0;
          line-height: 1.2;
        }
        .pv-more-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          border-radius: 50%;
          transition: color 0.15s;
        }
        .pv-more-btn:hover { color: #fff; }

        /* ── MEDIA ── */
        .pv-media-wrap {
          position: relative;
          width: 100%;
          background: #111;
          cursor: default;
          user-select: none;
        }
        .pv-media-img {
          display: block;
          width: 100%;
          height: auto;
          max-height: 80vh;
          object-fit: contain;
          background: #000;
        }

        /* File block */
        .pv-file-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 48px 32px;
          min-height: 240px;
          background: linear-gradient(145deg, #0d1120, #111827);
        }
        .pv-file-icon {
          width: 60px; height: 60px;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
        }
        .pv-file-name {
          color: rgba(255,255,255,0.78);
          font-size: 14px;
          font-weight: 500;
          margin: 0;
          text-align: center;
        }
        .pv-file-sub {
          color: rgba(255,255,255,0.3);
          font-size: 12px;
          margin: 0;
        }
        .pv-file-dl {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 22px;
          border-radius: 99px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.13);
          color: rgba(255,255,255,0.8);
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.15s;
        }
        .pv-file-dl:hover { background: rgba(255,255,255,0.14); }

        /* Text post block */
        .pv-text-block {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 280px;
          padding: 48px 36px;
          background: linear-gradient(145deg, #0a0d1a, #0f1623);
          overflow: hidden;
        }
        .pv-text-quote {
          position: absolute;
          top: -24px; left: 12px;
          font-size: 110px;
          font-family: Georgia, serif;
          color: rgba(255,255,255,0.04);
          line-height: 1;
          margin: 0;
          user-select: none;
          pointer-events: none;
        }
        .pv-text-content {
          font-size: 19px;
          font-weight: 400;
          color: rgba(255,255,255,0.88);
          line-height: 1.65;
          text-align: center;
          letter-spacing: -0.01em;
          margin: 0;
          position: relative;
          z-index: 1;
        }

        /* Double-tap heart */
        .pv-heart-pop {
          position: absolute;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 10;
        }
        .pv-heart-icon {
          width: 80px; height: 80px;
          color: white;
          filter: drop-shadow(0 0 28px rgba(255,255,255,0.5));
          animation: pvHeartPop 0.85s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
        }

        /* ── ACTIONS ── */
        .pv-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px 4px;
        }
        .pv-actions-left {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .pv-action-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.88);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 7px 7px;
          border-radius: 50%;
          transition: color 0.15s, transform 0.15s;
        }
        .pv-action-btn:active { transform: scale(0.85); }

        /* ── LIKES ── */
        .pv-likes {
          padding: 2px 14px 4px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
        }

        /* ── CAPTION ── */
        .pv-caption {
          padding: 2px 14px 4px;
          font-size: 13.5px;
          line-height: 1.5;
          color: rgba(255,255,255,0.82);
        }
        .pv-caption-name {
          font-weight: 700;
          color: #fff;
          margin-right: 6px;
        }
        .pv-caption-text {
          font-weight: 400;
        }
        .pv-more-text {
          background: none;
          border: none;
          color: rgba(255,255,255,0.38);
          font-size: 13.5px;
          font-weight: 600;
          padding: 0;
          cursor: pointer;
        }

        /* ── VIEW COMMENTS LINK ── */
        .pv-view-comments {
          background: none;
          border: none;
          display: block;
          padding: 2px 14px;
          font-size: 13px;
          color: rgba(255,255,255,0.32);
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: color 0.15s;
        }
        .pv-view-comments:hover { color: rgba(255,255,255,0.55); }

        /* ── TOP COMMENT PREVIEW ── */
        .pv-comment-preview {
          padding: 1px 14px 2px;
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          line-height: 1.5;
        }

        /* ── TIMESTAMP ── */
        .pv-timestamp {
          padding: 4px 14px 8px;
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* ── INLINE COMMENT INPUT ── */
        .pv-inline-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px 12px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .pv-inline-input-fake {
          flex: 1;
          background: none;
          border: none;
          text-align: left;
          color: rgba(255,255,255,0.3);
          font-size: 13px;
          padding: 0;
          cursor: pointer;
        }
        .pv-emoji-btn {
          background: none;
          border: none;
          font-size: 17px;
          opacity: 0.55;
          line-height: 1;
        }

        /* ── LOADING ── */
        .pv-loading {
          position: fixed; inset: 0;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 60;
        }
        .pv-spinner {
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,0.1);
          border-top-color: rgba(255,255,255,0.7);
          animation: pvSpin 0.7s linear infinite;
        }

        /* ── EMPTY ── */
        .pv-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 32px;
          color: rgba(255,255,255,0.25);
          font-size: 14px;
        }

        /* ══ COMMENT SHEET ══ */
        .pv-sheet-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: flex-end;
        }
        .pv-sheet {
          width: 100%;
          max-height: 78dvh;
          background: #1a1a1e;
          border-radius: 20px 20px 0 0;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          animation: pvSlideUp 0.28s cubic-bezier(0.32,0.72,0,1);
        }
        .pv-sheet-handle {
          width: 36px; height: 4px;
          border-radius: 99px;
          background: rgba(255,255,255,0.15);
          margin: 10px auto 4px;
          flex-shrink: 0;
        }
        .pv-sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 16px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .pv-sheet-title {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
        }
        .pv-sheet-close {
          background: rgba(255,255,255,0.08);
          border: none;
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: background 0.15s;
        }
        .pv-sheet-close:hover { background: rgba(255,255,255,0.14); }
        .pv-sheet-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px 16px 4px;
          min-height: 0;
        }
        .pv-sheet-list::-webkit-scrollbar { width: 3px; }
        .pv-sheet-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 99px; }
        .pv-no-comments {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
          color: rgba(255,255,255,0.28);
        }
        .pv-comment-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 7px 0;
        }
        .pv-comment-body { flex: 1; min-width: 0; }
        .pv-comment-text {
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255,255,255,0.82);
          margin: 0;
        }
        .pv-comment-name {
          font-weight: 700;
          color: #fff;
          margin-right: 6px;
        }
        .pv-comment-time {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          margin: 3px 0 0;
        }
        .pv-sheet-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .pv-sheet-input-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 99px;
          padding: 8px 14px;
        }
        .pv-sheet-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: rgba(255,255,255,0.88);
          font-size: 13px;
          caret-color: white;
          font-family: inherit;
        }
        .pv-sheet-input::placeholder { color: rgba(255,255,255,0.28); }
        .pv-sheet-post-btn {
          background: none;
          border: none;
          font-size: 13px;
          font-weight: 700;
          color: #60a5fa;
          cursor: pointer;
          transition: opacity 0.15s;
          font-family: inherit;
        }

        /* ── DESKTOP: constrain width like Instagram ── */
        @media (min-width: 768px) {
          .pv-feed {
            max-width: 470px;
            margin: 0 auto;
          }
          .pv-topbar {
            max-width: 470px;
            margin: 0 auto;
          }
          .pv-page {
            background: #0a0a0a;
          }
          .pv-media-img {
            max-height: 600px;
          }
          .pv-sheet {
            max-width: 520px;
            margin: 0 auto;
            border-radius: 20px;
            bottom: 40px;
          }
        }

        /* ── KEYFRAMES ── */
        @keyframes pvHeartPop {
          0%   { opacity: 1; transform: translate(-50%,-50%) scale(0.3); }
          40%  { opacity: 1; transform: translate(-50%,-50%) scale(1.3); }
          70%  { opacity: 0.9; transform: translate(-50%,-50%) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1.2); }
        }
        @keyframes pvSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes pvSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
