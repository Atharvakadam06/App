const CLOUD_NAME = 'dkjryejcz';
const UPLOAD_PRESET = 'hjgqkyhd';

export async function uploadToCloudinary(file, folder = 'stugrow') {
  if (!file) {
    throw new Error('No file selected for upload');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  if (folder) {
    formData.append('folder', folder);
  }

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
  if (!secureUrl || typeof secureUrl !== 'string' || !secureUrl.includes('cloudinary.com')) {
    console.error('[Cloudinary] Unexpected response shape:', result);
    throw new Error('Upload succeeded but no valid image URL was returned.');
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
  }
  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);
  const transformStr = transformations.join('/');
  return url.replace('/upload/', `/upload/${transformStr}/`);
}
