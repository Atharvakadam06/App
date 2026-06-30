import { useState, useRef } from 'react';
import { X, Image, Camera, Paperclip } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { uploadToCloudinary } from '../services/cloudinary';
import { handleAvatarError } from '../utils/avatarUtils';

export default function CreatePost({ onPost, user }) {
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();
  
  const selectedFileRef = useRef(null);
  const selectedDocRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const docInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;
    console.log('File selected:', file.name, file.type, file.size);
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
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
    
    // Clear document if image is selected
    setSelectedDoc(null);
    selectedDocRef.current = null;
  };

  const handleDocSelect = (file) => {
    if (!file) return;
    console.log('Document selected:', file.name, file.type, file.size);
    if (file.size > 50 * 1024 * 1024) {
      addToast('File must be less than 50MB', 'error');
      return;
    }
    selectedDocRef.current = file;
    setSelectedDoc({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    });

    // Clear image/photo if document is selected
    setImagePreview(null);
    selectedFileRef.current = null;
  };

  const handlePost = async () => {
    console.log('[CreatePost] handlePost - content:', content.substring(0, 20), 'hasFile:', !!selectedFileRef.current, 'hasDoc:', !!selectedDocRef.current);
    if (!content.trim() && !selectedFileRef.current && !selectedDocRef.current) {
      addToast('Add text, image, or a file to post', 'info');
      return;
    }
    if (!user?.id) {
      addToast('Please log in first', 'error');
      return;
    }
    setUploading(true);
    let imageUrl = null;
    let fileUrl = null;
    let fileName = null;
    try {
      if (selectedFileRef.current) {
        console.log('[CreatePost] Uploading image to Cloudinary:', selectedFileRef.current.name);
        imageUrl = await uploadToCloudinary(selectedFileRef.current, 'stugrow/posts');
        console.log('[CreatePost] Image URL received:', imageUrl);
      }
      if (selectedDocRef.current) {
        console.log('[CreatePost] Uploading document to Cloudinary:', selectedDocRef.current.name);
        fileUrl = await uploadToCloudinary(selectedDocRef.current, 'stugrow/posts');
        fileName = selectedDocRef.current.name;
        console.log('[CreatePost] Document URL received:', fileUrl);
      }
      await onPost?.(content, imageUrl, null, 'general', fileUrl, fileName);
      setContent('');
      setImagePreview(null);
      selectedFileRef.current = null;
      setSelectedDoc(null);
      selectedDocRef.current = null;
      addToast(imageUrl ? 'Post with image published!' : fileUrl ? 'Post with file published!' : 'Post published!', 'success');
    } catch (error) {
      console.error('[CreatePost] Post failed:', error);
      addToast('Failed to post: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="profile-post-card">
        <div className="flex gap-3">
          <img src={user?.avatar} alt="" className="profile-post-avatar" onError={(e) => handleAvatarError(e, user?.name)} />
          <div className="flex-1 flex flex-col">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
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
            {selectedDoc && (
              <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800/80 mt-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedDoc.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedDoc.size}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedDoc(null); selectedDocRef.current = null; }}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="profile-post-actions mt-2">
              <div className="flex items-center gap-1">
                <button onClick={() => fileInputRef.current?.click()} className="profile-media-icon-btn" title="Add image">
                  <Image className="w-5 h-5" />
                </button>
                <button onClick={() => cameraInputRef.current?.click()} className="profile-media-icon-btn" title="Take photo">
                  <Camera className="w-5 h-5" />
                </button>
                <button onClick={() => docInputRef.current?.click()} className="profile-media-icon-btn" title="Add file">
                  <Paperclip className="w-5 h-5" />
                </button>
              </div>
              <button onClick={handlePost} disabled={(!content.trim() && !imagePreview && !selectedDoc) || uploading} className="profile-post-btn">
                {uploading ? 'Publishing...' : 'Post'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden-input"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden-input"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
            <input
              ref={docInputRef}
              type="file"
              className="hidden-input"
              onChange={(e) => handleDocSelect(e.target.files?.[0])}
            />
          </div>
        </div>
      </div>
    </>
  );
}