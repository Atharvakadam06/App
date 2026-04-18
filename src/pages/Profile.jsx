import { useState, useRef, useEffect, useMemo } from 'react';
import { Edit2, MapPin, Calendar, Settings, Grid, Bookmark, Award, FileText, BookOpen, X, Check, Camera, Heart, User, MessageCircle, Image, Send, Upload, Trash2, Download, Link2, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import { uploadToCloudinary } from '../services/cloudinary';
import { uploadToGofile } from '../services/gofile';
import { createPost, createPaper, createBook, getAllPosts, getAllPapers, getAllBooks, isPostSaved, getLinks, getUser, createConversation } from '../services/data';
import { formatTimeAgo, getCurrentTimestamp } from '../utils/timeUtils';
import { branches, semesters } from '../data/mockData';
import CustomSelect from '../components/CustomSelect';

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
                <img src={user.avatar} alt={user?.name} className="w-full h-full rounded-full object-cover" />
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

function CreatePost({ onPost, user }) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const { addToast } = useToast();
  const selectedFileRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMediaMenu(false);
      }
    }
    if (showMediaMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMediaMenu]);

const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.log('Camera permission denied:', err);
      return false;
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (type === 'camera' && !file.type.startsWith('image/')) {
      addToast('Please select an image from camera', 'error');
      return;
    }
    
    if (type === 'document') {
      const allowedTypes = ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const isAllowed = allowedTypes.some(t => file.type.match(t) || file.name.match(/\.(pdf|doc|docx)$/i));
      if (!isAllowed) {
        addToast('Please select an image or document (PDF, Word)', 'error');
        return;
      }
    } else if (!file.type.startsWith('image/')) {
      addToast('Please select an image', 'error');
      return;
    }
    
    if (file.size > 20 * 1024 * 1024) {
      addToast('File must be less than 20MB', 'error');
      return;
    }
    
    selectedFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    
    setShowMediaMenu(false);
    e.target.value = '';
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      addToast('Camera permission denied. Please allow camera access in your browser settings.', 'error');
      return;
    }
    cameraInputRef.current?.click();
  };

  const selectFromGallery = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{ description: 'Images', accept: {'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']} }],
          multiple: false
        });
        const file = await fileHandle.getFile();
        selectedFileRef.current = file;
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
        setShowMediaMenu(false);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('File picker error:', err);
        }
        return;
      }
    }
    fileInputRef.current?.click();
  };

  const selectDocument = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{ description: 'Documents & Images', accept: {'image/*': ['.*'], 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']} }],
          multiple: false
        });
        const file = await fileHandle.getFile();
        selectedFileRef.current = file;
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
        setShowMediaMenu(false);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('File picker error:', err);
        }
        return;
      }
    }
    documentInputRef.current?.click();
  };

  const handlePost = async () => {
    if (!content.trim() && !selectedFileRef.current) return;
    let imageUrl = null;
    setUploading(true);

    try {
      if (selectedFileRef.current) {
        imageUrl = await uploadToCloudinary(selectedFileRef.current, 'stugrow/posts');
      }
    } catch {
      addToast('Image upload failed', 'error');
      setUploading(false);
      return;
    }

    try {
      onPost?.(content, imageUrl, null, 'general');
      setContent('');
      setImagePreview(null);
      selectedFileRef.current = null;
      addToast('Post published successfully', 'success');
    } catch {
      addToast('Failed to publish post', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`profile-post-card ${isFocused || imagePreview ? 'ring-2 ring-indigo-500/30' : ''}`}>
      <div className="flex gap-3">
        <img src={user?.avatar} alt={user?.name} className="profile-post-avatar ring-1 ring-slate-100 dark:ring-slate-700" />
        <div className="flex-1 flex flex-col">
          <textarea 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            onFocus={() => setIsFocused(true)}
            onBlur={() => !content && !imagePreview && setIsFocused(false)}
            placeholder="Share something with your campus..." 
            className="profile-post-textarea" 
          />

          {imagePreview && (
            <div className="profile-image-preview">
              <img src={imagePreview} alt="Preview" />
              <button onClick={() => { setImagePreview(null); selectedFileRef.current = null; }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="profile-post-actions mt-2">
            <div className="flex items-center gap-1">
              <button 
                onClick={openCamera} 
                className="profile-media-icon-btn"
                title="Take Photo"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button 
                onClick={selectFromGallery} 
                className="profile-media-icon-btn"
                title="Choose from Photos"
              >
                <Image className="w-5 h-5" />
              </button>
              <button 
                onClick={selectDocument} 
                className="profile-media-icon-btn"
                title="Add Document"
              >
                <FileText className="w-5 h-5" />
              </button>
            </div>
            <button onClick={() => onPost?.()} disabled={(!content.trim() && !imagePreview) || uploading} className="profile-post-btn">
              {uploading ? 'Publishing...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden-input" onChange={(e) => handleFileChange(e, 'gallery')} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden-input" onChange={(e) => handleFileChange(e, 'camera')} />
      <input ref={documentInputRef} type="file" accept="image/*,application/pdf,.pdf,.doc,.docx" className="hidden-input" onChange={(e) => handleFileChange(e, 'document')} />
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

  useEffect(() => {
    const activeTabEl = document.querySelector(`[data-tab="${activeTab}"]`);
    if (activeTabEl) {
      setTabUnderline({
        left: activeTabEl.offsetLeft,
        width: activeTabEl.offsetWidth
      });
    }
  }, [activeTab]);

  useEffect(() => {
    const load = async () => {
      try {
        const targetUserId = isOwnProfile ? currentUser?.id : userId;
        const [posts, papers, books] = await Promise.all([getAllPosts(), getAllPapers(), getAllBooks()]);
        setUserPosts(posts.filter(p => p.userId === targetUserId));
        setUserPapers(papers.filter(p => p.uploadedBy?.id === targetUserId));
        setUserBooks(books.filter(b => b.uploadedBy?.id === targetUserId));
        if (isOwnProfile) {
          const savedWithStatus = await Promise.all(posts.map(async (p) => ({
            ...p,
            saved: await isPostSaved(p.id, targetUserId)
          })));
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
  }, [currentUser?.id, userId, isOwnProfile]);

  const handleEdit = isOwnProfile ? updateProfile : () => {};

  const handlePost = async (content, image, video, category) => {
    try {
      const userId = currentUser?.id;
      if (!userId) {
        console.error('No user ID found');
        return;
      }
      
      const userData = { 
        id: userId, 
        name: currentUser?.name || 'Unknown', 
        avatar: currentUser?.avatar || '', 
        college: currentUser?.college || '' 
      };
      
      console.log('Creating post with userData:', userData);
      console.log('Content:', content, 'Image:', image ? 'yes' : 'no');
      
      await createPost({ 
        userId, 
        user: userData, 
        content, 
        image, 
        video, 
        category, 
        tags: [], 
        timestamp: getCurrentTimestamp() 
      });
      
      console.log('Post created, refreshing...');
      
      // Force refresh with a slight delay to ensure DB is updated
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const allPosts = await getAllPosts();
      console.log('All posts count:', allPosts.length);
      console.log('Looking for userId:', userId);
      
      const myPosts = allPosts.filter(p => p.userId === userId);
      console.log('My posts count:', myPosts.length);
      
      // Force update to trigger re-render
      setUserPosts([...myPosts]);
      
      console.log('State updated, userPosts length:', myPosts.length);
    } catch (e) { 
      console.error('handlePost error:', e); 
    }
  };

  const renderContent = () => {
    if (loading) return <div className="card p-6 animate-pulse"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" /></div>;
    console.log('Rendering posts, userPosts length:', userPosts.length, 'posts:', userPosts.map(p => ({ id: p.id, userId: p.userId, content: p.content?.substring(0, 20) })));
    switch (activeTab) {
      case 'posts':
        return userPosts.length === 0 ? (<EmptyTab icon={Grid} title="No posts yet" description="Share your first post to see it here" />) : (
          <div className="space-y-4">{userPosts.map(post => (<div key={post.id} className="card p-4 sm:p-6">{post.image && <img src={post.image} alt="" className="w-full h-48 object-cover rounded-xl mb-3" />}<p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 mb-4">{post.content}</p><div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400"><span className="flex items-center gap-1"><Heart className="w-4 h-4" />{post.likes}</span><span>{post.comments?.length || 0} comments</span><span>{formatTimeAgo(post.timestamp)}</span></div></div>))}</div>
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
                      } catch { addToast('Failed to upload paper', 'error'); }
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
                          bookFileInputRef.current = file;
                        }
                      }} />
                      <button onClick={() => bookFileInputRef.current?.click()} className={`upload-form-file-btn w-full ${bookImage ? 'file-selected' : ''}`}>
                        {bookImage ? <><span className="text-green-600">✓</span> Change cover</> : <><Camera className="w-[18px] h-[18px]" />Upload cover image</>}
                      </button>
                      {bookImage && <div className="relative mt-3 inline-block"><img src={bookImage} alt="Book cover" className="w-32 h-40 object-cover rounded-xl" /><button onClick={() => { setBookImage(null); bookFileInputRef.current = null; }} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"><X className="w-3.5 h-3.5" /></button></div>}
                    </div>

                    <button onClick={async () => {
                      if (!uploadBookForm.title.trim() || !uploadBookForm.author.trim() || !bookPdfFile) return;
                      setUploadingBook(true);
                      let imageUrl = null, fileUrl = null;
                      try {
                        // Upload cover image if provided
                        if (bookFileInputRef.current) {
                          imageUrl = await uploadToCloudinary(bookFileInputRef.current, 'stugrow/books/covers');
                        }
                        // Upload PDF file
                        fileUrl = await uploadToGofile(bookPdfFile);
                        
                        await createBook({
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
                        addToast('Book uploaded successfully!', 'success');
                        const books = await getAllBooks();
                        setUserBooks(books.filter(b => b.uploadedBy?.id === currentUser.id));
                        setShowUploadBook(false);
                        setUploadBookForm({ title: '', author: '', subject: '', description: '' });
                        setBookImage(null);
                        setBookPdfFile(null);
                      } catch { addToast('Failed to upload book', 'error'); }
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
          <div className="space-y-4">{savedPosts.map(post => (<div key={post.id} className="card p-4 sm:p-6"><div className="flex items-center gap-2 mb-3"><img src={post.user?.avatar} alt="" className="w-8 h-8 rounded-full" /><div><p className="text-sm font-medium text-slate-900 dark:text-white">{post.user?.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{formatTimeAgo(post.timestamp)}</p></div></div>{post.image && <img src={post.image} alt="" className="w-full h-48 object-cover rounded-xl mb-3" />}<p className="text-sm text-slate-700 dark:text-slate-300">{post.content}</p></div>))}</div>
        );
      case 'connections':
        return linkedUsersProfile.length === 0 ? (<EmptyTab icon={Users} title="No connections yet" description="Connect with students to see them here" />) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 sm:gap-6">{linkedUsersProfile.map(u => (<div key={u.id} className="text-center p-2"><button onClick={() => navigate(`/profile/${u.id}`)} className="block group"><img src={u.avatar} alt={u.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mx-auto mb-2 border-2 border-gray-100 dark:border-gray-700 group-hover:border-blue-400 group-hover:scale-105 transition-all duration-200" /><p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">{u.name}</p><p className="text-xs text-gray-500">@{u.username}</p></button></div>))}</div>
        );
      default: return null;
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto overflow-x-hidden profile-page-bg profile-safe-area">
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