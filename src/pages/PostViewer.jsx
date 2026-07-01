import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark,
  MoreHorizontal, Paperclip, Download, X,
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

/* ────────────────────────────────────────────────────
   AVATAR
──────────────────────────────────────────────────── */
function Av({ src, name, size = 32, ring = false }) {
  const style = {
    width: size, height: size, borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0,
    boxShadow: ring ? '0 0 0 2px rgba(255,255,255,0.15)' : 'none',
  };
  if (src) {
    return (
      <img src={src} alt="" onError={e => handleAvatarError(e, name)} style={style} />
    );
  }
  return (
    <div style={{
      ...style,
      background: '#232325',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 700,
      color: 'rgba(255,255,255,0.55)',
      letterSpacing: '-0.01em',
    }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

/* ────────────────────────────────────────────────────
   SKELETON CARD  (shown while loading)
──────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <article className="pv-card" style={{ opacity: 1 }}>
      <div className="pv-card-header">
        <div className="pv-card-header-left">
          <div className="pv-skel pv-skel-circle" style={{ width: 36, height: 36 }} />
          <div>
            <div className="pv-skel pv-skel-line" style={{ width: 120, height: 12, marginBottom: 6 }} />
            <div className="pv-skel pv-skel-line" style={{ width: 80, height: 10 }} />
          </div>
        </div>
      </div>
      <div className="pv-skel pv-skel-media" />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="pv-skel pv-skel-line" style={{ width: '40%', height: 12 }} />
        <div className="pv-skel pv-skel-line" style={{ width: '85%', height: 11 }} />
        <div className="pv-skel pv-skel-line" style={{ width: '60%', height: 11 }} />
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────
   COMMENT SHEET
──────────────────────────────────────────────────── */
function CommentSheet({ post, currentUser, onClose, onSend }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const comments = useMemo(() =>
    (post.comments || []).filter(c => !c.parentId), [post.comments]);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 160); }, []);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(post.id, t);
    setText('');
  };

  return (
    <div className="pv-sheet-backdrop" onClick={onClose}>
      <div className="pv-sheet" onClick={e => e.stopPropagation()}>

        {/* Drag pill */}
        <div className="pv-sheet-pill" />

        {/* Header */}
        <div className="pv-sheet-header">
          <span className="pv-sheet-title">Comments</span>
          <button className="pv-sheet-close" onClick={onClose} aria-label="Close">
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Comment list */}
        <div className="pv-sheet-list">
          {comments.length === 0 ? (
            <div className="pv-no-comments">
              <MessageCircle size={26} style={{ opacity: 0.18, marginBottom: 10 }} />
              <p className="pv-no-comments-title">No comments yet</p>
              <p className="pv-no-comments-sub">Be the first to comment</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="pv-comment-row">
                <Av src={c.avatar} name={c.name} size={31} />
                <div className="pv-comment-body">
                  <p className="pv-comment-text">
                    <span className="pv-comment-name">{c.name} </span>
                    {c.text}
                  </p>
                  <p className="pv-comment-time">{formatTimeAgo(c.timestamp)}</p>
                </div>
              </div>
            ))
          )}
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
              style={{ opacity: text.trim() ? 1 : 0.3 }}
            >
              Post
            </button>
          </div>
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom, 12px)', flexShrink: 0 }} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   HEART BUTTON  (with spring burst)
──────────────────────────────────────────────────── */
function HeartBtn({ liked, onClick }) {
  const [scale, setScale] = useState(1);
  const handle = () => {
    setScale(1.4);
    setTimeout(() => setScale(1), 250);
    onClick();
  };
  return (
    <button
      className="pv-action-btn"
      onClick={handle}
      aria-label={liked ? 'Unlike' : 'Like'}
      style={{ color: liked ? '#f03' : undefined }}
    >
      <Heart
        size={24}
        fill={liked ? 'currentColor' : 'none'}
        strokeWidth={liked ? 0 : 2}
        style={{
          transform: `scale(${scale})`,
          transition: scale > 1
            ? 'transform 0.08s ease-out'
            : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          filter: liked ? 'drop-shadow(0 0 8px rgba(255,0,51,0.5))' : 'none',
        }}
      />
    </button>
  );
}

