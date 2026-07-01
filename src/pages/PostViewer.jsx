import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark,
  X, Send, MoreHorizontal, ChevronLeft, ChevronRight,
  Paperclip, Download,
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

/* ─────────────────────────────────────────────────
   AVATAR HELPER
───────────────────────────────────────────────── */
function Avatar({ src, name, size = 32, style = {} }) {
  const initials = name?.charAt(0)?.toUpperCase() || '?';
  if (src) {
    return (
      <img
        src={src}
        alt=""
        onError={(e) => handleAvatarError(e, name)}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0, ...style,
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#2a2a2e', border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.7)', fontSize: size * 0.38, fontWeight: 700,
      letterSpacing: '-0.02em', ...style,
    }}>
      {initials}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   COMMENT ITEM
───────────────────────────────────────────────── */
function CommentItem({ c }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0' }}>
      <Avatar src={c.avatar} name={c.name} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          <span style={{ fontWeight: 700, color: '#fff', marginRight: 6 }}>{c.name}</span>
          <span style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 400 }}>{c.text}</span>
        </p>
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 3 }}>{formatTimeAgo(c.timestamp)}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   COMMENT INPUT BAR
───────────────────────────────────────────────── */
function CommentInput({ currentUser, onSend }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      background: '#111115',
    }}>
      <Avatar src={currentUser?.avatar} name={currentUser?.name} size={30} />
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 99,
        padding: '7px 14px',
      }}>
        <input
          ref={ref}
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
            border: 'none', background: 'none', cursor: text.trim() ? 'pointer' : 'default',
            padding: 0, display: 'flex', alignItems: 'center',
            color: text.trim() ? '#60a5fa' : 'rgba(255,255,255,0.18)',
            fontWeight: 700, fontSize: 13, transition: 'color 0.15s',
          }}
        >
          Post
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   ACTION BUTTON
───────────────────────────────────────────────── */
function ActionBtn({ onClick, icon, label, active, activeColor }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px',
        display: 'flex', alignItems: 'center', gap: 6,
        color: active ? activeColor : 'rgba(255,255,255,0.88)',
        transform: pressed ? 'scale(0.82)' : 'scale(1)',
        transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1), color 0.15s',
        filter: active ? `drop-shadow(0 0 6px ${activeColor}88)` : 'none',
      }}
    >
      {icon}
      {label !== undefined && label !== null && (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>
          {label > 0 ? label : ''}
        </span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────
   POST MEDIA
───────────────────────────────────────────────── */
function PostMedia({ post, onDoubleTap, desktop }) {
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: '50%', y: '50%' });
  const lastTap = useRef(0);

  const handleInteraction = useCallback((e) => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
      const cy = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
      setHeartPos({ x: `${cx}px`, y: `${cy}px` });
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
      onDoubleTap?.();
    }
    lastTap.current = now;
  }, [onDoubleTap]);

  const mediaStyle = desktop
    ? { width: '100%', height: '100%', objectFit: 'contain', display: 'block' }
    : { width: '100%', maxHeight: '70vw', objectFit: 'contain', display: 'block', background: '#000' };

  const wrapStyle = desktop
    ? { width: '100%', height: '100%', background: '#000', position: 'relative', cursor: 'default' }
    : { width: '100%', background: '#000', position: 'relative', cursor: 'default' };

  return (
    <div style={wrapStyle} onClick={handleInteraction} onTouchStart={handleInteraction}>
      {post.image ? (
        <img src={post.image} alt="" loading="lazy" style={mediaStyle} />
      ) : post.file_url ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: 40,
          ...(desktop ? { height: '100%' } : { minHeight: 200 }),
          background: 'linear-gradient(145deg,#0d1120,#111827)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Paperclip style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.5)' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 500, textAlign: 'center' }}>
            {post.file_name || 'Document'}
          </p>
          <a
            href={post.file_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 99,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <Download style={{ width: 13, height: 13 }} /> Download
          </a>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '48px 32px',
          ...(desktop ? { height: '100%' } : { minHeight: 200 }),
          background: 'linear-gradient(145deg,#0a0d1a,#0f1623)',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.82)', fontSize: 18, fontWeight: 400,
            lineHeight: 1.7, textAlign: 'center', letterSpacing: '-0.01em', maxWidth: 360,
          }}>
            {post.content}
          </p>
        </div>
      )}

      {/* Double-tap heart */}
      {showHeart && (
        <div style={{
          position: 'absolute', left: heartPos.x, top: heartPos.y,
          transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 10,
        }}>
          <Heart fill="white" style={{
            width: 80, height: 80, color: 'white',
            filter: 'drop-shadow(0 0 24px rgba(255,255,255,0.5))',
            animation: 'pvHeartPop 0.85s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
          }} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   DESKTOP SPLIT PANEL
───────────────────────────────────────────────── */
function DesktopView({
  posts, currentIndex, setCurrentIndex,
  profileUser, currentUser,
  onLike, onSave, onShare, onComment,
  onClose,
}) {
  const post = posts[currentIndex];
  const comments = useMemo(() => (post?.comments || []).filter(c => !c.parentId), [post?.comments]);

  const prev = () => setCurrentIndex(i => Math.max(i - 1, 0));
  const next = () => setCurrentIndex(i => Math.min(i + 1, posts.length - 1));

  if (!post) return null;

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: 20, right: 20,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 70,
        }}
      >
        <X style={{ width: 16, height: 16 }} />
      </button>

      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          width: '100%', maxWidth: 940,
          height: 'min(90vh, 680px)',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          background: '#111115',
        }}
      >
        {/* LEFT — image */}
        <div style={{ flex: '0 0 auto', width: '58%', background: '#000', position: 'relative' }}>
          <PostMedia
            post={post}
            desktop
            onDoubleTap={() => { if (!post.liked) onLike(post.id); }}
          />

          {/* Nav arrows */}
          {posts.length > 1 && (
            <>
              <button
                onClick={prev}
                disabled={currentIndex === 0}
                style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: currentIndex === 0 ? 'default' : 'pointer',
                  color: 'white', opacity: currentIndex === 0 ? 0.25 : 0.85,
                  transition: 'opacity 0.2s',
                  zIndex: 5,
                }}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} />
              </button>
              <button
                onClick={next}
                disabled={currentIndex === posts.length - 1}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: currentIndex === posts.length - 1 ? 'default' : 'pointer',
                  color: 'white', opacity: currentIndex === posts.length - 1 ? 0.25 : 0.85,
                  transition: 'opacity 0.2s',
                  zIndex: 5,
                }}
              >
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>

              {/* Dot counter at bottom */}
              <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 5, zIndex: 5,
              }}>
                {posts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    style={{
                      width: i === currentIndex ? 18 : 6,
                      height: 6, borderRadius: 99,
                      background: i === currentIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                      border: 'none', cursor: 'pointer', padding: 0,
                      transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT — info + comments */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          background: '#111115',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <Avatar src={profileUser?.avatar} name={profileUser?.name} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>
                {profileUser?.name}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginTop: 2 }}>
                {formatTimeAgo(post.timestamp)}
                {post.category && ` · ${post.category}`}
              </p>
            </div>
            <button
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)', padding: 4,
              }}
            >
              <MoreHorizontal style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Comments scroll area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 4px', minHeight: 0 }}>
            {/* Caption as first comment */}
            {post.content && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0 10px' }}>
                <Avatar src={profileUser?.avatar} name={profileUser?.name} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                    <span style={{ fontWeight: 700, color: '#fff', marginRight: 6 }}>{profileUser?.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 400 }}>{post.content}</span>
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 3 }}>
                    {formatTimeAgo(post.timestamp)}
                  </p>
                </div>
              </div>
            )}

            {/* Divider */}
            {post.content && comments.length > 0 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0 10px' }} />
            )}

            {/* Comments */}
            {comments.length === 0 && !post.content ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', gap: 10,
                color: 'rgba(255,255,255,0.25)',
              }}>
                <MessageCircle style={{ width: 32, height: 32, opacity: 0.4 }} />
                <p style={{ fontSize: 13, fontWeight: 500 }}>No comments yet</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>Start the conversation</p>
              </div>
            ) : (
              comments.map(c => <CommentItem key={c.id} c={c} />)
            )}
          </div>

          {/* Actions */}
          <div style={{
            padding: '10px 16px 8px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <ActionBtn
                onClick={() => onLike(post.id)}
                icon={<Heart style={{ width: 22, height: 22 }} fill={post.liked ? 'currentColor' : 'none'} />}
                label={post.likes || 0}
                active={post.liked}
                activeColor="#ef4444"
              />
              <ActionBtn
                onClick={() => document.getElementById('pv-comment-input')?.focus()}
                icon={<MessageCircle style={{ width: 22, height: 22 }} />}
                label={post.comments?.length || 0}
              />
              <ActionBtn
                onClick={() => onSave(post.id)}
                icon={<Bookmark style={{ width: 22, height: 22 }} fill={post.saved ? 'currentColor' : 'none'} />}
                active={post.saved}
                activeColor="#f59e0b"
              />
              <div style={{ marginLeft: 'auto' }}>
                <ActionBtn
                  onClick={() => onShare(post)}
                  icon={<Share2 style={{ width: 20, height: 20 }} />}
                />
              </div>
            </div>
            {(post.likes || 0) > 0 && (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                {post.likes} {post.likes === 1 ? 'like' : 'likes'}
              </p>
            )}
          </div>

          {/* Comment input */}
          <div id="pv-comment-input" style={{ flexShrink: 0 }}>
            <CommentInput currentUser={currentUser} onSend={text => onComment(post.id, text)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MOBILE / TABLET VIEW
───────────────────────────────────────────────── */
function MobileView({
  posts, currentIndex, setCurrentIndex,
  profileUser, currentUser,
  onLike, onSave, onShare, onComment,
  onBack,
}) {
  const post = posts[currentIndex];
  const comments = useMemo(() => (post?.comments || []).filter(c => !c.parentId), [post?.comments]);
  const commentAreaRef = useRef(null);

  if (!post) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 12px 12px',
        paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#111115',
        flexShrink: 0,
        zIndex: 2,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.85)', padding: '4px 6px 4px 0',
            display: 'flex', alignItems: 'center',
          }}
        >
          <ArrowLeft style={{ width: 22, height: 22 }} />
        </button>
        <Avatar src={profileUser?.avatar} name={profileUser?.name} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#fff', fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>
            {profileUser?.name}
          </p>
          {posts.length > 1 && (
            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 11, marginTop: 1 }}>
              {currentIndex + 1} / {posts.length}
            </p>
          )}
        </div>
        <button
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', padding: 4,
          }}
        >
          <MoreHorizontal style={{ width: 20, height: 20 }} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {/* Media */}
        <div style={{ background: '#000', width: '100%' }}>
          <PostMedia
            post={post}
            desktop={false}
            onDoubleTap={() => { if (!post.liked) onLike(post.id); }}
          />
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '10px 12px 6px',
          background: '#111115',
        }}>
          <ActionBtn
            onClick={() => onLike(post.id)}
            icon={<Heart style={{ width: 24, height: 24 }} fill={post.liked ? 'currentColor' : 'none'} />}
            active={post.liked}
            activeColor="#ef4444"
          />
          <ActionBtn
            onClick={() => commentAreaRef.current?.focus()}
            icon={<MessageCircle style={{ width: 24, height: 24 }} />}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
            <ActionBtn
              onClick={() => onSave(post.id)}
              icon={<Bookmark style={{ width: 24, height: 24 }} fill={post.saved ? 'currentColor' : 'none'} />}
              active={post.saved}
              activeColor="#f59e0b"
            />
            <ActionBtn
              onClick={() => onShare(post)}
              icon={<Share2 style={{ width: 22, height: 22 }} />}
            />
          </div>
        </div>

        {/* Like count + caption */}
        <div style={{ padding: '2px 14px 10px', background: '#111115' }}>
          {(post.likes || 0) > 0 && (
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
              {post.likes} {post.likes === 1 ? 'like' : 'likes'}
            </p>
          )}
          {post.content && (
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13.5, lineHeight: 1.55 }}>
              <span style={{ fontWeight: 700, color: '#fff', marginRight: 7 }}>
                {profileUser?.name?.split(' ')[0]}
              </span>
              {post.content}
            </p>
          )}
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 6 }}>
            {formatTimeAgo(post.timestamp)}
            {post.category ? ` · ${post.category}` : ''}
          </p>
        </div>

        {/* Comments */}
        {comments.length > 0 && (
          <div style={{
            padding: '8px 14px 12px',
            background: '#0d0d10',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Comments
            </p>
            {comments.map(c => <CommentItem key={c.id} c={c} />)}
          </div>
        )}

        {comments.length === 0 && (
          <div style={{
            padding: '20px 14px',
            background: '#0d0d10',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 13 }}>
              No comments yet. Be the first!
            </p>
          </div>
        )}

        {/* Multi-post nav buttons */}
        {posts.length > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px 20px',
            background: '#0d0d10',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <button
              onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
              disabled={currentIndex === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 99, padding: '8px 16px',
                color: currentIndex === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
                fontSize: 13, fontWeight: 600, cursor: currentIndex === 0 ? 'default' : 'pointer',
              }}
            >
              <ChevronLeft style={{ width: 15, height: 15 }} /> Previous
            </button>
            <div style={{ display: 'flex', gap: 5 }}>
              {posts.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  style={{
                    width: i === currentIndex ? 20 : 6, height: 6, borderRadius: 99,
                    background: i === currentIndex ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
                    border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'all 0.25s',
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrentIndex(i => Math.min(i + 1, posts.length - 1))}
              disabled={currentIndex === posts.length - 1}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 99, padding: '8px 16px',
                color: currentIndex === posts.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
                fontSize: 13, fontWeight: 600,
                cursor: currentIndex === posts.length - 1 ? 'default' : 'pointer',
              }}
            >
              Next <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          </div>
        )}

        {/* Bottom safe area */}
        <div style={{ height: 'env(safe-area-inset-bottom, 80px)' }} />
      </div>

      {/* Pinned comment input */}
      <div style={{
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: '#111115',
      }}>
        <CommentInput
          currentUser={currentUser}
          onSend={text => onComment(post.id, text)}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────── */
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

  // Responsive: >= 768px = desktop
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* Load if not passed */
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

  /* Jump to starting post */
  useEffect(() => {
    if (!startPostId || posts.length === 0) return;
    const idx = posts.findIndex(p => p.id === startPostId);
    if (idx >= 0) setCurrentIndex(idx);
  }, [startPostId, posts]);

  /* Refresh comments when index changes */
  useEffect(() => {
    const post = posts[currentIndex];
    if (!post) return;
    getPostComments(post.id).then(comments => {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, comments } : p));
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  /* Actions */
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
    } catch (e) { console.warn('Comment error:', e); }
  }, [currentUser]);

  const handleShare = useCallback((post) => {
    const url = `${window.location.origin}/#/post/${post.id}`;
    if (navigator.share) navigator.share({ title: 'StuGrow', text: post.content, url });
    else { navigator.clipboard.writeText(url); addToast('Link copied!', 'success'); }
  }, [addToast]);

  /* Keyboard nav */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') navigate(-1);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
        setCurrentIndex(i => Math.min(i + 1, posts.length - 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        setCurrentIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [posts.length, navigate]);

  /* Loading */
  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          border: '2.5px solid rgba(255,255,255,0.12)',
          borderTopColor: 'rgba(255,255,255,0.7)',
          animation: 'pvSpin 0.75s linear infinite',
        }} />
      </div>
    );
  }

  const sharedProps = {
    posts, currentIndex, setCurrentIndex,
    profileUser, currentUser,
    onLike: handleLike,
    onSave: handleSave,
    onShare: handleShare,
    onComment: handleComment,
  };

  return (
    <>
      {isDesktop ? (
        <DesktopView {...sharedProps} onClose={() => navigate(-1)} />
      ) : (
        <MobileView {...sharedProps} onBack={() => navigate(-1)} />
      )}

      <style>{`
        @keyframes pvHeartPop {
          0%   { opacity: 1; transform: scale(0.3); }
          40%  { opacity: 1; transform: scale(1.35); }
          70%  { opacity: 0.9; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.25); }
        }
        @keyframes pvSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
