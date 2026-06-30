import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Edit2, MapPin, Calendar, Settings, Grid, Bookmark, Award, FileText, BookOpen, X, Check, Camera, Heart, User, MessageCircle, Image, Upload, Trash2, Download, Link2, GraduationCap, Users, Share2, ChevronLeft, ChevronRight, MoreHorizontal, BadgeAlert, RefreshCcw, Paperclip } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import { uploadToCloudinary } from '../services/cloudinary';
import { uploadToGofile } from '../services/gofile';
import { createPost, createPaper, createBook, getAllPosts, getAllPostsWithDetails, getAllPapers, getAllBooks, isPostSaved, savePost, getLinks, getUser, createConversation, isPostLiked, likePost, addComment, getPostComments } from '../services/data';
import { usePostLike } from '../context/PostLikeContext';
import { usePostSave } from '../context/PostSaveContext';
import { formatTimeAgo, getCurrentTimestamp } from '../utils/timeUtils';
import { branches, semesters } from '../data/mockData';
import CustomSelect from '../components/CustomSelect';
import CreatePost from '../components/CreatePost';
import { handleAvatarError } from '../utils/avatarUtils';

const branchGradients = {
  'Computer Science': 'profile-cover-container',
  'Mechanical Engineering': 'profile-cover-container',
  'Electronics': 'profile-cover-container',
  'ECE': 'profile-cover-container',
  'EEE': 'profile-cover-container',
  'Civil Engineering': 'profile-cover-container',
  'Default': 'profile-cover-container'
};

function AnimatedCounter({ value }) {
  const displayValue = parseInt(value) || 0;
  return <span className="counter-animate">{displayValue}</span>;
}

