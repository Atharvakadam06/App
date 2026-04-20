import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllPosts, isPostLiked } from '../services/data';

const PostLikeContext = createContext();

export function PostLikeProvider({ children }) {
  const [likeMap, setLikeMap] = useState({});
  const [likesCountMap, setLikesCountMap] = useState({});
  const [initialized, setInitialized] = useState(false);

  const syncAllPosts = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const posts = await getAllPosts();
      const newLikeMap = {};
      const newCountMap = {};
      for (const p of posts) {
        const liked = await isPostLiked(p.id, userId);
        newLikeMap[p.id] = liked;
        newCountMap[p.id] = p.likes || 0;
      }
      setLikeMap(newLikeMap);
      setLikesCountMap(newCountMap);
      setInitialized(true);
    } catch (e) {
      console.warn('Failed to sync posts:', e);
    }
  }, []);

  const toggleLike = useCallback(async (postId, userId, currentLiked, currentLikes) => {
    if (!postId || !userId) return { liked: currentLiked, likes: currentLikes };
    
    const newLiked = !currentLiked;
    const newLikes = newLiked ? (currentLikes || 0) + 1 : Math.max(0, (currentLikes || 0) - 1);
    
    setLikeMap(prev => ({ ...prev, [postId]: newLiked }));
    setLikesCountMap(prev => ({ ...prev, [postId]: newLikes }));
    
    return { liked: newLiked, likes: newLikes };
  }, []);

  const getLikeState = useCallback((postId) => {
    return {
      liked: likeMap[postId] ?? null,
      likes: likesCountMap[postId] ?? 0
    };
  }, [likeMap, likesCountMap]);

  return (
    <PostLikeContext.Provider value={{ 
      likeMap, 
      likesCountMap, 
      toggleLike, 
      getLikeState, 
      syncAllPosts,
      initialized 
    }}>
      {children}
    </PostLikeContext.Provider>
  );
}

export function usePostLike() {
  return useContext(PostLikeContext);
}
