// Global like state shared across Feed and Profile
// This module maintains the source of truth for like states in memory

const likeStates = {};

export function setLikeState(postId, liked, likes) {
  likeStates[postId] = { liked, likes };
}

export function getLikeState(postId) {
  return likeStates[postId] || null;
}

// Listeners for real-time updates
const listeners = [];

export function subscribeLikeChange(callback) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function notifyLikeChange(postId, liked, likes) {
  likeStates[postId] = { liked, likes };
  listeners.forEach(cb => cb(postId, liked, likes));
}