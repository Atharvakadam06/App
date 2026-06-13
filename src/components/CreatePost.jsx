import { useState, useRef } from 'react';
import { X, Image } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { uploadToCloudinary } from '../services/cloudinary';

export default function CreatePost({ onPost, user }) {
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();
  const selectedFileRef = useRef(null);

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
  };

  const handlePost = async () => {
    if (!content.trim() && !selectedFileRef.current) {
      addToast('Add text or image to post', 'info');
      return;
    }
    setUploading(true);
    let imageUrl = null;
    try {
      if (selectedFileRef.current) {
        console.log('Uploading to Cloudinary:', selectedFileRef.current.name);
        imageUrl = await uploadToCloudinary(selectedFileRef.current, 'stugrow/posts');
        console.log('Cloudinary URL received:', imageUrl);
      }
      console.log('Creating post with:', { content: content.substring(0, 20), hasImage: !!imageUrl, imageUrl });
      await onPost?.(content, imageUrl, null, 'general');
      setContent('');
      setImagePreview(null);
      selectedFileRef.current = null;
      addToast(imageUrl ? 'Post with image published!' : 'Post published!', 'success');
    } catch (error) {
      console.error('Post failed:', error);
      addToast('Failed to post: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="profile-post-card">
        <div className="flex gap-3">
          <img src={user?.avatar} alt={user?.name} className="profile-post-avatar" />
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
            <div className="profile-post-actions mt-2">
              <div className="flex items-center gap-1">
                <button onClick={() => document.getElementById('post-image-input')?.click()} className="profile-media-icon-btn" title="Add image">
                  <Image className="w-5 h-5" />
                </button>
              </div>
              <button onClick={handlePost} disabled={(!content.trim() && !imagePreview) || uploading} className="profile-post-btn">
                {uploading ? 'Publishing...' : 'Post'}
              </button>
            </div>
            <input
              id="post-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
          </div>
        </div>
      </div>
    </>
  );
}