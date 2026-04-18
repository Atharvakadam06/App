const CLOUD_NAME = 'dkjryejcz';
const UPLOAD_PRESET = 'hjgqkyhd';

export async function uploadToCloudinary(file, folder = 'stugrow') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Upload failed');
  }

  const data = await response.json();
  return data.secure_url;
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