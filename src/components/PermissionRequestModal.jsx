import { useState, useEffect } from 'react';
import { Camera, Image, FileText, Check } from 'lucide-react';

export default function PermissionRequestModal({ 
  isOpen, 
  onClose, 
  onAllowAll, 
  onAllowCamera, 
  onAllowPhotos, 
  onAllowDocuments 
}) {
  const [permissions, setPermissions] = useState({
    camera: { requested: false, granted: false },
    photos: { requested: false, granted: false },
    documents: { requested: false, granted: false }
  });

  const requestPermission = async (type) => {
    setPermissions(prev => ({ ...prev, [type]: { ...prev[type], requested: true } }));
    
    try {
      let granted = false;
      
      if (type === 'camera') {
        granted = await requestCameraPermission();
      } else if (type === 'photos') {
        granted = await requestPhotoPermission();
      } else if (type === 'documents') {
        granted = await requestDocumentPermission();
      }
      
      setPermissions(prev => ({ 
        ...prev, 
        [type]: { requested: true, granted } 
      }));
      
      return granted;
    } catch (error) {
      console.error(`Failed to request ${type} permission:`, error);
      setPermissions(prev => ({ 
        ...prev, 
        [type]: { requested: true, granted: false } 
      }));
      return false;
    }
  };

  const allGranted = permissions.camera.granted && permissions.photos.granted && permissions.documents.granted;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Media Permissions</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">StuGrow needs access to create posts</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {/* Camera Permission */}
          <PermissionItem
            icon={<Camera className="w-5 h-5" />}
            title="Camera"
            description="Take photos and videos directly"
            granted={permissions.camera.granted}
            requested={permissions.camera.requested}
            onAllow={() => requestPermission('camera').then(granted => {
              if (granted) onAllowCamera();
            })}
          />

          {/* Photos Permission */}
          <PermissionItem
            icon={<Image className="w-5 h-5" />}
            title="Photo Library"
            description="Upload existing images and videos"
            granted={permissions.photos.granted}
            requested={permissions.photos.requested}
            onAllow={() => requestPermission('photos').then(granted => {
              if (granted) onAllowPhotos();
            })}
          />

          {/* Documents Permission */}
          <PermissionItem
            icon={<FileText className="w-5 h-5" />}
            title="Documents"
            description="Upload PDFs and Word files"
            granted={permissions.documents.granted}
            requested={permissions.documents.requested}
            onAllow={() => requestPermission('documents').then(granted => {
              if (granted) onAllowDocuments();
            })}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAllowAll}
            disabled={allGranted}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allGranted ? 'All Granted' : 'Allow All'}
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
          You can change permissions later in browser settings
        </p>
      </div>
    </div>
  );
}

function PermissionItem({ icon, title, description, granted, requested, onAllow }) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${granted 
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${granted 
          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
          {granted ? <Check className="w-5 h-5" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
        </div>
        {granted ? (
          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">Granted</span>
        ) : requested ? (
          <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">Denied/Skipped</span>
        ) : (
          <button onClick={onAllow} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
            Allow
          </button>
        )}
      </div>
    </div>
  );
}