/* ────────────────────────────────────────────────────
   SAVE BUTTON
──────────────────────────────────────────────────── */
function SaveBtn({ saved, onClick }) {
  const [scale, setScale] = useState(1);
  const handle = () => {
    setScale(1.3);
    setTimeout(() => setScale(1), 250);
    onClick();
  };
  return (
    <button
      className="pv-action-btn"
      onClick={handle}
      aria-label={saved ? 'Unsave' : 'Save'}
      style={{ color: saved ? '#f59e0b' : undefined }}
    >
      <Bookmark
        size={24}
        fill={saved ? 'currentColor' : 'none'}
        strokeWidth={saved ? 0 : 2}
        style={{
          transform: `scale(${scale})`,
          transition: scale > 1
            ? 'transform 0.08s ease-out'
            : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          filter: saved ? 'drop-shadow(0 0 7px rgba(245,158,11,0.55))' : 'none',
        }}
      />
    </button>
  );
}

/* ────────────────────────────────────────────────────
   POST CARD
──────────────────────────────────────────────────── */
function PostCard({ post, profileUser, currentUser, onLike, onSave, onShare, onOpenComments }) {
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: '50%', y: '50%' });
  const [expanded, setExpanded] = useState(false);
  const lastTap = useRef(0);

  const caption = post.content || '';
  const LIMIT = 130;
  const long = caption.length > LIMIT;
  const comments = useMemo(() =>
    (post.comments || []).filter(c => !c.parentId), [post.comments]);

  const onDoubleTap = useCallback((e) => {
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

      {/* HEADER */}
      <div className="pv-card-header">
        <div className="pv-card-header-left">
          <Av src={profileUser?.avatar} name={profileUser?.name} size={37} ring />
          <div>
            <p className="pv-author-name">{profileUser?.name}</p>
            {(profileUser?.college || (post.category && post.category !== 'general')) && (
              <p className="pv-author-sub">
                {profileUser?.college || ''}
                {profileUser?.college && post.category && post.category !== 'general' ? ' · ' : ''}
                {post.category && post.category !== 'general' ? post.category : ''}
              </p>
            )}
          </div>
        </div>
        <button className="pv-more-btn" aria-label="More options">
          <MoreHorizontal size={19} strokeWidth={2} />
        </button>
      </div>

      {/* MEDIA */}
      <div
        className="pv-media-wrap"
        onClick={onDoubleTap}
        onTouchStart={onDoubleTap}
      >
        {post.image ? (
          <img src={post.image} alt="" loading="lazy" className="pv-media-img" />
        ) : post.file_url ? (
          <div className="pv-file-block">
            <div className="pv-file-icon">
              <Paperclip size={20} style={{ color: 'rgba(255,255,255,0.45)' }} />
            </div>
            <p className="pv-file-name">{post.file_name || 'Document'}</p>
            <p className="pv-file-sub">Shared file</p>
            <a
              href={post.file_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="pv-file-dl"
            >
              <Download size={12} /> Download
            </a>
          </div>
        ) : (
          <div className="pv-text-block">
            <p className="pv-text-deco">"</p>
            <p className="pv-text-content">{caption}</p>
          </div>
        )}

        {/* Double-tap heart */}
        {showHeart && (
          <div className="pv-heart-burst" style={{ left: heartPos.x, top: heartPos.y }}>
            <Heart fill="white" className="pv-heart-burst-icon" />
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="pv-actions">
        <div className="pv-actions-l">
          <HeartBtn liked={post.liked} onClick={() => onLike(post.id)} />
          <button className="pv-action-btn" onClick={() => onOpenComments(post)} aria-label="Comment">
            <MessageCircle size={24} strokeWidth={2} />
          </button>
          <button className="pv-action-btn" onClick={() => onShare(post)} aria-label="Share">
            <Share2 size={22} strokeWidth={2} />
          </button>
        </div>
        <SaveBtn saved={post.saved} onClick={() => onSave(post.id)} />
      </div>

      {/* LIKES */}
      {(post.likes || 0) > 0 && (
        <p className="pv-likes">{post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}</p>
      )}

      {/* CAPTION (image/file posts) */}
      {(post.image || post.file_url) && caption ? (
        <div className="pv-caption">
          <span className="pv-caption-name">{profileUser?.name?.split(' ')[0]}</span>
          {expanded || !long ? (
            <span className="pv-caption-text">{caption}</span>
          ) : (
            <>
              <span className="pv-caption-text">{caption.slice(0, LIMIT)}</span>
              <span className="pv-caption-text">… </span>
              <button className="pv-expand-btn" onClick={() => setExpanded(true)}>more</button>
            </>
          )}
        </div>
      ) : null}

      {/* COMMENTS LINK */}
      {comments.length > 0 && (
        <button className="pv-view-comments" onClick={() => onOpenComments(post)}>
          View all {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </button>
      )}

      {/* TOP COMMENT PREVIEW */}
      {comments.length > 0 && (
        <div className="pv-comment-preview">
          <span className="pv-caption-name">{comments[0].name} </span>
          <span className="pv-caption-text">{comments[0].text}</span>
        </div>
      )}

      {/* TIMESTAMP */}
      <p className="pv-timestamp">{formatTimeAgo(post.timestamp)}</p>

      {/* INLINE INPUT TRIGGER */}
      <button className="pv-inline-input-row" onClick={() => onOpenComments(post)}>
        <Av src={currentUser?.avatar} name={currentUser?.name} size={27} />
        <span className="pv-inline-placeholder">Add a comment…</span>
      </button>

    </article>
  );
}

/* ────────────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────────────── */
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
  const cardRefs = useRef({});

  /* Load */
  useEffect(() => {
    if (passedPosts && passedProfileUser) { setLoading(false); return; }
    const load = async () => {
      try {
        const tid = userId || currentUser?.id;
        if (!tid) return;
        const [allPosts, user] = await Promise.all([
          getAllPostsWithDetails(currentUser?.id),
          getUser(tid),
        ]);
        const up = allPosts
          .filter(p => p.userId === tid)
          .map(p => ({
            ...p,
            liked: getLikeState(p.id).liked ?? p.liked,
            likes: getLikeState(p.id).likes ?? p.likes,
            saved: getSaveState(p.id) ?? p.saved,
          }));
        setPosts(up);
        setProfileUser(user);
      } catch (e) { console.warn('PostViewer:', e); }
      finally { setLoading(false); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Scroll to start post */
  useEffect(() => {
    if (!startPostId || posts.length === 0) return;
    const el = cardRefs.current[startPostId];
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
  }, [startPostId, posts]);

  /* Keyboard */
  useEffect(() => {
    const h = e => {
      if (commentPost && e.key === 'Escape') { setCommentPost(null); return; }
      if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [navigate, commentPost]);

  /* Actions */
  const handleLike = useCallback(async (postId) => {
    const p = posts.find(x => x.id === postId);
    if (!p || !currentUser?.id) return;
    await likePost(postId, currentUser.id);
    const r = await toggleLike(postId, currentUser.id, p.liked || false, p.likes || 0);
    setPosts(prev => prev.map(x => x.id === postId ? { ...x, liked: r.liked, likes: r.likes } : x));
  }, [posts, currentUser, toggleLike]);

  const handleSave = useCallback(async (postId) => {
    const p = posts.find(x => x.id === postId);
    if (!p || !currentUser?.id) return;
    const ns = await toggleSave(postId, currentUser.id, p.saved || false);
    await savePost(postId, currentUser.id);
    setPosts(prev => prev.map(x => x.id === postId ? { ...x, saved: ns } : x));
  }, [posts, currentUser, toggleSave]);

  const handleComment = useCallback(async (postId, text) => {
    if (!currentUser?.id || !text.trim()) return;
    try {
      await addComment(postId, currentUser.id, text);
      const comments = await getPostComments(postId);
      setPosts(prev => prev.map(x => x.id === postId ? { ...x, comments } : x));
      setCommentPost(prev => prev?.id === postId ? { ...prev, comments } : prev);
    } catch (e) { console.warn(e); }
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
      setPosts(prev => prev.map(x => x.id === post.id ? fresh : x));
    } catch { setCommentPost(post); }
  }, []);

  return (
    <>
      <div className="pv-page">

        {/* Top bar */}
        <header className="pv-topbar">
          <button className="pv-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={21} strokeWidth={2.5} />
          </button>
          <h1 className="pv-topbar-title">
            {profileUser?.name || 'Posts'}
          </h1>
        </header>

        {/* Feed */}
        <div className="pv-feed">
          {loading ? (
            <>{[0, 1, 2].map(i => <SkeletonCard key={i} />)}</>
          ) : posts.length === 0 ? (
            <div className="pv-empty">
              <p>No posts yet.</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} ref={el => { if (el) cardRefs.current[post.id] = el; }}>
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
            ))
          )}
          <div style={{ height: 'env(safe-area-inset-bottom, 48px)' }} />
        </div>
      </div>

      {/* Comment sheet */}
      {commentPost && (
        <CommentSheet
          post={commentPost}
          currentUser={currentUser}
          onClose={() => setCommentPost(null)}
          onSend={handleComment}
        />
      )}

      {/* Page-scoped styles */}
      <style>{`
        /* ─── RESET / PAGE ─── */
        .pv-page {
          position: fixed; inset: 0; z-index: 50;
          background: #000;
          display: flex; flex-direction: column;
          overflow: hidden;
        }

        /* ─── TOP BAR ─── */
        .pv-topbar {
          display: flex; align-items: center; gap: 12px;
          padding: 0 8px 0 4px;
          height: 48px;
          padding-top: env(safe-area-inset-top, 0px);
          background: rgba(0,0,0,0.95);
          backdrop-filter: blur(20px) saturate(1.5);
          -webkit-backdrop-filter: blur(20px) saturate(1.5);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
          z-index: 10;
        }
        .pv-back-btn {
          background: none; border: none;
          color: rgba(255,255,255,0.9);
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px;
          border-radius: 50%;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .pv-back-btn:hover { background: rgba(255,255,255,0.06); }
        .pv-back-btn:active { background: rgba(255,255,255,0.1); }
        .pv-topbar-title {
          font-size: 15px; font-weight: 700;
          color: #fff; margin: 0;
          letter-spacing: -0.02em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ─── FEED ─── */
        .pv-feed {
          flex: 1; overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
        .pv-feed::-webkit-scrollbar { width: 0; }

        /* ─── CARD ─── */
        .pv-card {
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: #000;
        }

        /* ─── CARD HEADER ─── */
        .pv-card-header {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 10px 14px 10px 12px;
        }
        .pv-card-header-left {
          display: flex; align-items: center; gap: 10px;
          min-width: 0; flex: 1;
        }
        .pv-author-name {
          font-size: 13.5px; font-weight: 700;
          color: #fff; line-height: 1.25; margin: 0;
          letter-spacing: -0.01em;
        }
        .pv-author-sub {
          font-size: 11.5px;
          color: rgba(255,255,255,0.35);
          margin: 2px 0 0; line-height: 1.2;
          letter-spacing: 0;
        }
        .pv-more-btn {
          background: none; border: none;
          color: rgba(255,255,255,0.5);
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: color 0.15s, background 0.15s;
        }
        .pv-more-btn:hover { color: #fff; background: rgba(255,255,255,0.06); }

        /* ─── MEDIA ─── */
        .pv-media-wrap {
          position: relative; width: 100%;
          background: #0a0a0a;
          user-select: none;
          cursor: default;
        }
        .pv-media-img {
          display: block; width: 100%;
          height: auto; max-height: 85vw;
          object-fit: contain;
          background: #000;
        }
        @media (min-width: 500px) {
          .pv-media-img { max-height: 500px; }
        }

        /* File block */
        .pv-file-block {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 14px; padding: 52px 32px; min-height: 260px;
          background: linear-gradient(160deg,#0c1120,#111928);
        }
        .pv-file-icon {
          width: 58px; height: 58px; border-radius: 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          display: flex; align-items: center; justify-content: center;
        }
        .pv-file-name {
          color: rgba(255,255,255,0.75);
          font-size: 14px; font-weight: 600;
          margin: 0; text-align: center;
          max-width: 240px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pv-file-sub {
          color: rgba(255,255,255,0.28);
          font-size: 12px; margin: -4px 0 0;
        }
        .pv-file-dl {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 22px; border-radius: 99px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.78);
          font-size: 13px; font-weight: 600;
          text-decoration: none;
          transition: background 0.18s;
        }
        .pv-file-dl:hover { background: rgba(255,255,255,0.13); }

        /* Text post */
        .pv-text-block {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          min-height: 300px; padding: 52px 40px;
          background: linear-gradient(145deg,#08091a,#0d1220);
          overflow: hidden;
        }
        .pv-text-deco {
          position: absolute; top: -20px; left: 14px;
          font-size: 100px; font-family: Georgia, serif;
          color: rgba(255,255,255,0.035);
          line-height: 1; margin: 0;
          user-select: none; pointer-events: none;
        }
        .pv-text-content {
          font-size: 20px; font-weight: 400;
          color: rgba(255,255,255,0.86);
          line-height: 1.7; text-align: center;
          letter-spacing: -0.015em;
          margin: 0; position: relative; z-index: 1;
        }

        /* Double-tap heart */
        .pv-heart-burst {
          position: absolute;
          transform: translate(-50%,-50%);
          pointer-events: none; z-index: 10;
        }
        .pv-heart-burst-icon {
          width: 76px; height: 76px; color: white;
          filter: drop-shadow(0 0 24px rgba(255,255,255,0.45));
          animation: pvHeart 0.82s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
        }

        /* ─── ACTIONS ─── */
        .pv-actions {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 6px 10px 2px;
        }
        .pv-actions-l { display: flex; align-items: center; gap: 2px; }
        .pv-action-btn {
          background: none; border: none;
          color: rgba(255,255,255,0.88);
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px;
          border-radius: 50%;
          transition: background 0.15s;
        }
        .pv-action-btn:active { background: rgba(255,255,255,0.07); }

        /* ─── LIKES ─── */
        .pv-likes {
          padding: 1px 14px 4px;
          font-size: 13px; font-weight: 700;
          color: #fff; margin: 0;
          letter-spacing: -0.01em;
        }

        /* ─── CAPTION ─── */
        .pv-caption {
          padding: 2px 14px 4px;
          font-size: 13.5px; line-height: 1.52;
          color: rgba(255,255,255,0.78);
        }
        .pv-caption-name {
          font-weight: 700; color: #fff;
        }
        .pv-caption-text { font-weight: 400; }
        .pv-expand-btn {
          background: none; border: none;
          color: rgba(255,255,255,0.35);
          font-size: 13.5px; font-weight: 600;
          padding: 0; cursor: pointer;
          transition: color 0.15s;
        }
        .pv-expand-btn:hover { color: rgba(255,255,255,0.6); }

        /* ─── VIEW COMMENTS ─── */
        .pv-view-comments {
          background: none; border: none;
          display: block; width: 100%;
          padding: 2px 14px 1px;
          font-size: 13px; color: rgba(255,255,255,0.3);
          font-weight: 500; text-align: left;
          cursor: pointer;
          transition: color 0.15s;
        }
        .pv-view-comments:hover { color: rgba(255,255,255,0.55); }

        /* ─── COMMENT PREVIEW ─── */
        .pv-comment-preview {
          padding: 1px 14px 2px;
          font-size: 13px; line-height: 1.5;
          color: rgba(255,255,255,0.7);
          overflow: hidden;
          white-space: nowrap; text-overflow: ellipsis;
        }

        /* ─── TIMESTAMP ─── */
        .pv-timestamp {
          padding: 4px 14px 8px;
          font-size: 10.5px;
          color: rgba(255,255,255,0.22);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin: 0;
        }

        /* ─── INLINE INPUT TRIGGER ─── */
        .pv-inline-input-row {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 14px 12px;
          border-top: 1px solid rgba(255,255,255,0.04);
          background: none; border-left: none; border-right: none; border-bottom: none;
          width: 100%; cursor: pointer;
          transition: background 0.15s;
        }
        .pv-inline-input-row:active { background: rgba(255,255,255,0.03); }
        .pv-inline-placeholder {
          font-size: 13px;
          color: rgba(255,255,255,0.25);
          font-family: inherit;
        }

        /* ─── SKELETON ─── */
        .pv-skel { border-radius: 6px; }
        .pv-skel-circle { border-radius: 50% !important; }
        .pv-skel-media {
          width: 100%; height: 62vw; max-height: 400px;
          border-radius: 0;
        }
        .pv-skel-line { border-radius: 4px; }
        @keyframes pvPulse {
          0%,100% { background: rgba(255,255,255,0.06); }
          50%      { background: rgba(255,255,255,0.1); }
        }
        .pv-skel-circle, .pv-skel-line, .pv-skel-media {
          animation: pvPulse 1.6s ease-in-out infinite;
        }

        /* ─── EMPTY ─── */
        .pv-empty {
          display: flex; align-items: center; justify-content: center;
          padding: 80px 24px;
          color: rgba(255,255,255,0.22);
          font-size: 14px;
        }

        /* ═══ COMMENT SHEET ═══ */
        .pv-sheet-backdrop {
          position: fixed; inset: 0; z-index: 80;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex; align-items: flex-end;
        }
        .pv-sheet {
          width: 100%; max-height: 80dvh;
          background: #111113;
          border-radius: 22px 22px 0 0;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex; flex-direction: column;
          animation: pvSlideUp 0.3s cubic-bezier(0.32,0.72,0,1);
          will-change: transform;
        }
        .pv-sheet-pill {
          width: 34px; height: 4px; border-radius: 99px;
          background: rgba(255,255,255,0.15);
          margin: 10px auto 4px; flex-shrink: 0;
        }
        .pv-sheet-header {
          display: flex; align-items: center;
          justify-content: center;
          position: relative;
          padding: 6px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .pv-sheet-title {
          font-size: 14px; font-weight: 700; color: #fff;
        }
        .pv-sheet-close {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: rgba(255,255,255,0.08); border: none;
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.5); cursor: pointer;
          transition: background 0.15s;
        }
        .pv-sheet-close:hover { background: rgba(255,255,255,0.14); }

        .pv-sheet-list {
          flex: 1; overflow-y: auto;
          padding: 8px 16px 4px; min-height: 0;
        }
        .pv-sheet-list::-webkit-scrollbar { width: 0; }

        .pv-no-comments {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 44px 0; color: rgba(255,255,255,0.3);
        }
        .pv-no-comments-title {
          font-size: 14px; font-weight: 600;
          color: rgba(255,255,255,0.4); margin: 0 0 4px;
        }
        .pv-no-comments-sub {
          font-size: 12.5px; color: rgba(255,255,255,0.22); margin: 0;
        }

        .pv-comment-row {
          display: flex; gap: 10px;
          align-items: flex-start; padding: 8px 0;
        }
        .pv-comment-body { flex: 1; min-width: 0; }
        .pv-comment-text {
          font-size: 13.5px; line-height: 1.5;
          color: rgba(255,255,255,0.8); margin: 0;
        }
        .pv-comment-name {
          font-weight: 700; color: #fff;
        }
        .pv-comment-time {
          font-size: 11px; color: rgba(255,255,255,0.22);
          margin: 3px 0 0;
        }

        .pv-sheet-input-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .pv-sheet-input-wrap {
          flex: 1; display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 99px; padding: 9px 14px;
          transition: border-color 0.15s;
        }
        .pv-sheet-input-wrap:focus-within {
          border-color: rgba(255,255,255,0.18);
        }
        .pv-sheet-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: rgba(255,255,255,0.88);
          font-size: 13.5px; caret-color: white;
          font-family: inherit;
        }
        .pv-sheet-input::placeholder { color: rgba(255,255,255,0.25); }
        .pv-sheet-post-btn {
          background: none; border: none;
          font-size: 13.5px; font-weight: 700;
          color: #3b82f6; cursor: pointer;
          font-family: inherit;
          transition: opacity 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .pv-sheet-post-btn:hover { color: #60a5fa; }

        /* ─── DESKTOP CENTER ─── */
        @media (min-width: 600px) {
          .pv-page { background: #080808; }
          .pv-feed {
            max-width: 468px;
            margin: 0 auto;
            border-left: 1px solid rgba(255,255,255,0.05);
            border-right: 1px solid rgba(255,255,255,0.05);
          }
          .pv-topbar {
            max-width: 468px;
            margin: 0 auto;
            border-left: 1px solid rgba(255,255,255,0.05);
            border-right: 1px solid rgba(255,255,255,0.05);
          }
          .pv-media-img { max-height: 580px; }
          .pv-sheet {
            max-width: 468px;
            margin: 0 auto;
            border-radius: 22px 22px 0 0;
          }
        }

        /* ─── KEYFRAMES ─── */
        @keyframes pvHeart {
          0%   { opacity: 1; transform: translate(-50%,-50%) scale(0.25); }
          40%  { opacity: 1; transform: translate(-50%,-50%) scale(1.3); }
          65%  { opacity: 1; transform: translate(-50%,-50%) scale(1.08); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1.18); }
        }
        @keyframes pvSlideUp {
          from { transform: translateY(105%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
