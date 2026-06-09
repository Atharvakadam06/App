const POSTS_KEY = 'stugrow_posts_fallback';
const USERS_KEY = 'stugrow_users_fallback';

function loadLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function saveLocal(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.warn('localStorage write failed:', e); }
}

export async function createPostFallback(post) {
  const posts = loadLocal(POSTS_KEY);
  const record = {
    ...post,
    id: post.id || Date.now().toString(),
    created_at: new Date().toISOString(),
  };
  posts.unshift(record);
  saveLocal(POSTS_KEY, posts);
  return record.id;
}

export async function getAllPostsFallback() {
  return loadLocal(POSTS_KEY);
}

export async function clearFallback() {
  localStorage.removeItem(POSTS_KEY);
  localStorage.removeItem(USERS_KEY);
}
