export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  
  const now = new Date();
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    const lower = timestamp.toLowerCase();
    if (lower === 'just now') {
      return 'Just now';
    }
    return timestamp;
  }
  
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} week${Math.floor(seconds / 604800) > 1 ? 's' : ''} ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} month${Math.floor(seconds / 2592000) > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

export function getCurrentTimestamp() {
  return new Date().toISOString();
}