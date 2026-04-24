/**
 * Camera and Media Permission Utilities
 * Handles permission requests for camera, photos, and documents with proper mobile support
 */

// Check if camera permission was previously granted
export async function checkCameraPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    return false;
  }
}

// Request camera permission with mobile-optimized constraints
export async function requestCameraPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.warn('getUserMedia not supported in this browser');
    return false;
  }

  const constraints = {
    video: {
      facingMode: { ideal: 'environment' }, // Prefer rear camera on mobile
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // Stop the stream immediately - we just wanted permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.error('Camera permission error:', err);
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      showPermissionDeniedGuide('camera');
    } else if (err.name === 'NotFoundError') {
      console.warn('No camera found');
      return false;
    } else if (err.name === 'NotReadableError') {
      showPermissionInUseError();
    } else {
      console.warn('Unexpected camera error:', err);
    }
    
    return false;
  }
}

// Create and trigger camera input with proper fallback
export function triggerCameraInput(onFileSelected) {
  // First try getUserMedia
  const initCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      // Create video element for camera preview
      const video = document.createElement('video');
      video.setAttribute('playsinline', ''); // iOS Safari requirement
      video.setAttribute('autoplay', '');
      video.setAttribute('muted', '');
      video.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:9999;';
      
      document.body.appendChild(video);
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        
        video.srcObject = stream;
        await video.play();
        
        // Add capture UI
        const captureBtn = document.createElement('button');
        captureBtn.innerHTML = '📸';
        captureBtn.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:10000;background:white;border-radius:50%;width:60px;height:60px;font-size:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
        document.body.appendChild(captureBtn);
        
        captureBtn.onclick = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0);
          
          canvas.toBlob((blob) => {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            onFileSelected(file);
            cleanup();
          }, 'image/jpeg', 0.9);
        };
        
        // Add cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '✕';
        cancelBtn.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;background:rgba(0,0,0,0.5);color:white;border-radius:50%;width:40px;height:40px;font-size:18px;display:flex;align-items:center;justify-content:center;';
        document.body.appendChild(cancelBtn);
        cancelBtn.onclick = cleanup;
        
        function cleanup() {
          stream.getTracks().forEach(track => track.stop());
          video.remove();
          captureBtn.remove();
          cancelBtn.remove();
        }
        
      } catch (err) {
        console.error('Camera stream error:', err);
        fallbackToFileInput();
      }
    } else {
      fallbackToFileInput();
    }
  };
  
  function fallbackToFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  }
  
  initCamera();
}

// Request photo library access
export async function requestPhotoPermission() {
  // Photo library permissions are granted via the file input dialog
  // We trigger the input and check if user selected a file
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;
    
    input.onchange = (e) => {
      const hasFiles = e.target.files && e.target.files.length > 0;
      input.remove();
      resolve(hasFiles);
    };
    
    input.oncancel = () => {
      input.remove();
      resolve(false);
    };
    
    document.body.appendChild(input);
    input.click();
  });
}

// Request document access
export async function requestDocumentPermission() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
    input.multiple = true;
    
    input.onchange = (e) => {
      const hasFiles = e.target.files && e.target.files.length > 0;
      input.remove();
      resolve(hasFiles);
    };
    
    input.oncancel = () => {
      input.remove();
      resolve(false);
    };
    
    document.body.appendChild(input);
    input.click();
  });
}

// Show permission denied guide with platform-specific instructions
export function showPermissionDeniedGuide(permissionType = 'camera') {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  let title = 'Permission Required';
  let message = '';
  
  if (permissionType === 'camera') {
    if (isIOS) {
      title = 'Camera Access Needed';
      message = 'Go to Settings → Safari → Camera → Allow. Then reload the page.';
    } else if (isAndroid) {
      title = 'Camera Access Needed';
      message = 'Tap the lock/icon in your browser address bar → Permissions → Camera → Allow. Then reload.';
    } else {
      title = 'Camera Access Needed';
      message = 'Click the lock icon in the address bar → Allow Camera. Then reload the page.';
    }
  } else if (permissionType === 'photos') {
    if (isIOS) {
      title = 'Photo Library Access Needed';
      message = 'Go to Settings → Safari → Photos → Allow. Then reload the page.';
    } else if (isAndroid) {
      title = 'Photo Library Access Needed';
      message = 'Tap the lock icon in your browser address bar → Permissions → Photos → Allow. Then reload.';
    } else {
      title = 'Photo Library Access Needed';
      message = 'Click the lock icon in the address bar → Allow Photos. Then reload the page.';
    }
  }
  
  alert(`${title}\n\n${message}\n\nIf the issue persists, try:\n1. Use a different browser (Chrome/Safari)\n2. Ensure you are on HTTPS\n3. Check that no other app is using the camera`);
}

// Show camera in use error
export function showPermissionInUseError() {
  alert('Camera is currently in use by another application.\n\nPlease close other apps using the camera and try again.');
}

// Feature detection
export function hasMediaDevices() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid() {
  return /Android/.test(navigator.userAgent);
}
