import { CLOUDINARY_CONFIG } from '../config';

const CLOUD_NAME = CLOUDINARY_CONFIG.cloudName;
const UPLOAD_PRESET = CLOUDINARY_CONFIG.uploadPreset;

export async function uploadToCloudinary(file, _folder) {
  if (!file) {
    throw new Error('No file selected for upload');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  console.log('[Cloudinary] Uploading to:', url, 'file:', file.name, file.type, (file.size / 1024).toFixed(1) + 'KB');

  let response;
  try {
    response = await fetch(url, { method: 'POST', body: formData });
  } catch (networkError) {
    console.error('[Cloudinary] Network error:', networkError);
    throw new Error('Network error during upload. Check your internet connection.');
  }

  let result;
  try {
    result = await response.json();
    console.log('[Cloudinary] Response:', result);
  } catch {
    console.error('[Cloudinary] Non-JSON response. Status:', response.status);
    throw new Error(`Cloudinary returned an unexpected response (status ${response.status}).`);
  }

  if (!response.ok) {
    const reason = result?.error?.message || JSON.stringify(result);
    console.error('[Cloudinary] Upload failed:', reason);
    if (reason.includes('upload preset')) {
      throw new Error('Upload preset missing or invalid. Check your Cloudinary upload preset settings.');
    }
    throw new Error(`Upload failed: ${reason}`);
  }

  const secureUrl = result.secure_url;
  if (!secureUrl || typeof secureUrl !== 'string') {
    console.error('[Cloudinary] No secure_url in response:', result);
    throw new Error('Upload succeeded but no URL returned.');
  }

  console.log('[Cloudinary] Upload success:', secureUrl);
  return secureUrl;
}

export async function uploadImageFromFile(file, folder = 'stugrow') {
  return uploadToCloudinary(file, folder);
}

export function getOptimizedUrl(url, options = {}) {
  if (!url || !url.includes('cloudinary.com')) return url;
  const { width, height, quality = 'auto', format = 'auto' } = options;
  const transformations = [];
  if (width || height) {
    const dims = [];
    if (width) dims.push(`w_${width}`);
    if (height) dims.push(`h_${height}`);
    dims.push('c_limit');
    transformations.push(dims.join(','));
    transformations.push(`q_${quality}`);
    transformations.push(`f_${format}`);
  }
  const transformStr = transformations.join('/');
  return url.replace('/upload/', `/upload/${transformStr}/`);
}

export function getPublicIdFromUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const match = url.match(/\/(upload|raw|video)\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;
    
    const resourceType = match[1];
    const publicIdWithExtension = match[2];
    
    if (resourceType === 'raw') {
      return publicIdWithExtension;
    } else {
      const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        return publicIdWithExtension.substring(0, lastDotIndex);
      }
      return publicIdWithExtension;
    }
  } catch (e) {
    console.warn('Failed to parse Cloudinary URL:', e);
    return null;
  }
}

export async function deleteFromCloudinary(url) {
  if (!url) return;
  const cloudName = CLOUDINARY_CONFIG.cloudName;
  const apiKey = CLOUDINARY_CONFIG.apiKey;
  const apiSecret = CLOUDINARY_CONFIG.apiSecret;

  if (!apiKey || !apiSecret || apiSecret.includes('placeholder') || apiSecret === '') {
    console.warn('[Cloudinary] Skipping asset deletion because Cloudinary API Key or API Secret is not set.');
    return;
  }

  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return;

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    
    const utf8 = new TextEncoder().encode(signatureStr);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    let resourceType = 'image';
    if (url.includes('/raw/')) {
      resourceType = 'raw';
    } else if (url.includes('/video/')) {
      resourceType = 'video';
    }

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
    const res = await fetch(deleteUrl, {
      method: 'POST',
      body: formData
    });
    
    const result = await res.json();
    console.log('[Cloudinary] Delete response:', result);
  } catch (e) {
    console.error('[Cloudinary] Failed to delete resource:', e);
  }
}