function ProfileHeader({ user, onEdit, isOwnProfile = true, onMessage, bindsCount = 0 }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '', college: user?.college || '' });
  const [bioExpanded, setBioExpanded] = useState(false);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const gradientClass = branchGradients[user?.branch] || branchGradients['Default'];
  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

  const handleSave = () => { onEdit(form); setEditing(false); };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await uploadToCloudinary(file, 'stugrow/profiles'); onEdit({ avatar: url }); addToast('Avatar updated!', 'success'); }
    catch { addToast('Failed to upload avatar. Check Cloudinary config.', 'error'); }
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await uploadToCloudinary(file, 'stugrow/profiles'); onEdit({ coverPhoto: url }); addToast('Cover photo updated!', 'success'); }
    catch { addToast('Failed to upload cover. Check Cloudinary config.', 'error'); }
  };

  return (
    <div className="profile-card mb-4 profile-entrance profile-entrance-delay-1">
      {/* Cover Photo */}
      <div className={gradientClass}>
        {user?.coverPhoto && (
          <img src={user.coverPhoto} alt="" className="w-full h-full object-cover" />
        )}
        {isOwnProfile && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden-input" onChange={handleCoverChange} />
            <button 
              onClick={() => coverInputRef.current?.click()} 
              className="profile-cover-edit"
            >
              <Camera className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className="px-4 sm:px-8 pb-6 sm:pb-8 -mt-10 sm:-mt-12 relative">
        {/* Avatar */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
          <div className="flex justify-center sm:justify-start -mt-2">
            <div className="profile-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => handleAvatarError(e, user?.name)} />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold profile-avatar-initials">
                  {userInitials}
                </div>
              )}
              {isOwnProfile && (
                <>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden-input" onChange={handleAvatarChange} />
                  <button 
                    onClick={() => avatarInputRef.current?.click()} 
                    className="profile-avatar-edit"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 profile-entrance profile-entrance-delay-2">
            {isOwnProfile ? (
              editing ? (
                <>
                  <button onClick={handleSave} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
                    <Check className="w-4 h-4" />Save
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-ghost flex items-center gap-2 text-sm py-2 px-4">
                    <X className="w-4 h-4" />Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className="profile-edit-btn">
                    <Edit2 className="w-4 h-4" />Edit Profile
                  </button>
                  <button onClick={() => navigate('/settings')} className="profile-settings-btn">
                    <Settings className="w-4 h-4" />
                  </button>
                </>
              )
            ) : (
              <button onClick={onMessage} className="flex items-center gap-2 text-sm py-2.5 px-6 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-600 active:scale-95 transition-all duration-200">
                <MessageCircle className="w-4 h-4" />Message
              </button>
            )}
          </div>
        </div>

        {/* Name, Badges & Username */}
        <div className="text-center sm:text-left mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 justify-center sm:justify-start">
            {editing ? (
              <input 
                value={form.name} 
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} 
                className="text-xl sm:text-2xl font-bold bg-transparent border-b-2 border-slate-300 dark:border-slate-600 outline-none text-slate-900 dark:text-white w-full text-center sm:text-left" 
              />
            ) : (
              <h1 className="profile-name">
                {user?.name}
              </h1>
            )}
            {user?.badges?.map(badge => (
              <span key={badge} className={badge === 'Top Contributor' ? 'profile-badge profile-badge-top' : 'profile-badge profile-badge-new'}>
                {badge}
              </span>
            ))}
          </div>
          <p className="profile-username">@{user?.username}</p>
        </div>

        {/* Bio */}
        <div className="mb-4 sm:mb-6 profile-entrance profile-entrance-delay-2">
          {editing ? (
            <textarea 
              value={form.bio} 
              onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))} 
              className="input resize-none h-20 w-full" 
              placeholder="Your bio..." 
            />
          ) : (
            user && user.bio ? (
              <div className={`profile-bio ${!bioExpanded ? 'line-clamp-2' : ''}`}>
                {user.bio}
              </div>
            ) : isOwnProfile ? (
              <p className="text-sm text-gray-400">Add a bio to tell others about yourself</p>
            ) : null
          )}
          {user?.bio && user.bio.length > 100 && (
            <button 
              onClick={() => setBioExpanded(!bioExpanded)} 
              className="profile-read-more mt-1"
            >
              {bioExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Info Tags */}
        <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 profile-entrance profile-entrance-delay-3">
          {user?.college && (
            <span className="profile-info-tag">
              <MapPin className="w-3.5 h-3.5" />
              {user.college}
            </span>
          )}
          {user?.branch && (
            <span className="profile-info-tag">
              <Award className="w-3.5 h-3.5" />
              {user.branch}{user?.year ? ` · ${user.year}` : ''}
            </span>
          )}
          {user?.joinedDate && (
            <span className="profile-info-tag">
              <Calendar className="w-3.5 h-3.5" />
              Joined {user.joinedDate}
            </span>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 profile-entrance profile-entrance-delay-4">
          <button onClick={() => navigate('/bind')} className="profile-stat-card hover:scale-[1.02] transition-transform">
            <p className="profile-stat-number">
              <AnimatedCounter value={bindsCount} />
            </p>
            <p className="profile-stat-label">
              <Users className="w-3.5 h-3.5" />Binds
            </p>
          </button>
          <div className="profile-stat-card">
              <p className="profile-stat-number">
                <AnimatedCounter value={user?.resources || 0} />
              </p>
              <p className="profile-stat-label">
                <FileText className="w-3.5 h-3.5" />Resources
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}

function EmptyTab({ icon, title, description }) {
  const Icon = icon;
  return (
    <div className="profile-empty-state">
      <div className="flex items-center justify-center">
        <Icon className="profile-empty-icon" />
      </div>
      <h3 className="profile-empty-title">{title}</h3>
      <p className="profile-empty-subtitle">{description}</p>
    </div>
  );
}

export default function Profile() {
  const { user: currentUser, users, updateProfile } = useAuth();
  const { likeMap, likesCountMap, toggleLike, getLikeState, syncAllPosts, initialized } = usePostLike();
  const { savedMap, toggleSave, getSaveState, syncAllPosts: syncAllSaves, initialized: savesInitialized } = usePostSave();
  const navigate = useNavigate();
  const { userId } = useParams();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('posts');
  const [userPosts, setUserPosts] = useState([]);
  const [userPapers, setUserPapers] = useState([]);
  const [userBooks, setUserBooks] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [linkedUsersProfile, setLinkedUsersProfile] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showCommentInput, setShowCommentInput] = useState(null);
  const [shareFlipped, setShareFlipped] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [showHeartPop, setShowHeartPop] = useState(false);

  const [showUploadPaper, setShowUploadPaper] = useState(false);
  const [uploadPaperForm, setUploadPaperForm] = useState({ title: '', branch: '', semester: '', year: '' });
  const [paperFile, setPaperFile] = useState(null);
  const [paperFilePreview, setPaperFilePreview] = useState(null);
  const [uploadingPaper, setUploadingPaper] = useState(false);

  const [showUploadBook, setShowUploadBook] = useState(false);
  const [uploadBookForm, setUploadBookForm] = useState({ title: '', author: '', subject: '', description: '' });
  const [bookImage, setBookImage] = useState(null);
  const [bookPdfFile, setBookPdfFile] = useState(null);
  const [uploadingBook, setUploadingBook] = useState(false);

  const bookCoverFileRef = useRef(null);

  const paperFileInputRef = useRef(null);
  const bookFileInputRef = useRef(null);
  const bookPdfInputRef = useRef(null);

  const isOwnProfile = !userId || userId === currentUser?.id;
  const [profileUser, setProfileUser] = useState(null);
  
  useEffect(() => {
    const loadProfileUser = async () => {
      if (isOwnProfile) {
        setProfileUser(currentUser);
      } else if (userId) {
        const u = await getUser(userId);
        setProfileUser(u);
      }
    };
    loadProfileUser();
  }, [userId, currentUser, isOwnProfile]);

  const handleSendMessage = async () => {
    if (profileUser?.id && profileUser.id !== currentUser?.id) {
      try {
        const conversationId = await createConversation(currentUser.id, profileUser.id);
        navigate('/inbox', { state: { targetUser: profileUser, conversationId } });
      } catch (e) {
        navigate('/inbox', { state: { targetUser: profileUser } });
      }
    }
  };

  const tabs = [
    { id: 'posts', label: 'Posts', icon: Grid },
    { id: 'resources', label: 'Resources', icon: FileText },
    { id: 'books', label: 'Books', icon: BookOpen },
  ];
  if (isOwnProfile) {
    tabs.push({ id: 'saved', label: 'Saved', icon: Bookmark });
  }
  

  const [tabUnderline, setTabUnderline] = useState({ left: 0, width: 0 });

  const handlePostComment = async (postId) => {
    if (!commentText.trim() || !currentUser?.id) return;
    try {
      await addComment(postId, currentUser.id, commentText, replyingTo?.id);
      const comments = await getPostComments(postId);
      const updated = userPosts.map(p => p.id === postId ? { ...p, comments: comments } : p);
      setUserPosts(updated);
      if (selectedPost?.id === postId) {
        setSelectedPost({ ...selectedPost, comments: comments });
      }
      if (replyingTo?.id) {
        setExpandedReplies(prev => ({ ...prev, [replyingTo.id]: true }));
      }
      setCommentText('');
      setShowCommentInput(null);
      setReplyingTo(null);
    } catch (e) {
      console.warn('Failed to post comment:', e);
    }
  };

  const topLevelComments = useMemo(() => {
    return (selectedPost?.comments || []).filter(c => !c.parentId);
  }, [selectedPost?.comments]);

  const getRepliesForComment = (commentId) => {
    return (selectedPost?.comments || []).filter(c => c.parentId === commentId);
  };

  const handleReplyClick = (comment) => {
    setReplyingTo(comment);
    setExpandedReplies(prev => ({ ...prev, [comment.id]: true }));
    const tag = `@${comment.name?.split(' ')[0]} `;
    if (!commentText.startsWith(tag)) {
      setCommentText(prev => prev.trim() ? `${tag}${prev}` : tag);
    }
    const inputEl = document.getElementById('comment-input-field');
    inputEl?.focus();
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handleLikePost = async (postId) => {
    if (!currentUser?.id) return;
    const post = userPosts.find(p => p.id === postId);
    if (!post) return;
    const wasLiked = post.liked || false;
    
    await likePost(postId, currentUser.id);
    const result = await toggleLike(postId, currentUser.id, wasLiked, post.likes || 0);
    
    const updated = userPosts.map(p => p.id === postId ? { ...p, likes: result.likes, liked: result.liked } : p);
    setUserPosts(updated);
    if (selectedPost?.id === postId) {
      setSelectedPost({ ...selectedPost, likes: result.likes, liked: result.liked });
    }
  };

  const handleSavePost = async (postId) => {
    if (!currentUser?.id) return;
    try {
      const post = userPosts.find(p => p.id === postId);
      if (!post) return;
      const currentSaved = post.saved || false;
      
      const newSaved = await toggleSave(postId, currentUser.id, currentSaved);
      await savePost(postId, currentUser.id);
      
      setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: newSaved } : p));
      if (selectedPost?.id === postId) {
        setSelectedPost(prev => prev ? { ...prev, saved: newSaved } : null);
      }
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const handleNavigatePost = useCallback(async (dir) => {
    if (!selectedPost || userPosts.length <= 1) return;
    const currentIndex = selectedPost.index;
    let nextIndex = currentIndex + dir;
    if (nextIndex < 0) nextIndex = userPosts.length - 1;
    if (nextIndex >= userPosts.length) nextIndex = 0;
    
    const nextPost = userPosts[nextIndex];
    if (nextPost) {
      try {
        const comments = await getPostComments(nextPost.id);
        setSelectedPost({ ...nextPost, comments, index: nextIndex });
      } catch (e) {
        console.warn('Failed to load comments for navigated post:', e);
        setSelectedPost({ ...nextPost, comments: [], index: nextIndex });
      }
    }
  }, [selectedPost, userPosts]);

  const handleImageDoubleClick = async (postId) => {
    const post = userPosts.find(p => p.id === postId);
    if (!post || !currentUser?.id) return;
    if (!post.liked) {
      await handleLikePost(postId);
    }
    setShowHeartPop(true);
    setTimeout(() => {
      setShowHeartPop(false);
    }, 850);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedPost) return;
      if (e.key === 'ArrowLeft') {
        handleNavigatePost(-1);
      } else if (e.key === 'ArrowRight') {
        handleNavigatePost(1);
      } else if (e.key === 'Escape') {
        setSelectedPost(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPost, handleNavigatePost]);

  useEffect(() => {
    const activeTabEl = document.querySelector(`[data-tab="${activeTab}"]`);
    if (activeTabEl) {
      setTabUnderline({
        left: activeTabEl.offsetLeft,
        width: activeTabEl.offsetWidth
      });
    }
  }, [activeTab]);

  const loadUserPosts = async () => {
    if (!currentUser?.id) return;
    const targetUserId = isOwnProfile ? currentUser.id : userId;
    if (!targetUserId) return;
    
    const posts = await getAllPostsWithDetails(currentUser.id);
    const userPostsFiltered = posts.filter(p => p.userId === targetUserId);
    
    const postsWithStates = userPostsFiltered.map((p) => {
      const likeState = getLikeState(p.id);
      const saveState = getSaveState(p.id);
      const liked = likeState.liked !== null ? likeState.liked : p.liked;
      let likes = likeState.likes !== null ? likeState.likes : p.likes;
      if (liked && likes === 0) likes = 1;
      const saved = saveState !== null ? saveState : p.saved;
      
      return {
        ...p,
        liked,
        likes,
        saved
      };
    });
    setUserPosts(postsWithStates);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const targetUserId = isOwnProfile ? currentUser?.id : userId;
        if (!targetUserId) return;
        
        if (!initialized || !savesInitialized) {
          await Promise.all([
            syncAllPosts(currentUser?.id),
            syncAllSaves(currentUser?.id)
          ]);
        }
        
        const [posts, papers, books] = await Promise.all([
          getAllPostsWithDetails(currentUser?.id),
          getAllPapers(),
          getAllBooks()
        ]);
        const userPostsFiltered = posts.filter(p => p.userId === targetUserId);
        if (currentUser?.id) {
          const postsWithStates = userPostsFiltered.map((p) => {
            const likeState = getLikeState(p.id);
            const saveState = getSaveState(p.id);
            const liked = likeState.liked !== null ? likeState.liked : p.liked;
            let likes = likeState.likes !== null ? likeState.likes : p.likes;
            if (liked && likes === 0) likes = 1;
            const saved = saveState !== null ? saveState : p.saved;
            
            return {
              ...p,
              liked,
              likes,
              saved
            };
          });
          setUserPosts(postsWithStates);
        } else {
          setUserPosts(userPostsFiltered);
        }
        
        setUserPapers(papers.filter(p => p.uploadedBy?.id === targetUserId));
        setUserBooks(books.filter(b => b.uploadedBy?.id === targetUserId));
        if (isOwnProfile) {
          const savedWithStatus = posts.map((p) => {
            const saved = getSaveState(p.id);
            return {
              ...p,
              saved: saved !== null ? saved : p.saved
            };
          });
          setSavedPosts(savedWithStatus.filter(p => p.saved));
        }
        const links = await getLinks(targetUserId);
        const linkedUserIds = Object.entries(links).filter(([_, v]) => v).map(([id, _]) => id);
        const linkedUserData = await Promise.all(linkedUserIds.map(async (id) => {
          const u = await getUser(id);
          return u;
        }));
        setLinkedUsersProfile(linkedUserData.filter(Boolean));
      } catch (e) { console.warn('Failed to load profile data:', e); }
       finally { setLoading(false); }
     };
     if ((isOwnProfile && currentUser?.id) || (!isOwnProfile && userId)) load();
   }, [currentUser?.id, userId, isOwnProfile, initialized, savesInitialized, syncAllPosts, syncAllSaves, getLikeState, getSaveState]);

  const handleEdit = isOwnProfile ? updateProfile : () => {};

  const handlePost = useCallback(async (content, image, video, category, fileUrl, fileName) => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const userId = currentUser.id;
      const userData = {
        id: userId,
        name: currentUser?.name || 'Unknown',
        avatar: currentUser?.avatar || '',
        college: currentUser?.college || ''
      };

      const postId = await createPost({
        userId,
        user: userData,
        content,
        image,
        video,
        category,
        file_url: fileUrl,
        file_name: fileName,
        tags: [],
        timestamp: getCurrentTimestamp()
      });
      console.log('[Profile] Post created with ID:', postId);

      await new Promise((r) => setTimeout(r, 250));

      const allPosts = await getAllPostsWithDetails(userId);
      const myPosts = allPosts.filter((p) => p.userId === userId);

      const enrichedPosts = myPosts.map((p) => {
        const likeState = getLikeState(p.id);
        const saveState = getSaveState(p.id);
        const liked = likeState.liked !== null ? likeState.liked : p.liked;
        let likes = likeState.likes !== null ? likeState.likes : p.likes;
        if (liked && likes === 0) likes = 1;
        const saved = saveState !== null ? saveState : p.saved;
        return { ...p, liked, likes, saved };
      });
      setUserPosts(enrichedPosts);
    } catch (e) {
      console.error('handlePost error:', e);
      addToast(`Failed to publish post: ${e?.message || 'Database error'}`, 'error');
    }
  }, [currentUser?.id, currentUser?.name, currentUser?.avatar, currentUser?.college, getLikeState, getSaveState, isPostLiked, isPostSaved, addToast]);

  const renderContent = () => {
    if (loading) return <div className="card p-6 animate-pulse"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" /></div>;
    console.log('Rendering posts, userPosts length:', userPosts.length, 'posts:', userPosts.map(p => ({ id: p.id, userId: p.userId, content: p.content?.substring(0, 20) })));
    switch (activeTab) {
      case 'posts':
        return userPosts.length === 0 ? (<EmptyTab icon={Grid} title="No posts yet" description="Share your first post to see it here" />) : (
          <>
            <div className="grid grid-cols-3 gap-px sm:gap-1">{userPosts.map((post, i) => (
              <button 
                key={post.id} 
                onClick={() => {
                  const targetUserId = isOwnProfile ? currentUser?.id : userId;
                  navigate(`/posts/${targetUserId}`, {
                    state: { postId: post.id, posts: userPosts, profileUser }
                  });
                }}
                className="post-grid-item aspect-square relative overflow-hidden group bg-gray-200 dark:bg-gray-700 cursor-pointer"
                style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
              >
                {post.image ? (
                  <img src={post.image} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : post.file_url ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-blue-50 dark:bg-blue-900/10 text-blue-500 dark:text-blue-400 gap-1.5">
                    <Paperclip className="w-6 h-6 animate-pulse" />
                    <span className="text-[10px] font-semibold truncate w-full px-2">{post.file_name || 'Document'}</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-gray-600 dark:text-gray-300 break-words">{post.content?.substring(0, 50)}</div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                  <span className="flex items-center gap-1 text-white font-semibold text-sm"><Heart className="w-4 h-4 fill-current" />{post.likes || 0}</span>
                  <span className="flex items-center gap-1 text-white font-semibold text-sm"><MessageCircle className="w-4 h-4" />{post.comments?.length || 0}</span>
                </div>
              </button>
            ))}</div>
{selectedPost && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 md:p-10">
                <div className="absolute inset-0 bg-black/75 backdrop-blur-[8px] animate-fade-in" onClick={() => setSelectedPost(null)} style={{ animationDuration: '200ms' }} />
                
                <div className="relative w-full max-w-[1020px] h-[92vh] md:h-[80vh] bg-white dark:bg-[#0c1018] rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col md:flex-row border border-slate-100 dark:border-slate-800/80" style={{ boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.25)', animationDuration: '250ms' }} onClick={e => e.stopPropagation()}>
                  
                  {/* Media / Content Area (Left side) */}
                  <div 
                    className="relative flex-1 bg-[#05070a] flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-0 select-none cursor-pointer"
                    onDoubleClick={() => handleImageDoubleClick(selectedPost.id)}
                  >
                    {selectedPost.image ? (
                      <>
                        <div className="premium-blur-bg" style={{ backgroundImage: `url(${selectedPost.image})` }} />
                        <img src={selectedPost.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="relative z-10 max-w-full max-h-full object-contain p-4 transition-all duration-300 drop-shadow-xl" />
                      </>
                    ) : selectedPost.file_url ? (
                      <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                          <Paperclip className="w-8 h-8" />
                        </div>
                        <div className="max-w-xs">
                          <p className="text-white font-semibold text-sm truncate">{selectedPost.file_name || 'Document File'}</p>
                          <p className="text-xs text-gray-400 mt-1">Shared resource attachment</p>
                        </div>
                        <a 
                          href={selectedPost.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Download Attachment
                        </a>
                      </div>
                    ) : (
                      <div className="relative z-10 w-full h-full flex items-center justify-center mesh-gradient-post p-8">
                        <p className="text-white dark:text-slate-100 font-medium text-lg sm:text-xl text-center max-w-lg leading-relaxed whitespace-pre-wrap select-text">{selectedPost.content}</p>
                      </div>
                    )}

                    {/* Floating Heart Popup on Double-Click */}
                    {showHeartPop && (
                      <Heart className="w-20 h-20 text-red-500 fill-red-500 animate-heart-pop" />
                    )}

                    {/* Next & Previous Post Buttons */}
                    {userPosts.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleNavigatePost(-1); }} 
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full post-nav-btn text-white flex items-center justify-center"
                          aria-label="Previous Post"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleNavigatePost(1); }} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full post-nav-btn text-white flex items-center justify-center"
                          aria-label="Next Post"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Details / Comments Area (Right side) */}
                  <div className="w-full md:w-[400px] flex flex-col bg-white dark:bg-[#0c1018] border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/80">
                    
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={profileUser?.avatar} alt="" className="w-9 h-9 rounded-full ring-2 ring-offset-2 ring-blue-500/20 dark:ring-offset-[#0c1018]" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{profileUser?.name}</p>
                            {selectedPost.category && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 capitalize">{selectedPost.category}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">@{profileUser?.username}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-full transition-colors text-slate-600 dark:text-slate-400"><MoreHorizontal className="w-5 h-5" /></button>
                        <button onClick={() => setSelectedPost(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-full transition-colors text-slate-600 dark:text-slate-400 md:hidden"><X className="w-5 h-5" /></button>
                      </div>
                    </div>

                    {/* Caption & Comments List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {/* Caption (only show if it is not text-only post rendering main content in left panel) */}
                      {selectedPost.image || selectedPost.file_url ? (
                        <div className="flex gap-3 items-start pb-4 border-b border-slate-100/60 dark:border-slate-800/50">
                          <img src={profileUser?.avatar} alt="" className="w-8 h-8 rounded-full shrink-0" />
                          <div>
                            <p className="text-sm text-slate-900 dark:text-slate-100">
                              <span className="font-semibold mr-1.5 text-slate-900 dark:text-white">{profileUser?.name}</span>
                              <span className="whitespace-pre-wrap leading-relaxed">{selectedPost.content}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{formatTimeAgo(selectedPost.timestamp)}</p>
                          </div>
                        </div>
                      ) : null}

                      {/* Comments */}
                      <div className="space-y-3.5 pt-1">
                        {topLevelComments?.length > 0 ? (
                          topLevelComments.map((c) => {
                            const replies = getRepliesForComment(c.id);
                            return (
                              <div key={c.id} className="space-y-2.5 animate-fade-in">
                                {/* Top Level Comment */}
                                <div className="flex gap-3 items-start group">
                                  <img src={c.avatar} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800 dark:text-slate-200">
                                      <span className="font-semibold text-slate-900 dark:text-white mr-1.5">{c.name}</span>
                                      <span className="whitespace-pre-wrap leading-relaxed">{c.text}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2.5">
                                      <span>{formatTimeAgo(c.timestamp)}</span>
                                      <button 
                                        onClick={() => handleReplyClick(c)}
                                        className="font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors active:scale-95"
                                      >
                                        Reply
                                      </button>
                                    </p>
                                  </div>
                                </div>

                                {/* Replies */}
                                {replies.length > 0 && (
                                  <div className="pl-9 space-y-2 mt-1">
                                    <button
                                      onClick={() => toggleReplies(c.id)}
                                      className="flex items-center gap-2 text-[10.5px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors active:scale-95 mb-1"
                                    >
                                      <span className="w-4 h-px bg-slate-200 dark:bg-slate-850" />
                                      {expandedReplies[c.id] ? 'Hide replies' : `View replies (${replies.length})`}
                                    </button>

                                    {expandedReplies[c.id] && (
                                      <div className="space-y-3 border-l border-slate-100 dark:border-white/[0.05] pl-3.5 ml-2 mt-2.5 animate-fade-in">
                                        {replies.map((reply) => (
                                          <div key={reply.id} className="flex gap-2.5 items-start animate-fade-in">
                                            <img src={reply.avatar} alt="" className="w-6.5 h-6.5 rounded-full shrink-0 object-cover border border-slate-100 dark:border-white/10" />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[13px] text-slate-800 dark:text-slate-200 font-normal">
                                                <span className="font-semibold text-slate-900 dark:text-white mr-1.5">{reply.name}</span>
                                                {reply.text}
                                              </p>
                                              <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2.5">
                                                <span>{formatTimeAgo(reply.timestamp)}</span>
                                                <button 
                                                  onClick={() => handleReplyClick(c)}
                                                  className="font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors active:scale-95"
                                                >
                                                  Reply
                                                </button>
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center mb-2 border border-slate-100/50 dark:border-slate-800/50">
                              <MessageCircle className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                            </div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No comments yet</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Start the conversation below</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions Panel */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-white/60 dark:bg-[#0c1018]/60 backdrop-blur-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleLikePost(selectedPost.id)} 
                            className={`transition-all hover:scale-110 active:scale-90 ${selectedPost.liked ? 'text-red-500' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            aria-label="Like Post"
                          >
                            <Heart className="w-6 h-6" fill={selectedPost.liked ? 'currentColor' : 'none'} />
                          </button>
                          <button 
                            onClick={() => {
                              const inputEl = document.getElementById('comment-input-field');
                              inputEl?.focus();
                            }} 
                            className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all hover:scale-110 active:scale-90"
                            aria-label="Write a comment"
                          >
                            <MessageCircle className="w-6 h-6" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (navigator.share) {
                                navigator.share({ 
                                  title: 'StuGrow Post', 
                                  text: selectedPost.content, 
                                  url: window.location.origin + '/post/' + selectedPost.id 
                                });
                              } else {
                                navigator.clipboard.writeText(window.location.origin + '/post/' + selectedPost.id);
                                addToast('Link copied to clipboard', 'success');
                              }
                            }}
                            className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all hover:scale-110 active:scale-90"
                            title="Share"
                          >
                            <Share2 className="w-6 h-6" />
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => handleSavePost(selectedPost.id)}
                          className={`transition-all hover:scale-110 active:scale-90 ${selectedPost.saved ? 'text-amber-500' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                          aria-label="Save Post"
                        >
                          <Bookmark className="w-6 h-6" fill={selectedPost.saved ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      <div className="mt-3">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedPost.likes || 0} likes</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mt-0.5">
                          {new Date(selectedPost.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Comment Input */}
                      <div className="mt-3">
                        {replyingTo && (
                          <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/40 dark:border-blue-900/20 text-[10px] text-slate-500 dark:text-slate-400 rounded-xl mb-2 animate-fade-in">
                            <span>Replying to <span className="font-bold text-blue-500">@{replyingTo.name}</span></span>
                            <button onClick={() => setReplyingTo(null)} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2.5 items-center">
                          <img src={currentUser?.avatar} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                          <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-full px-3.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/35 transition-all">
                            <input 
                              id="comment-input-field"
                              type="text" 
                              value={commentText} 
                              onChange={e => setCommentText(e.target.value)} 
                              onKeyDown={e => { if (e.key === 'Enter' && commentText.trim()) handlePostComment(selectedPost.id); }}
                              placeholder={replyingTo ? `Reply to @${replyingTo.name?.split(' ')[0]}…` : "Add a comment..."}
                              className="flex-1 text-xs bg-transparent border-none text-slate-900 dark:text-white focus:outline-none focus:ring-0 placeholder-slate-400 dark:placeholder-slate-500 py-0.5" 
                            />
                            <button 
                              onClick={() => handlePostComment(selectedPost.id)} 
                              disabled={!commentText.trim()}
                              className="text-blue-500 text-xs font-semibold disabled:opacity-40 hover:text-blue-600 transition-colors px-1"
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
                
                {/* Floating Close Button for Desktop */}
                <button 
                  onClick={() => setSelectedPost(null)} 
                  className="absolute top-4 right-4 z-[1000] p-2.5 rounded-full bg-black/40 hover:bg-black/60 transition-all duration-200 hover:rotate-90 hidden md:flex items-center justify-center"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
          </>
        );
      case 'resources':
        return (
          <div className="profile-entrance">
            {isOwnProfile && (
              <div className="upload-form-card mb-4">
                {!showUploadPaper ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="upload-form-title">Share Question Papers</h3>
                      <p className="upload-form-subtitle">Help fellow students with your resources</p>
                    </div>
                    <button onClick={() => setShowUploadPaper(true)} className="upload-form-upload-btn">
                      <Upload className="w-4 h-4" />Upload
                    </button>
                  </div>
                ) : (
                  <div className="upload-form-content">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="upload-form-header">Upload Question Paper</h3>
                      <button onClick={() => { setShowUploadPaper(false); setUploadPaperForm({ title: '', branch: '', semester: '', year: '' }); setPaperFile(null); setPaperFilePreview(null); }} className="upload-form-close"><X className="w-4 h-4" /></button>
                    </div>
                    <input type="text" placeholder="Paper title" className="upload-form-input w-full" value={uploadPaperForm.title} onChange={(e) => setUploadPaperForm(p => ({ ...p, title: e.target.value }))} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <CustomSelect
                        value={uploadPaperForm.branch}
                        onChange={(val) => setUploadPaperForm(p => ({ ...p, branch: val }))}
                        options={branches}
                        placeholder="Select Branch"
                      />
                      <CustomSelect
                        value={uploadPaperForm.semester}
                        onChange={(val) => setUploadPaperForm(p => ({ ...p, semester: val }))}
                        options={semesters}
                        placeholder="Select Semester"
                      />
                    </div>
                    <input type="text" placeholder="Year (e.g., 2025)" className="upload-form-input w-full" value={uploadPaperForm.year} onChange={(e) => setUploadPaperForm(p => ({ ...p, year: e.target.value }))} />
                    <div>
                      <input ref={paperFileInputRef} type="file" accept=".pdf,.doc,.docx,image/*,video/*" className="hidden-input" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPaperFile(file);
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setPaperFilePreview(ev.target.result);
                            reader.readAsDataURL(file);
                          } else {
                            setPaperFilePreview(null);
                          }
                        }
                      }} />
                      <button onClick={() => paperFileInputRef.current?.click()} className={`upload-form-file-btn w-full ${paperFile ? 'file-selected' : ''}`}>
                        {paperFile ? <><span className="text-green-600">✓</span> {paperFile.name}</> : <><Upload className="w-[18px] h-[18px]" />Choose file from device</>}
                      </button>
                      {paperFilePreview && <div className="relative mt-3"><img src={paperFilePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" /><button onClick={() => { setPaperFile(null); setPaperFilePreview(null); }} className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"><X className="w-4 h-4" /></button></div>}
                    </div>
<button onClick={async () => {
                       if (!uploadPaperForm.title.trim()) return;
                       setUploadingPaper(true);
                       let fileUrl = null, fileType = '', fileName = '', fileSize = '';
                       try {
                         if (paperFile) {
                           if (paperFile.type.startsWith('video/')) fileUrl = await uploadToGofile(paperFile);
                           else fileUrl = await uploadToCloudinary(paperFile, 'stugrow/papers');
                           fileType = paperFile.type; fileName = paperFile.name; fileSize = `${(paperFile.size / 1024).toFixed(1)} KB`;
                         }
                         await createPaper({
                           title: uploadPaperForm.title, subject: uploadPaperForm.branch || 'General', semester: uploadPaperForm.semester || 'N/A',
                           year: uploadPaperForm.year || 'N/A', college: currentUser.college, uploadedBy: currentUser.id,
                           fileUrl, fileType, fileName, fileSize
                         });
                         addToast('Paper uploaded successfully!', 'success');
                         const papers = await getAllPapers();
                         setUserPapers(papers.filter(p => p.uploadedBy?.id === currentUser.id));
                         setShowUploadPaper(false);
                         setUploadPaperForm({ title: '', branch: '', semester: '', year: '' });
                         setPaperFile(null);
                         setPaperFilePreview(null);
                       } catch (e) { addToast(`Failed to upload paper: ${e.message}`, 'error'); }
                       finally { setUploadingPaper(false); }
                     }} disabled={!uploadPaperForm.title.trim() || uploadingPaper} className="upload-form-submit-btn w-full">{uploadingPaper ? 'Uploading...' : 'Submit Paper'}</button>
                  </div>
                )}
              </div>
            )}
            {userPapers.length === 0 ? (<EmptyTab icon={FileText} title="No resources shared" description="Upload question papers to help fellow students" />) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{userPapers.map(paper => (<div key={paper.id} className="card p-4 sm:p-5"><div className="flex items-start gap-3 sm:gap-4"><div className="w-10 h-12 sm:w-12 sm:h-14 rounded-lg bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" /></div><div><h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm sm:text-base">{paper.title}</h3><p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-2">{paper.subject} · {paper.semester}</p><div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500 dark:text-slate-400"><span>{paper.downloads} downloads</span></div></div></div></div>))}</div>
            )}
          </div>
        );
case 'books':
        return (
          <div className="profile-entrance">
            {isOwnProfile && (
              <div className="upload-form-card mb-4">
                {!showUploadBook ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="upload-form-title">Upload Your Books</h3>
                      <p className="upload-form-subtitle">Share PDF books with others</p>
                    </div>
                    <button onClick={() => setShowUploadBook(true)} className="upload-form-upload-btn">
                      <Upload className="w-4 h-4" />Upload
                    </button>
                  </div>
                ) : (
                  <div className="upload-form-content">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="upload-form-header">Upload Book (PDF)</h3>
                      <button onClick={() => { setShowUploadBook(false); setUploadBookForm({ title: '', author: '', subject: '', description: '' }); setBookImage(null); setBookPdfFile(null); }} className="upload-form-close"><X className="w-4 h-4" /></button>
                    </div>
                    <input type="text" placeholder="Book title" className="upload-form-input w-full" value={uploadBookForm.title} onChange={(e) => setUploadBookForm(p => ({ ...p, title: e.target.value }))} />
                    <input type="text" placeholder="Author name" className="upload-form-input w-full" value={uploadBookForm.author} onChange={(e) => setUploadBookForm(p => ({ ...p, author: e.target.value }))} />
                    <CustomSelect
                      value={uploadBookForm.subject}
                      onChange={(val) => setUploadBookForm(p => ({ ...p, subject: val }))}
                      options={branches}
                      placeholder="Select Subject"
                    />
                    <textarea placeholder="Description" className="upload-form-input w-full resize-none" rows={3} value={uploadBookForm.description} onChange={(e) => setUploadBookForm(p => ({ ...p, description: e.target.value }))} />
                    
                    {/* PDF File Upload - Required */}
                    <div>
                      <label className="upload-form-label">Book PDF File <span className="text-red-400">*</span></label>
                      <input ref={bookPdfInputRef} type="file" accept=".pdf" className="hidden-input" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBookPdfFile(file);
                        }
                      }} />
                      <button onClick={() => bookPdfInputRef.current?.click()} className={`upload-form-file-btn w-full ${bookPdfFile ? 'file-selected' : ''}`}>
                        {bookPdfFile ? <><span className="text-green-600">✓</span> {bookPdfFile.name}</> : <><FileText className="w-[18px] h-[18px]" />Choose PDF file</>}
                      </button>
                    </div>

{/* Cover Image Upload - Optional */}
                     <div>
                       <label className="upload-form-label">Cover Image (Optional)</label>
                       <input ref={bookFileInputRef} type="file" accept="image/*" className="hidden-input" onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.onload = (ev) => setBookImage(ev.target.result);
                           reader.readAsDataURL(file);
                           bookCoverFileRef.current = file;
                         }
                       }} />
                       <button onClick={() => bookFileInputRef.current?.click()} className={`upload-form-file-btn w-full ${bookImage ? 'file-selected' : ''}`}>
                         {bookImage ? <><span className="text-green-600">✓</span> Change cover</> : <><Camera className="w-[18px] h-[18px]" />Upload cover image</>}
                       </button>
                       {bookImage && <div className="relative mt-3 inline-block"><img src={bookImage} alt="Book cover" className="w-32 h-40 object-cover rounded-xl" /><button onClick={() => { setBookImage(null); bookCoverFileRef.current = null; }} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"><X className="w-3.5 h-3.5" /></button></div>}
                     </div>

<button onClick={async () => {
                        console.log('Books upload clicked - currentUser:', currentUser?.id ? 'logged in as ' + currentUser.id : 'NOT LOGGED IN');
                        if (!uploadBookForm.title.trim() || !uploadBookForm.author.trim() || !bookPdfFile) {
                          console.error('Missing required fields - title:', uploadBookForm.title, 'author:', uploadBookForm.author, 'pdf:', !!bookPdfFile);
                          return;
                        }
                        if (!currentUser?.id) {
                          addToast('Please log in first', 'error');
                          return;
                        }
                        setUploadingBook(true);
                        let imageUrl = null, fileUrl = null;
                        try {
                          console.log('Books upload - title:', uploadBookForm.title, 'author:', uploadBookForm.author, 'pdf:', bookPdfFile?.name);
                          // Upload cover image if provided
                          if (bookCoverFileRef.current) {
                            console.log('Uploading book cover to Cloudinary');
                            imageUrl = await uploadToCloudinary(bookCoverFileRef.current, 'stugrow/books/covers');
                            console.log('Book cover URL:', imageUrl);
                          }
                          // Upload PDF file - try Gofile first, fallback to Cloudinary
                          console.log('Uploading PDF to Gofile:', bookPdfFile.name);
                          try {
                            fileUrl = await uploadToGofile(bookPdfFile);
                            console.log('PDF URL from Gofile:', fileUrl);
                          } catch (gofileErr) {
                            console.warn('Gofile failed, falling back to Cloudinary:', gofileErr);
                            fileUrl = await uploadToCloudinary(bookPdfFile, 'stugrow/books/pdfs');
                            console.log('PDF URL from Cloudinary:', fileUrl);
                          }

                          const bookId = await createBook({
                            title: uploadBookForm.title,
                            author: uploadBookForm.author,
                            subject: uploadBookForm.subject || 'General',
                            price: 'Free',
                            uploadedBy: currentUser.id,
                            available: true,
                            image: imageUrl,
                            description: uploadBookForm.description,
                            fileUrl,
                            fileName: bookPdfFile.name,
                          });
                          console.log('Book created with ID:', bookId);
                          addToast('Book uploaded successfully!', 'success');
                          const books = await getAllBooks();
                          setUserBooks(books.filter(b => b.uploadedBy?.id === currentUser.id));
                          setShowUploadBook(false);
                          setUploadBookForm({ title: '', author: '', subject: '', description: '' });
                          setBookImage(null);
                          setBookPdfFile(null);
                        } catch (e) { console.error('Book upload error:', e); addToast(`Failed to upload book: ${e.message}`, 'error'); }
                        finally { setUploadingBook(false); }
                      }} disabled={!uploadBookForm.title.trim() || !uploadBookForm.author.trim() || !bookPdfFile || uploadingBook} className="upload-form-submit-btn w-full">{uploadingBook ? 'Uploading...' : 'Submit Book'}</button>
                  </div>
                )}
              </div>
            )}
            {userBooks.length === 0 ? (<EmptyTab icon={BookOpen} title="No books listed" description="Upload PDF books to share with others" />) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{userBooks.map(book => (
                <div key={book.id} className="card overflow-hidden flex">
                  {book.image ? (
                    <div className="w-20 sm:w-24 h-28 sm:h-32 flex-shrink-0"><img src={book.image} alt={book.title} className="w-full h-full object-cover" /></div>
                  ) : (
                    <div className="w-20 sm:w-24 h-28 sm:h-32 bg-[#f3f1ed] dark:bg-[#0e1322] flex-shrink-0 flex items-center justify-center"><FileText className="w-8 h-8 text-slate-400" /></div>
                  )}
                  <div className="p-3 sm:p-4 flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm sm:text-base">{book.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-2">{book.author}</p>
                    {book.fileUrl && (
                      <a href={book.fileUrl} download={book.fileName || book.title} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs flex items-center justify-center gap-1"><Download className="w-3.5 h-3.5" />Download</a>
                    )}
                  </div>
                </div>
              ))}</div>
            )}
          </div>
        );
      case 'saved':
        if (!isOwnProfile) return null;
        return savedPosts.length === 0 ? (<EmptyTab icon={Bookmark} title="No saved items yet" description="Save posts to access them later" />) : (
          <div className="space-y-4">{savedPosts.map(post => (<div key={post.id} className="card p-4 sm:p-6"><div className="flex items-center gap-2 mb-3"><img src={post.user?.avatar} alt="" className="w-8 h-8 rounded-full object-cover" onError={(e) => handleAvatarError(e, post.user?.name)} /><div><p className="text-sm font-medium text-slate-900 dark:text-white">{post.user?.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{formatTimeAgo(post.timestamp)}</p></div></div>{post.image && <img src={post.image} alt="" className="w-full h-48 object-cover rounded-xl mb-3" />}<p className="text-sm text-slate-700 dark:text-slate-300">{post.content}</p></div>))}</div>
        );
      case 'connections':
        return linkedUsersProfile.length === 0 ? (<EmptyTab icon={Users} title="No connections yet" description="Connect with students to see them here" />) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 sm:gap-6">{linkedUsersProfile.map(u => (<div key={u.id} className="text-center p-2"><button onClick={() => navigate(`/profile/${u.id}`)} className="block group"><img src={u.avatar} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mx-auto mb-2 border-2 border-gray-100 dark:border-gray-700 group-hover:border-blue-400 group-hover:scale-105 transition-all duration-200" onError={(e) => handleAvatarError(e, u.name)} /><p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">{u.name}</p><p className="text-xs text-gray-500">@{u.username}</p></button></div>))}</div>
        );
      default: return null;
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto profile-page-bg profile-safe-area pb-28 lg:pb-8">
      <ProfileHeader user={profileUser} onEdit={handleEdit} isOwnProfile={isOwnProfile} onMessage={handleSendMessage} bindsCount={linkedUsersProfile?.length || 0} />
      {isOwnProfile && activeTab === 'posts' && <CreatePost onPost={handlePost} user={currentUser} />}
      <div className="profile-tabs-container">
        <div className="profile-tabs">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon className="w-4 h-4 inline-block mr-1.5" />{tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="tab-content-enter" key={activeTab}>
        {renderContent()}
      </div>
    </div>
  );
}
